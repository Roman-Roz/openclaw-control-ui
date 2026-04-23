import { Router } from 'express';
import MultiAgentOrchestrator from '../services/orchestratorService';

const router = Router();
let orchestrator: MultiAgentOrchestrator;

export function initializeOrchestratorRoutes(orch: MultiAgentOrchestrator) {
  orchestrator = orch;
  return router;
}

/**
 * POST /api/orchestrator/agents - Register new agent
 */
router.post('/agents', (req, res) => {
  try {
    const { name, role, specialty, model, systemPrompt, capabilities } = req.body;
    
    if (!name || !role || !specialty || !model || !systemPrompt) {
      return res.status(400).json({ 
        success: false, 
        error: 'name, role, specialty, model, and systemPrompt are required' 
      });
    }

    const agent = orchestrator.registerAgent({
      name,
      role,
      specialty,
      model,
      systemPrompt,
      capabilities: capabilities || [],
    });

    res.json({ success: true, agent });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/orchestrator/agents - List all agents
 */
router.get('/agents', (req, res) => {
  try {
    const agents = orchestrator.getAllAgents();
    res.json({ success: true, agents });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/orchestrator/agents/:agentId - Get agent details
 */
router.get('/agents/:agentId', (req, res) => {
  try {
    const agent = orchestrator.getAgent(req.params.agentId);
    if (!agent) {
      return res.status(404).json({ success: false, error: 'Agent not found' });
    }
    res.json({ success: true, agent });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/orchestrator/agents/:agentId - Unregister agent
 */
router.delete('/agents/:agentId', (req, res) => {
  try {
    const success = orchestrator.unregisterAgent(req.params.agentId);
    if (!success) {
      return res.status(404).json({ success: false, error: 'Agent not found or busy' });
    }
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/orchestrator/tasks - Create new task
 */
router.post('/tasks', (req, res) => {
  try {
    const { description, preferredAgentId } = req.body;
    
    if (!description) {
      return res.status(400).json({ success: false, error: 'description is required' });
    }

    const task = orchestrator.createTask(description, preferredAgentId);
    res.json({ success: true, task });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/orchestrator/tasks - List all tasks
 */
router.get('/tasks', (req, res) => {
  try {
    const tasks = orchestrator.getAllTasks();
    res.json({ success: true, tasks });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/orchestrator/tasks/:taskId - Get task details
 */
router.get('/tasks/:taskId', (req, res) => {
  try {
    const task = orchestrator.getTask(req.params.taskId);
    if (!task) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }
    res.json({ success: true, task });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/orchestrator/tasks/:taskId/assign - Assign task to agent
 */
router.post('/tasks/:taskId/assign', (req, res) => {
  try {
    const { agentId } = req.body;
    const success = orchestrator.assignTask(req.params.taskId, agentId);
    if (!success) {
      return res.status(400).json({ 
        success: false, 
        error: 'Failed to assign task (task not found, already assigned, or no available agent)' 
      });
    }
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/orchestrator/tasks/:taskId/complete - Complete task
 */
router.post('/tasks/:taskId/complete', (req, res) => {
  try {
    const { result } = req.body;
    
    if (!result) {
      return res.status(400).json({ success: false, error: 'result is required' });
    }

    const success = orchestrator.completeTask(req.params.taskId, result);
    if (!success) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/orchestrator/tasks/:taskId/fail - Fail task
 */
router.post('/tasks/:taskId/fail', (req, res) => {
  try {
    const { error } = req.body;
    
    if (!error) {
      return res.status(400).json({ success: false, error: 'error message is required' });
    }

    const success = orchestrator.failTask(req.params.taskId, error);
    if (!success) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/orchestrator/stats - Get orchestrator statistics
 */
router.get('/stats', (req, res) => {
  try {
    const stats = orchestrator.getStats();
    res.json({ success: true, stats });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
