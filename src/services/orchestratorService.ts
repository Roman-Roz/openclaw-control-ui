import { v4 as uuidv4 } from 'uuid';

export interface Agent {
  id: string;
  name: string;
  role: string;
  specialty: string;
  model: string;
  systemPrompt: string;
  status: 'idle' | 'busy' | 'offline';
  capabilities: string[];
}

export interface Task {
  id: string;
  description: string;
  assignedTo?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  result?: string;
  error?: string;
  createdAt: number;
  completedAt?: number;
}

export interface OrchestratorConfig {
  autoAssign?: boolean;
  maxConcurrentTasks?: number;
  taskTimeout?: number;
}

const DEFAULT_CONFIG: OrchestratorConfig = {
  autoAssign: true,
  maxConcurrentTasks: 5,
  taskTimeout: 300000, // 5 minutes
};

class MultiAgentOrchestrator {
  private agents: Map<string, Agent> = new Map();
  private tasks: Map<string, Task> = new Map();
  private config: OrchestratorConfig;
  private activeTasks: Set<string> = new Set();

  constructor(config: OrchestratorConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Register a new agent
   */
  registerAgent(agent: Omit<Agent, 'id' | 'status'>): Agent {
    const id = uuidv4();
    const newAgent: Agent = {
      ...agent,
      id,
      status: 'idle',
    };

    this.agents.set(id, newAgent);
    console.log(`Agent registered: ${newAgent.name} (${newAgent.role})`);
    return newAgent;
  }

  /**
   * Unregister an agent
   */
  unregisterAgent(agentId: string): boolean {
    const agent = this.agents.get(agentId);
    if (!agent) {
      return false;
    }

    if (agent.status === 'busy') {
      throw new Error('Cannot unregister busy agent');
    }

    this.agents.delete(agentId);
    console.log(`Agent unregistered: ${agent.name}`);
    return true;
  }

  /**
   * Get agent by ID
   */
  getAgent(agentId: string): Agent | undefined {
    return this.agents.get(agentId);
  }

  /**
   * Get all agents
   */
  getAllAgents(): Agent[] {
    return Array.from(this.agents.values());
  }

  /**
   * Find best agent for task based on specialty
   */
  findBestAgent(taskDescription: string, requiredCapability?: string): Agent | null {
    const idleAgents = Array.from(this.agents.values()).filter(
      a => a.status === 'idle'
    );

    if (idleAgents.length === 0) {
      return null;
    }

    // If capability is specified, filter agents
    if (requiredCapability) {
      const capableAgents = idleAgents.filter(a =>
        a.capabilities.includes(requiredCapability)
      );
      if (capableAgents.length > 0) {
        return capableAgents[0];
      }
    }

    // Simple keyword matching for specialty
    const lowerDesc = taskDescription.toLowerCase();
    for (const agent of idleAgents) {
      if (lowerDesc.includes(agent.specialty.toLowerCase())) {
        return agent;
      }
    }

    // Return first available agent
    return idleAgents[0];
  }

  /**
   * Create a new task
   */
  createTask(description: string, preferredAgentId?: string): Task {
    const taskId = uuidv4();
    const task: Task = {
      id: taskId,
      description,
      status: 'pending',
      createdAt: Date.now(),
    };

    this.tasks.set(taskId, task);

    // Auto-assign if enabled
    if (this.config.autoAssign) {
      this.assignTask(taskId, preferredAgentId);
    }

    return task;
  }

  /**
   * Assign task to agent
   */
  assignTask(taskId: string, agentId?: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task || task.status !== 'pending') {
      return false;
    }

    let agent: Agent | null | undefined;

    if (agentId) {
      agent = this.agents.get(agentId);
      if (!agent || agent.status !== 'idle') {
        return false;
      }
    } else {
      agent = this.findBestAgent(task.description);
      if (!agent) {
        return false;
      }
    }

    // Update agent status
    agent.status = 'busy';
    this.agents.set(agent.id, agent);

    // Update task
    task.assignedTo = agent.id;
    task.status = 'in_progress';
    this.tasks.set(taskId, task);
    this.activeTasks.add(taskId);

    console.log(`Task ${taskId} assigned to agent ${agent.name}`);
    return true;
  }

  /**
   * Complete task
   */
  completeTask(taskId: string, result: string): boolean {
    return this.finalizeTask(taskId, 'completed', result);
  }

  /**
   * Fail task
   */
  failTask(taskId: string, error: string): boolean {
    return this.finalizeTask(taskId, 'failed', undefined, error);
  }

  /**
   * Finalize task (complete or fail)
   */
  private finalizeTask(
    taskId: string,
    status: 'completed' | 'failed',
    result?: string,
    error?: string
  ): boolean {
    const task = this.tasks.get(taskId);
    if (!task) {
      return false;
    }

    task.status = status;
    task.result = result;
    task.error = error;
    task.completedAt = Date.now();
    this.tasks.set(taskId, task);
    this.activeTasks.delete(taskId);

    // Free up agent
    if (task.assignedTo) {
      const agent = this.agents.get(task.assignedTo);
      if (agent) {
        agent.status = 'idle';
        this.agents.set(agent.id, agent);
      }
    }

    console.log(`Task ${taskId} ${status}`);
    return true;
  }

  /**
   * Get task by ID
   */
  getTask(taskId: string): Task | undefined {
    return this.tasks.get(taskId);
  }

  /**
   * Get all tasks
   */
  getAllTasks(): Task[] {
    return Array.from(this.tasks.values());
  }

  /**
   * Get active tasks count
   */
  getActiveTasksCount(): number {
    return this.activeTasks.size;
  }

  /**
   * Get orchestrator statistics
   */
  getStats() {
    const agents = this.getAllAgents();
    const tasks = this.getAllTasks();

    return {
      totalAgents: agents.length,
      idleAgents: agents.filter(a => a.status === 'idle').length,
      busyAgents: agents.filter(a => a.status === 'busy').length,
      totalTasks: tasks.length,
      pendingTasks: tasks.filter(t => t.status === 'pending').length,
      inProgressTasks: tasks.filter(t => t.status === 'in_progress').length,
      completedTasks: tasks.filter(t => t.status === 'completed').length,
      failedTasks: tasks.filter(t => t.status === 'failed').length,
    };
  }

  /**
   * Shutdown orchestrator
   */
  shutdown() {
    this.agents.clear();
    this.tasks.clear();
    this.activeTasks.clear();
  }
}

export default MultiAgentOrchestrator;
