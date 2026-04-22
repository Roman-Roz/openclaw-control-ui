// Global type declarations for OpenClaw Cyberpunk Control Panel

export interface GatewayStatus {
  id: string;
  name: string;
  status: 'online' | 'offline' | 'warning' | 'critical';
  uptime: number;
  lastPing: Date;
  metrics: {
    cpu: number;
    memory: number;
    network: number;
    temperature?: number;
  };
}

export interface SystemMetrics {
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  networkIn: number;
  networkOut: number;
  activeConnections: number;
  timestamp: Date;
}

export interface Alert {
  id: string;
  level: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  source: string;
  timestamp: Date;
  acknowledged: boolean;
}

export interface User {
  id: string;
  username: string;
  role: 'admin' | 'operator' | 'guest';
  permissions: string[];
  lastLogin?: Date;
}

export interface WebSocketMessage {
  type: 'status' | 'metrics' | 'alert' | 'command' | 'response' | 'welcome' | 'pong' | 'error' | 'subscribed';
  payload: any;
  timestamp?: Date;
}

export interface CommandRequest {
  command: string;
  target?: string;
  parameters?: Record<string, any>;
}

export interface CommandResponse {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

export interface PluginManifest {
  name: string;
  version: string;
  description: string;
  author: string;
  main: string;
  dependencies?: Record<string, string>;
}

export interface Plugin {
  manifest: PluginManifest;
  enabled: boolean;
  instance: any;
}

export interface DashboardWidget {
  id: string;
  type: 'metric' | 'chart' | 'alert' | 'log' | 'control';
  title: string;
  config: Record<string, any>;
  position: { x: number; y: number; w: number; h: number };
}

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  resource: string;
  details: Record<string, any>;
  timestamp: Date;
  ipAddress: string;
}

export interface Session {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  ipAddress: string;
  userAgent: string;
}
