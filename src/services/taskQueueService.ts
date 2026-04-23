import { Queue, Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { GatewayService } from './gatewayService.js';

export interface TaskPayload {
  type: 'analyze' | 'fix' | 'generate' | 'custom';
  data: any;
  agentId?: string;
  model?: string;
}

export interface TaskResult {
  success: boolean;
  output?: any;
  error?: string;
}

const redisConnection = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  maxRetriesPerRequest: null,
});

export class TaskQueueService {
  private queue: Queue<TaskPayload, TaskResult>;
  private worker: Worker<TaskPayload, TaskResult>;
  private gatewayService: GatewayService;

  constructor() {
    this.gatewayService = new GatewayService();
    
    this.queue = new Queue<TaskPayload, TaskResult>('agent-tasks', {
      connection: redisConnection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: {
          count: 100,
        },
        removeOnFail: {
          count: 5000,
        },
      },
    });

    this.worker = new Worker<TaskPayload, TaskResult>(
      'agent-tasks',
      async (job: Job<TaskPayload, TaskResult>) => {
        return await this.processTask(job.data);
      },
      {
        connection: redisConnection,
        concurrency: parseInt(process.env.WORKER_CONCURRENCY || '5'),
      }
    );

    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    this.worker.on('completed', (job, result) => {
      console.log(`Job ${job.id} completed with result:`, result);
    });

    this.worker.on('failed', (job, err) => {
      console.error(`Job ${job?.id} failed:`, err);
    });

    this.worker.on('error', (err) => {
      console.error('Worker error:', err);
    });
  }

  async processTask(payload: TaskPayload): Promise<TaskResult> {
    try {
      const { type, data, agentId, model } = payload;

      let prompt = '';
      switch (type) {
        case 'analyze':
          prompt = `Analyze the following code and provide insights:\n\n${JSON.stringify(data, null, 2)}`;
          break;
        case 'fix':
          prompt = `Fix the issues in the following code:\n\n${JSON.stringify(data, null, 2)}`;
          break;
        case 'generate':
          prompt = `Generate code based on this requirement:\n\n${JSON.stringify(data, null, 2)}`;
          break;
        case 'custom':
          prompt = data.prompt || JSON.stringify(data);
          break;
        default:
          throw new Error(`Unknown task type: ${type}`);
      }

      const response = await this.gatewayService.sendCommand(
        agentId || 'default',
        prompt,
        model
      );

      return {
        success: true,
        output: response,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  async addTask(payload: TaskPayload, options?: {
    priority?: number;
    delay?: number;
    jobId?: string;
  }): Promise<string> {
    const job = await this.queue.add('agent-task', payload, {
      priority: options?.priority || 1,
      delay: options?.delay || 0,
      jobId: options?.jobId,
    });

    console.log(`Task added to queue: ${job.id}`);
    return job.id || 'unknown';
  }

  async getQueueStats() {
    const [waiting, active, completed, failed] = await Promise.all([
      this.queue.getWaitingCount(),
      this.queue.getActiveCount(),
      this.queue.getCompletedCount(),
      this.queue.getFailedCount(),
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      total: waiting + active + completed + failed,
    };
  }

  async getJobStatus(jobId: string) {
    const job = await this.queue.getJob(jobId);
    if (!job) {
      return { status: 'not_found' };
    }

    const state = await job.getState();
    return {
      id: job.id,
      status: state,
      data: job.data,
      progress: job.progress,
      timestamp: job.timestamp,
      finishedOn: job.finishedOn,
      failedReason: job.failedReason,
    };
  }

  async cancelJob(jobId: string): Promise<boolean> {
    const job = await this.queue.getJob(jobId);
    if (!job) {
      return false;
    }
    await job.remove();
    return true;
  }

  async clearQueue() {
    await this.queue.obliterate({ force: true });
  }

  async close() {
    await this.worker.close();
    await this.queue.close();
    await redisConnection.quit();
  }
}
