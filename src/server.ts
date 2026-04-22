/**
 * OpenClaw Cyberpunk Control Panel - Main Server
 * TypeScript version with modular architecture
 */

import express, { Express } from 'express';
import http from 'http';
import cors from 'cors';
import path from 'path';

import config from './config/index.js';
import logger from './utils/logger.js';
import webSocketService from './services/websocketService.js';
import apiRouter from './routes/api.js';
import {
  securityMiddleware,
  rateLimiter,
  requestLogger,
  corsOptions,
  sanitizeInput,
  validateJson,
} from './middleware/security.js';
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js';

const __dirname = path.dirname(new URL(import.meta.url).pathname);

class Server {
  private app: Express;
  private server: http.Server | null = null;

  constructor() {
    this.app = express();
    this.initializeMiddleware();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  /**
   * Initialize middleware
   */
  private initializeMiddleware(): void {
    // Security headers
    this.app.use(securityMiddleware);

    // CORS
    this.app.use(cors(corsOptions));

    // Rate limiting
    this.app.use(rateLimiter);

    // Request logging
    this.app.use(requestLogger);

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Input sanitization
    this.app.use(sanitizeInput);

    // JSON validation
    this.app.use(validateJson);

    // Static files
    this.app.use(express.static(path.join(__dirname, '../public')));
  }

  /**
   * Initialize routes
   */
  private initializeRoutes(): void {
    // API routes
    this.app.use('/api', apiRouter);

    // Health check
    this.app.get('/health', (req, res) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });

    // Serve index.html for all other routes (SPA support)
    this.app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, '../public/index.html'));
    });
  }

  /**
   * Initialize error handling
   */
  private initializeErrorHandling(): void {
    // 404 handler
    this.app.use(notFoundHandler);

    // Global error handler
    this.app.use(errorHandler);
  }

  /**
   * Start the server
   */
  public start(): void {
    this.server = http.createServer(this.app);

    // Initialize WebSocket
    webSocketService.initialize(this.server);

    // Start listening
    this.server.listen(config.port, () => {
      logger.info(`🚀 OpenClaw Control Panel started on port ${config.port}`, {
        environment: config.nodeEnv,
        url: `http://localhost:${config.port}`,
      });
    });

    // Graceful shutdown
    this.setupGracefulShutdown();
  }

  /**
   * Setup graceful shutdown handlers
   */
  private setupGracefulShutdown(): void {
    const shutdown = (signal: string) => {
      logger.info(`${signal} received. Starting graceful shutdown...`);

      if (this.server) {
        this.server.close((err) => {
          if (err) {
            logger.error('Error during server shutdown:', { error: err.message });
            process.exit(1);
          }

          logger.info('HTTP server closed');

          // Shutdown WebSocket service
          webSocketService.shutdown();

          logger.info('All connections closed. Exiting process.');
          process.exit(0);
        });

        // Force close after timeout
        setTimeout(() => {
          logger.error('Forced shutdown due to timeout');
          process.exit(1);
        }, 10000);
      } else {
        process.exit(0);
      }
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  }

  /**
   * Get the Express app instance (for testing)
   */
  public getApp(): Express {
    return this.app;
  }

  /**
   * Get the HTTP server instance (for testing)
   */
  public getServer(): http.Server | null {
    return this.server;
  }
}

// Create and start server
const server = new Server();
server.start();

export default server;
