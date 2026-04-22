/**
 * @fileoverview Тесты для API маршрутов
 * Использование Jest для тестирования
 */

const request = require('supertest');

describe('API Routes', () => {
  let app;
  let server;

  beforeAll(async () => {
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

    const { app: appInstance, startServer } = require('../src/server');
    app = appInstance;
    server = await startServer();
  });

  afterAll((done) => {
    if (server) {
      server.close(done);
    } else {
      done();
    }
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
      expect(response.body).toHaveProperty('running', true);
      expect(response.body).toHaveProperty('port', 18789);
    });
  });

  describe('GET /api/agents', () => {
    it('should return agents list', async () => {
      const response = await request(app).get('/api/agents');
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body[0]).toHaveProperty('id');
      expect(response.body[0]).toHaveProperty('status');
    });
  });

  describe('GET /api/models', () => {
    it('should return models list', async () => {
      const response = await request(app).get('/api/models');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('providers');
    });
  });

  describe('POST /api/model/switch', () => {
    it('should switch model with valid data', async () => {
      const response = await request(app)
        .post('/api/model/switch')
        .send({ modelId: 'openrouter/auto' });
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
    });

    it('should return error without modelId', async () => {
      const response = await request(app)
        .post('/api/model/switch')
        .send({});
      
      expect(response.status).toBe(400);
      expect(response.body.error).toHaveProperty('message');
    });
  });

  describe('POST /api/command', () => {
    it('should execute command with valid data', async () => {
      const response = await request(app)
        .post('/api/command')
        .send({ command: 'test command' });
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
    });

    it('should return error without command', async () => {
      const response = await request(app)
        .post('/api/command')
        .send({});
      
      expect(response.status).toBe(400);
    });
  });

  describe('GET /system/info', () => {
    it('should return system information', async () => {
      const response = await request(app).get('/system/info');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('panel');
      expect(response.body).toHaveProperty('gateway');
      expect(response.body).toHaveProperty('system');
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
