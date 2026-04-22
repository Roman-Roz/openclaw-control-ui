/**
 * @fileoverview WebSocket менеджер
 * Управление WebSocket подключениями и сообщениями
 */

const WebSocket = require('ws');
const logger = require('../utils/logger');
const config = require('../config');

class WebSocketManager {
  constructor() {
    this.wss = null;
    this.clients = new Set();
    this.heartbeatInterval = null;
  }

  /**
   * Инициализация WebSocket сервера
   */
  init(server) {
    this.wss = new WebSocket.Server({ 
      noServer: true,
      maxPayload: 1024 * 1024 // 1MB max message size
    });

    this.wss.on('connection', (ws, request) => {
      this.handleConnection(ws, request);
    });

    // Отправка heartbeat всем клиентам
    this.heartbeatInterval = setInterval(() => {
      this.broadcast({
        type: 'heartbeat',
        data: { timestamp: new Date().toISOString() }
      });
    }, config.wsHeartbeatInterval);

    logger.info('WebSocket server initialized');
  }

  /**
   * Обработка нового подключения
   */
  handleConnection(ws, request) {
    const clientId = this.generateClientId();
    ws.clientId = clientId;
    ws.isAlive = true;

    this.clients.add(ws);
    logger.info('WebSocket client connected', { clientId, ip: request.socket.remoteAddress });

    // Отправляем приветственное сообщение
    ws.send(JSON.stringify({
      type: 'welcome',
      data: {
        clientId,
        timestamp: new Date().toISOString(),
        message: 'Connected to OpenClaw Cyberpunk Panel'
      }
    }));

    // Обработка сообщений от клиента
    ws.on('message', (data) => {
      this.handleMessage(ws, data);
    });

    // Обработка закрытия
    ws.on('close', () => {
      this.handleDisconnect(ws);
    });

    // Обработка ошибок
    ws.on('error', (error) => {
      logger.error('WebSocket error', { clientId, error: error.message });
    });

    // Ping для проверки соединения
    ws.on('pong', () => {
      ws.isAlive = true;
    });
  }

  /**
   * Обработка входящих сообщений
   */
  handleMessage(ws, data) {
    try {
      const message = JSON.parse(data.toString());
      logger.debug('WebSocket message received', { 
        clientId: ws.clientId, 
        type: message.type 
      });

      // Эхо-ответ для тестовых сообщений
      if (message.type === 'ping') {
        ws.send(JSON.stringify({
          type: 'pong',
          data: { timestamp: new Date().toISOString() }
        }));
      }

      // Обработка других типов сообщений
      switch (message.type) {
        case 'subscribe':
          this.handleSubscribe(ws, message.data);
          break;
        case 'unsubscribe':
          this.handleUnsubscribe(ws, message.data);
          break;
        default:
          logger.warn('Unknown message type', { type: message.type });
      }
    } catch (error) {
      logger.error('Failed to parse WebSocket message', { error: error.message });
      ws.send(JSON.stringify({
        type: 'error',
        data: { message: 'Invalid message format' }
      }));
    }
  }

  /**
   * Обработка отключения
   */
  handleDisconnect(ws) {
    this.clients.delete(ws);
    logger.info('WebSocket client disconnected', { clientId: ws.clientId });
  }

  /**
   * Подписка на события
   */
  handleSubscribe(ws, data) {
    logger.debug('Client subscribed', { clientId: ws.clientId, channels: data?.channels });
    ws.send(JSON.stringify({
      type: 'subscribed',
      data: { channels: data?.channels || ['default'] }
    }));
  }

  /**
   * Отписка от событий
   */
  handleUnsubscribe(ws, data) {
    logger.debug('Client unsubscribed', { clientId: ws.clientId });
  }

  /**
   * Отправка сообщения всем подключенным клиентам
   */
  broadcast(message) {
    const data = JSON.stringify(message);
    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    });
  }

  /**
   * Отправка сообщения конкретному клиенту
   */
  sendTo(clientId, message) {
    const data = JSON.stringify(message);
    this.clients.forEach((client) => {
      if (client.clientId === clientId && client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    });
  }

  /**
   * Проверка активных соединений (для cleanup)
   */
  checkConnections() {
    this.clients.forEach((ws) => {
      if (!ws.isAlive) {
        return ws.terminate();
      }
      ws.isAlive = false;
      ws.ping();
    });
  }

  /**
   * Генерация уникального ID клиента
   */
  generateClientId() {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Получение статистики подключений
   */
  getStats() {
    return {
      connectedClients: this.clients.size,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Очистка ресурсов
   */
  cleanup() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    
    this.clients.forEach((client) => {
      client.close();
    });
    
    this.clients.clear();
    logger.info('WebSocket server cleaned up');
  }
}

// Singleton instance
const wsManager = new WebSocketManager();

module.exports = wsManager;
