import { WebSocket, Server } from 'ws';
import http from 'http';
import logger from '../utils/logger.js';
import { GatewayStatus, SystemMetrics, Alert, WebSocketMessage } from '../types/index.js';

export interface ClientConnection {
  ws: WebSocket;
  id: string;
  connectedAt: Date;
  lastPing: Date;
  isAuthenticated: boolean;
}

export interface BroadcastMessage {
  type: string;
  data: any;
}

class WebSocketService {
  private wss: Server | null = null;
  private clients: Map<string, ClientConnection> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private metricsInterval: NodeJS.Timeout | null = null;

  /**
   * Initialize WebSocket server
   */
  public initialize(server: http.Server): void {
    this.wss = new Server({
      server,
      path: '/ws',
      clientTracking: true,
    });

    this.wss.on('connection', (ws: WebSocket, req: http.IncomingMessage) => {
      this.handleConnection(ws, req);
    });

    this.wss.on('error', (error: Error) => {
      logger.error('WebSocket server error:', { error: error.message, stack: error.stack });
    });

    // Start heartbeat
    this.startHeartbeat();

    // Start metrics broadcasting
    this.startMetricsBroadcast();

    logger.info('WebSocket service initialized');
  }

  /**
   * Handle new client connection
   */
  private handleConnection(ws: WebSocket, req: http.IncomingMessage): void {
    const clientId = this.generateClientId();
    const connection: ClientConnection = {
      ws,
      id: clientId,
      connectedAt: new Date(),
      lastPing: new Date(),
      isAuthenticated: false,
    };

    this.clients.set(clientId, connection);

    logger.info(`Client connected: ${clientId}`, {
      ip: req.socket.remoteAddress,
      userAgent: req.headers['user-agent'],
    });

    // Send welcome message
    this.sendToClient(clientId, {
      type: 'welcome',
      payload: {
        message: 'Connected to OpenClaw Control Panel',
        clientId,
        timestamp: new Date().toISOString(),
      },
    });

    // Handle messages
    ws.on('message', (data: Buffer) => {
      this.handleMessage(clientId, data);
    });

    // Handle pong
    ws.on('pong', () => {
      connection.lastPing = new Date();
    });

    // Handle close
    ws.on('close', () => {
      this.handleDisconnect(clientId);
    });

    // Handle errors
    ws.on('error', (error: Error) => {
      logger.error(`WebSocket error for client ${clientId}:`, { error: error.message });
    });
  }

  /**
   * Handle incoming message
   */
  private handleMessage(clientId: string, data: Buffer): void {
    try {
      const message: WebSocketMessage = JSON.parse(data.toString());
      logger.debug(`Message from ${clientId}:`, { type: message.type });

      switch (message.type) {
        case 'ping':
          this.sendToClient(clientId, { type: 'pong', payload: { timestamp: new Date().toISOString() } });
          break;
        case 'subscribe':
          this.handleSubscription(clientId, message.payload);
          break;
        case 'command':
          this.handleCommand(clientId, message.payload);
          break;
        default:
          logger.warn(`Unknown message type: ${message.type}`);
      }
    } catch (error) {
      logger.error(`Failed to parse message from ${clientId}:`, { error: (error as Error).message });
      this.sendToClient(clientId, {
        type: 'error',
        payload: { message: 'Invalid message format' },
      });
    }
  }

  /**
   * Handle subscription
   */
  private handleSubscription(clientId: string, payload: any): void {
    const { channels } = payload;
    if (Array.isArray(channels)) {
      logger.info(`Client ${clientId} subscribed to:`, { channels });
      this.sendToClient(clientId, {
        type: 'subscribed',
        payload: { channels },
      });
    }
  }

  /**
   * Handle command
   */
  private handleCommand(clientId: string, payload: any): void {
    logger.info(`Command from ${clientId}:`, { command: payload.command });
    // Forward to gateway service or handle internally
    this.sendToClient(clientId, {
      type: 'response',
      payload: {
        success: true,
        message: `Command "${payload.command}" received`,
      },
    });
  }

  /**
   * Handle client disconnect
   */
  private handleDisconnect(clientId: string): void {
    this.clients.delete(clientId);
    logger.info(`Client disconnected: ${clientId}`, { remainingClients: this.clients.size });
  }

  /**
   * Send message to specific client
   */
  public sendToClient(clientId: string, message: WebSocketMessage): boolean {
    const connection = this.clients.get(clientId);
    if (connection && connection.ws.readyState === WebSocket.OPEN) {
      connection.ws.send(JSON.stringify(message));
      return true;
    }
    return false;
  }

  /**
   * Broadcast message to all clients
   */
  public broadcast(message: BroadcastMessage): void {
    const data = JSON.stringify(message);
    let sentCount = 0;

    this.clients.forEach((connection) => {
      if (connection.ws.readyState === WebSocket.OPEN) {
        connection.ws.send(data);
        sentCount++;
      }
    });

    logger.debug(`Broadcast sent to ${sentCount} clients`, { type: message.type });
  }

  /**
   * Broadcast system status
   */
  public broadcastStatus(status: GatewayStatus): void {
    this.broadcast({
      type: 'status',
      data: status,
    });
  }

  /**
   * Broadcast metrics
   */
  public broadcastMetrics(metrics: SystemMetrics): void {
    this.broadcast({
      type: 'metrics',
      data: metrics,
    });
  }

  /**
   * Broadcast alert
   */
  public broadcastAlert(alert: Alert): void {
    this.broadcast({
      type: 'alert',
      data: alert,
    });
  }

  /**
   * Get connected clients count
   */
  public getClientCount(): number {
    return this.clients.size;
  }

  /**
   * Get all connected clients info
   */
  public getClientsInfo(): Array<{ id: string; connectedAt: Date; isAuthenticated: boolean }> {
    return Array.from(this.clients.values()).map(({ id, connectedAt, isAuthenticated }) => ({
      id,
      connectedAt,
      isAuthenticated,
    }));
  }

  /**
   * Start heartbeat to detect dead connections
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.clients.forEach((connection, clientId) => {
        const timeSinceLastPing = Date.now() - connection.lastPing.getTime();

        if (timeSinceLastPing > 30000) {
          logger.warn(`Terminating unresponsive client: ${clientId}`);
          connection.ws.terminate();
          this.clients.delete(clientId);
        } else {
          connection.ws.ping();
        }
      });
    }, 15000);
  }

  /**
   * Start metrics broadcast
   */
  private startMetricsBroadcast(): void {
    this.metricsInterval = setInterval(() => {
      // Generate mock metrics (replace with real system metrics)
      const metrics: SystemMetrics = {
        cpuUsage: Math.random() * 100,
        memoryUsage: Math.random() * 100,
        diskUsage: Math.random() * 100,
        networkIn: Math.random() * 1000,
        networkOut: Math.random() * 1000,
        activeConnections: this.clients.size,
        timestamp: new Date(),
      };

      this.broadcastMetrics(metrics);
    }, 5000);
  }

  /**
   * Generate unique client ID
   */
  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Graceful shutdown
   */
  public shutdown(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }

    this.clients.forEach((connection) => {
      connection.ws.close(1001, 'Server shutting down');
    });

    this.clients.clear();

    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }

    logger.info('WebSocket service shut down');
  }
}

// Singleton instance
const webSocketService = new WebSocketService();

export default webSocketService;
