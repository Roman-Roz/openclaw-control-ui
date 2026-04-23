import MemoryCache from 'memory-cache';

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

export interface Session {
  id: string;
  userId?: string;
  contextId?: string;
  messages: Message[];
  metadata: Record<string, any>;
  createdAt: number;
  updatedAt: number;
  expiresAt?: number;
}

export interface SessionConfig {
  maxMessages?: number;
  ttl?: number; // Time to live in milliseconds
  maxSessionAge?: number; // Maximum age of session in milliseconds
}

const DEFAULT_CONFIG: SessionConfig = {
  maxMessages: 50,
  ttl: 3600000, // 1 hour
  maxSessionAge: 86400000, // 24 hours
};

class SessionMemoryService {
  private cache: any;
  private config: SessionConfig;

  constructor(config: SessionConfig = {}) {
    this.cache = new MemoryCache();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Create a new session
   */
  createSession(userId?: string, contextId?: string, metadata: Record<string, any> = {}): Session {
    const sessionId = require('crypto').randomUUID();
    const now = Date.now();
    
    const session: Session = {
      id: sessionId,
      userId,
      contextId,
      messages: [],
      metadata,
      createdAt: now,
      updatedAt: now,
      expiresAt: now + this.config.ttl!,
    };

    this.cache.put(sessionId, session, this.config.ttl);
    return session;
  }

  /**
   * Get session by ID
   */
  getSession(sessionId: string): Session | null {
    return this.cache.get(sessionId) as Session | null;
  }

  /**
   * Add message to session
   */
  addMessage(sessionId: string, role: Message['role'], content: string, metadata?: Record<string, any>): Session | null {
    const session = this.getSession(sessionId);
    if (!session) {
      return null;
    }

    const message: Message = {
      role,
      content,
      timestamp: Date.now(),
      metadata,
    };

    session.messages.push(message);
    session.updatedAt = Date.now();
    session.expiresAt = Date.now() + this.config.ttl!;

    // Trim messages if exceeding max
    if (session.messages.length > this.config.maxMessages!) {
      session.messages = session.messages.slice(-this.config.maxMessages!);
    }

    this.cache.put(sessionId, session, this.config.ttl);
    return session;
  }

  /**
   * Get conversation history for context
   */
  getConversationHistory(sessionId: string, limit?: number): Message[] {
    const session = this.getSession(sessionId);
    if (!session) {
      return [];
    }

    const messages = limit ? session.messages.slice(-limit) : session.messages;
    return messages;
  }

  /**
   * Format messages for LLM context
   */
  formatForLLM(sessionId: string, systemPrompt?: string): string {
    const messages = this.getConversationHistory(sessionId);
    
    let context = '';
    if (systemPrompt) {
      context += `System: ${systemPrompt}\n\n`;
    }

    messages.forEach(msg => {
      const role = msg.role === 'user' ? 'User' : msg.role === 'assistant' ? 'Assistant' : 'System';
      context += `${role}: ${msg.content}\n`;
    });

    return context;
  }

  /**
   * Clear session messages
   */
  clearMessages(sessionId: string): boolean {
    const session = this.getSession(sessionId);
    if (!session) {
      return false;
    }

    session.messages = [];
    session.updatedAt = Date.now();
    this.cache.put(sessionId, session, this.config.ttl);
    return true;
  }

  /**
   * Delete session
   */
  deleteSession(sessionId: string): boolean {
    return this.cache.del(sessionId);
  }

  /**
   * Get all active sessions (for monitoring)
   */
  getAllSessions(): Session[] {
    const keys = this.cache.keys();
    return keys.map((key: string) => this.cache.get(key)).filter(Boolean);
  }

  /**
   * Get session statistics
   */
  getStats() {
    const sessions = this.getAllSessions();
    const totalMessages = sessions.reduce((sum, s) => sum + s.messages.length, 0);
    
    return {
      activeSessions: sessions.length,
      totalMessages,
      averageMessagesPerSession: sessions.length > 0 ? totalMessages / sessions.length : 0,
      oldestSession: sessions.length > 0 ? Math.min(...sessions.map(s => s.createdAt)) : null,
    };
  }

  /**
   * Cleanup expired sessions (manual trigger)
   */
  cleanup(): number {
    const sessions = this.getAllSessions();
    const now = Date.now();
    let removed = 0;

    sessions.forEach(session => {
      if (session.expiresAt && now > session.expiresAt) {
        this.deleteSession(session.id);
        removed++;
      } else if (this.config.maxSessionAge && now - session.createdAt > this.config.maxSessionAge) {
        this.deleteSession(session.id);
        removed++;
      }
    });

    return removed;
  }
}

export default SessionMemoryService;
