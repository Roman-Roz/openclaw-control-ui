/**
 * @fileoverview Тесты для API маршрутов
 * Использование Jest для тестирования
 */

const request = require('supertest');
const express = require('express');

// Мокируем зависимости перед импортом
jest.mock('../src/services/gatewayService', () => ({
  getGatewayStatusCLI: jest.fn().mockResolvedValue({
    running: true,
    pid: '12345',
    port: 18789,
    url: 'http://127.0.0.1:18789',
    timestamp: new Date().toISOString()
  }),
  getAgents: jest.fn().mockResolvedValue([
    { id: 'main', status: 'active', model: 'openrouter/auto' }
  ]),
  getModels: jest.fn().mockResolvedValue({
    providers: {
      openrouter: {
        models: [{ id: 'openrouter/auto', name: 'OpenRouter Auto', cost: 0 }]
      }
    }
  }),
  switchModel: jest.fn().mockResolvedValue({
    success: true,
    model: 'openrouter/auto',
    timestamp: new Date().toISOString()
  }),
  sendCommand: jest.fn().mockResolvedValue({
    success: true,
    result: 'Executed: test',
    timestamp: new Date().toISOString()
  }),
  checkStatus: jest.fn().mockResolvedValue({
    available: true,
    url: 'http://127.0.0.1:18789',
    lastCheck: new Date().toISOString()
  })
}));

jest.mock('../src/utils/logger', () => ({
  info: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  stream: { write: jest.fn() }
}));

jest.mock('../src/services/websocketService', () => ({
  initialize: jest.fn(),
  getClientCount: jest.fn().mockReturnValue(0),
  getClientsInfo: jest.fn().mockReturnValue([]),
  broadcast: jest.fn(),
  shutdown: jest.fn()
}));

// Mock errorHandler with proper error handling
class MockAppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'AppError';
  }
}

const mockErrorHandler = (err, req, res, next) => {
  const status = err.statusCode || err.status || 500;
  res.status(status).json({ 
    error: err.message || 'Internal Server Error',
    statusCode: status
  });
};

jest.mock('../src/middleware/errorHandler', () => ({
  asyncHandler: (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  },
  AppError: MockAppError,
  notFoundHandler: (req, res) => res.status(404).json({ error: 'Not Found' }),
  errorHandler: mockErrorHandler
}));

describe('API Routes', () => {
  let app;
  
  beforeAll(async () => {
    const apiRouter = require('../src/routes/api').default;
    
    app = express();
    app.use(express.json());
    app.use('/api', apiRouter);
    
    // Add health endpoint
    app.get('/health', (req, res) => {
      res.json({ 
        status: 'ok', 
        service: 'openclaw-cyberpunk-panel',
        version: '2.0.0',
        uptime: process.uptime()
      });
    });
    
    // Add global error handler
    app.use(mockErrorHandler);
    
    // Add 404 handler
    app.use((req, res) => {
      res.status(404).json({ error: 'Not Found' });
    });
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await request(app).get('/health');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('service', 'openclaw-cyberpunk-panel');
      expect(response.body).toHaveProperty('version');
      expect(response.body).toHaveProperty('uptime');
    });
  });

  describe('GET /api/status', () => {
    it('should return gateway status', async () => {
      const response = await request(app).get('/api/status');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('gateway');
    });
  });

  describe('GET /api/gateway/agents', () => {
    it('should return agents list', async () => {
      const response = await request(app).get('/api/gateway/agents');
      
      expect(response.status).toBe(200);
      expect(response.body.data.agents).toBeDefined();
      expect(Array.isArray(response.body.data.agents)).toBe(true);
    });
  });

  describe('GET /api/gateway/models', () => {
    it('should return models list', async () => {
      const response = await request(app).get('/api/gateway/models');
      
      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
    });
  });

  describe('POST /api/gateway/model/switch', () => {
    it('should switch model with valid data', async () => {
      const response = await request(app)
        .post('/api/gateway/model/switch')
        .send({ modelId: 'openrouter/auto' });
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
    });

    it('should return error without modelId', async () => {
      const response = await request(app)
        .post('/api/gateway/model/switch')
        .send({});
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('modelId');
    });
  });

  describe('POST /api/gateway/command', () => {
    it('should execute command with valid data', async () => {
      const response = await request(app)
        .post('/api/gateway/command')
        .send({ command: 'test command' });
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
    });

    it('should return error without command', async () => {
      const response = await request(app)
        .post('/api/gateway/command')
        .send({});
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('404 handler', () => {
    it('should return 404 for unknown routes', async () => {
      const response = await request(app).get('/unknown-route');
      
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'Not Found');
    });
  });
});
