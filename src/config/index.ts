import dotenv from 'dotenv';

dotenv.config();

export interface Config {
  port: number;
  nodeEnv: 'development' | 'production' | 'test';
  logLevel: string;
  jwtSecret: string;
  sessionTimeout: number;
  gatewayUrl?: string;
  rateLimit: {
    windowMs: number;
    maxRequests: number;
  };
  cors: {
    origins: string[];
  };
}

const config: Config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: (process.env.NODE_ENV as 'development' | 'production' | 'test') || 'development',
  logLevel: process.env.LOG_LEVEL || 'info',
  jwtSecret: process.env.JWT_SECRET || 'change-this-secret-in-production',
  gatewayUrl: process.env.GATEWAY_URL || 'http://localhost:18789',
  sessionTimeout: parseInt(process.env.SESSION_TIMEOUT || '3600000', 10),
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || '900000', 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  },
  cors: {
    origins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
  },
};

export default config;
