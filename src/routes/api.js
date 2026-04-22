/**
 * @fileoverview API маршруты для статуса и системной информации
 */

const express = require('express');
const router = express.Router();
const gatewayService = require('../services/gatewayService');
const logger = require('../utils/logger');
const { apiLimiter } = require('../middleware/security');
const { ApiError } = require('../middleware/errorHandler');

/**
 * GET /api/status
 * Получение статуса Gateway
 */
router.get('/status', apiLimiter, async (req, res, next) => {
  try {
    logger.debug('Getting gateway status');
    const status = await gatewayService.getGatewayStatusCLI();
    res.json(status);
  } catch (error) {
    next(new ApiError(500, 'Failed to get gateway status', error.message));
  }
});

/**
 * GET /api/agents
 * Получение списка агентов
 */
router.get('/agents', apiLimiter, async (req, res, next) => {
  try {
    logger.debug('Getting agents list');
    const agents = await gatewayService.getAgents();
    res.json(agents);
  } catch (error) {
    next(new ApiError(500, 'Failed to get agents', error.message));
  }
});

/**
 * GET /api/models
 * Получение списка моделей
 */
router.get('/models', apiLimiter, async (req, res, next) => {
  try {
    logger.debug('Getting models list');
    const models = await gatewayService.getModels();
    res.json(models);
  } catch (error) {
    next(new ApiError(500, 'Failed to get models', error.message));
  }
});

/**
 * POST /api/model/switch
 * Переключение модели
 */
router.post('/model/switch', apiLimiter, async (req, res, next) => {
  try {
    const { modelId } = req.body;
    
    if (!modelId) {
      throw new ApiError(400, 'modelId is required');
    }
    
    logger.info('Switching model', { modelId });
    const result = await gatewayService.switchModel(modelId);
    res.json(result);
  } catch (error) {
    next(error instanceof ApiError ? error : new ApiError(500, 'Failed to switch model'));
  }
});

/**
 * POST /api/command
 * Отправка команды
 */
router.post('/command', apiLimiter, async (req, res, next) => {
  try {
    const { command } = req.body;
    
    if (!command) {
      throw new ApiError(400, 'command is required');
    }
    
    logger.info('Sending command', { command });
    const result = await gatewayService.sendCommand(command);
    res.json(result);
  } catch (error) {
    next(error instanceof ApiError ? error : new ApiError(500, 'Failed to send command'));
  }
});

module.exports = router;
