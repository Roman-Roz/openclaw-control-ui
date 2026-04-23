import { Router, Request, Response } from 'express';
import { TaskQueueService } from '../services/taskQueueService.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';

const router = Router();
let taskQueueService: TaskQueueService | null = null;

// Initialize queue service lazily
const getQueueService = () => {
  if (!taskQueueService) {
    taskQueueService = new TaskQueueService();
  }
  return taskQueueService;
};

/**
 * @route POST /api/tasks
 * @description Add a new task to the queue
 */
router.post('/tasks', asyncHandler(async (req: Request, res: Response) => {
  const { type, data, agentId, model, priority, delay } = req.body;

  if (!type || !data) {
    throw new AppError('type and data are required', 400);
  }

  const validTypes = ['analyze', 'fix', 'generate', 'custom'];
  if (!validTypes.includes(type)) {
    throw new AppError(`Invalid task type. Must be one of: ${validTypes.join(', ')}`, 400);
  }

  const queueService = getQueueService();
  const jobId = await queueService.addTask(
    { type, data, agentId, model },
    { priority, delay }
  );

  res.status(201).json({
    success: true,
    data: {
      jobId,
      status: 'queued',
      type,
      createdAt: new Date().toISOString(),
    },
  });
}));

/**
 * @route GET /api/tasks/:jobId
 * @description Get status of a specific job
 */
router.get('/tasks/:jobId', asyncHandler(async (req: Request, res: Response) => {
  const { jobId } = req.params;
  
  const queueService = getQueueService();
  const status = await queueService.getJobStatus(jobId);

  if (status.status === 'not_found') {
    throw new AppError('Job not found', 404);
  }

  res.json({
    success: true,
    data: status,
  });
}));

/**
 * @route DELETE /api/tasks/:jobId
 * @description Cancel a queued or active job
 */
router.delete('/tasks/:jobId', asyncHandler(async (req: Request, res: Response) => {
  const { jobId } = req.params;
  
  const queueService = getQueueService();
  const cancelled = await queueService.cancelJob(jobId);

  if (!cancelled) {
    throw new AppError('Job not found or could not be cancelled', 404);
  }

  res.json({
    success: true,
    message: 'Job cancelled successfully',
  });
}));

/**
 * @route GET /api/tasks/stats
 * @description Get queue statistics
 */
router.get('/tasks/stats', asyncHandler(async (req: Request, res: Response) => {
  const queueService = getQueueService();
  const stats = await queueService.getQueueStats();

  res.json({
    success: true,
    data: stats,
  });
}));

/**
 * @route POST /api/tasks/analyze
 * @description Quick endpoint to add an analysis task
 */
router.post('/tasks/analyze', asyncHandler(async (req: Request, res: Response) => {
  const { code, context, agentId, model } = req.body;

  if (!code) {
    throw new AppError('code is required', 400);
  }

  const queueService = getQueueService();
  const jobId = await queueService.addTask({
    type: 'analyze',
    data: { code, context },
    agentId,
    model,
  });

  res.status(201).json({
    success: true,
    data: {
      jobId,
      status: 'queued',
      type: 'analyze',
      createdAt: new Date().toISOString(),
    },
  });
}));

/**
 * @route POST /api/tasks/fix
 * @description Quick endpoint to add a code fix task
 */
router.post('/tasks/fix', asyncHandler(async (req: Request, res: Response) => {
  const { code, issue, agentId, model } = req.body;

  if (!code || !issue) {
    throw new AppError('code and issue are required', 400);
  }

  const queueService = getQueueService();
  const jobId = await queueService.addTask({
    type: 'fix',
    data: { code, issue },
    agentId,
    model,
  });

  res.status(201).json({
    success: true,
    data: {
      jobId,
      status: 'queued',
      type: 'fix',
      createdAt: new Date().toISOString(),
    },
  });
}));

/**
 * @route POST /api/tasks/generate
 * @description Quick endpoint to add a code generation task
 */
router.post('/tasks/generate', asyncHandler(async (req: Request, res: Response) => {
  const { requirement, language, framework, agentId, model } = req.body;

  if (!requirement) {
    throw new AppError('requirement is required', 400);
  }

  const queueService = getQueueService();
  const jobId = await queueService.addTask({
    type: 'generate',
    data: { requirement, language, framework },
    agentId,
    model,
  });

  res.status(201).json({
    success: true,
    data: {
      jobId,
      status: 'queued',
      type: 'generate',
      createdAt: new Date().toISOString(),
    },
  });
}));

export default router;
