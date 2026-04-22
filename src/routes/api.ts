import { Router, Request, Response } from 'express';
import gatewayService from '../services/gatewayService.js';
import webSocketService from '../services/websocketService.js';
import logger from '../utils/logger.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';

const router = Router();

/**
 * @route GET /api/health
 * @description Health check endpoint
 */
router.get('/health', asyncHandler(async (req: Request, res: Response) => {
  res.json({
    success: true,
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
}));

/**
 * @route GET /api/status
 * @description Get system and gateway status
 */
router.get('/status', asyncHandler(async (req: Request, res: Response) => {
  const gatewayStatus = await gatewayService.checkStatus();
  
  res.json({
    success: true,
    data: {
      server: {
        status: 'running',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: process.version,
      },
      gateway: gatewayStatus,
      websocket: {
        connectedClients: webSocketService.getClientCount(),
      },
      timestamp: new Date().toISOString(),
    },
  });
}));

/**
 * @route GET /api/metrics
 * @description Get system metrics
 */
router.get('/metrics', asyncHandler(async (req: Request, res: Response) => {
  const usage = process.memoryUsage();
  
  res.json({
    success: true,
    data: {
      cpu: process.cpuUsage(),
      memory: {
        rss: usage.rss,
        heapTotal: usage.heapTotal,
        heapUsed: usage.heapUsed,
        external: usage.external,
      },
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    },
  });
}));

/**
 * @route GET /api/gateway/status
 * @description Get Gateway status via CLI
 */
router.get('/gateway/status', asyncHandler(async (req: Request, res: Response) => {
  try {
    const status = await gatewayService.getGatewayStatusCLI();
    res.json({
      success: true,
      data: status,
    });
  } catch (error) {
    throw new AppError('Failed to get gateway status', 503);
  }
}));

/**
 * @route GET /api/gateway/agents
 * @description Get list of agents
 */
router.get('/gateway/agents', asyncHandler(async (req: Request, res: Response) => {
  const agents = await gatewayService.getAgents();
  res.json({
    success: true,
    data: { agents },
  });
}));

/**
 * @route GET /api/gateway/models
 * @description Get list of available models
 */
router.get('/gateway/models', asyncHandler(async (req: Request, res: Response) => {
  const models = await gatewayService.getModels();
  res.json({
    success: true,
    data: models,
  });
}));

/**
 * @route POST /api/gateway/model/switch
 * @description Switch to a different model
 */
router.post('/gateway/model/switch', asyncHandler(async (req: Request, res: Response) => {
  const { modelId } = req.body;
  
  if (!modelId) {
    throw new AppError('modelId is required', 400);
  }
  
  const result = await gatewayService.switchModel(modelId);
  res.json({
    success: true,
    data: result,
  });
}));

/**
 * @route POST /api/gateway/command
 * @description Send command to Gateway
 */
router.post('/gateway/command', asyncHandler(async (req: Request, res: Response) => {
  const { command, target, parameters } = req.body;
  
  if (!command) {
    throw new AppError('command is required', 400);
  }
  
  const result = await gatewayService.sendCommand({ command, target, parameters });
  res.json({
    success: true,
    data: result,
  });
}));

/**
 * @route GET /api/clients
 * @description Get connected WebSocket clients
 */
router.get('/clients', asyncHandler(async (req: Request, res: Response) => {
  const clients = webSocketService.getClientsInfo();
  res.json({
    success: true,
    data: {
      count: clients.length,
      clients,
    },
  });
}));

/**
 * @route POST /api/broadcast
 * @description Broadcast message to all WebSocket clients
 */
router.post('/broadcast', asyncHandler(async (req: Request, res: Response) => {
  const { type, data } = req.body;
  
  if (!type || !data) {
    throw new AppError('type and data are required', 400);
  }
  
  webSocketService.broadcast({ type, data });
  
  res.json({
    success: true,
    message: `Broadcast sent to ${webSocketService.getClientCount()} clients`,
  });
}));

export default router;
