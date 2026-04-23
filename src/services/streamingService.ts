import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPSServer } from 'https';
import { Server as HTTPServer } from 'http';
import type GatewayService from './gatewayService';
import SessionMemoryService from './sessionMemoryService';

export interface StreamRequest {
  sessionId?: string;
  prompt: string;
  model?: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface TokenStreamEvent {
  type: 'token' | 'complete' | 'error' | 'start';
  data: string | { error?: string; code?: string };
  timestamp: number;
  sessionId?: string;
}

class StreamingService {
  private io: SocketIOServer | null = null;
  private gatewayService: any;
  private sessionService: SessionMemoryService;
  private activeStreams: Map<string, boolean> = new Map();

  constructor(gatewayService: any, sessionService: SessionMemoryService) {
    this.gatewayService = gatewayService;
    this.sessionService = sessionService;
  }

  /**
   * Initialize Socket.IO server
   */
  initialize(server: HTTPServer | HTTPSServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
      },
    });

    this.io.on('connection', (socket) => {
      console.log(`Client connected: ${socket.id}`);

      socket.on('stream_request', async (request: StreamRequest) => {
        await this.handleStreamRequest(socket, request);
      });

      socket.on('stop_stream', (sessionId: string) => {
        this.stopStream(sessionId || socket.id);
      });

      socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
        this.activeStreams.delete(socket.id);
      });
    });

    return this.io;
  }

  /**
   * Handle streaming request
   */
  private async handleStreamRequest(socket: any, request: StreamRequest) {
    const sessionId = request.sessionId || socket.id;
    this.activeStreams.set(sessionId, true);

    try {
      // Add user message to session
      if (request.sessionId) {
        this.sessionService.addMessage(sessionId, 'user', request.prompt);
      }

      socket.emit('stream_event', {
        type: 'start',
        data: { sessionId, model: request.model || 'default' },
        timestamp: Date.now(),
      } as TokenStreamEvent);

      let fullResponse = '';
      
      // Simulate streaming (in real implementation, this would chunk the LLM response)
      const response = await this.gatewayService.sendCommand(
        request.model || 'default',
        request.prompt,
        request.systemPrompt
      );

      // Split response into chunks for streaming effect
      const chunks = response.response.split(/(\s+)/);
      
      for (const chunk of chunks) {
        if (!this.activeStreams.get(sessionId)) {
          break;
        }

        fullResponse += chunk;
        
        socket.emit('stream_event', {
          type: 'token',
          data: chunk,
          timestamp: Date.now(),
          sessionId,
        } as TokenStreamEvent);

        // Small delay to simulate streaming
        await new Promise(resolve => setTimeout(resolve, 20));
      }

      // Add assistant response to session
      if (request.sessionId) {
        this.sessionService.addMessage(sessionId, 'assistant', fullResponse);
      }

      socket.emit('stream_event', {
        type: 'complete',
        data: fullResponse,
        timestamp: Date.now(),
        sessionId,
      } as TokenStreamEvent);

    } catch (error: any) {
      socket.emit('stream_event', {
        type: 'error',
        data: { error: error.message, code: 'STREAM_ERROR' },
        timestamp: Date.now(),
        sessionId,
      } as TokenStreamEvent);
    } finally {
      this.activeStreams.delete(sessionId);
    }
  }

  /**
   * Stop active stream
   */
  stopStream(sessionId: string): boolean {
    if (this.activeStreams.has(sessionId)) {
      this.activeStreams.delete(sessionId);
      return true;
    }
    return false;
  }

  /**
   * Broadcast event to all connected clients
   */
  broadcast(event: string, data: any) {
    if (this.io) {
      this.io.emit(event, data);
    }
  }

  /**
   * Send event to specific room/session
   */
  sendToRoom(room: string, event: string, data: any) {
    if (this.io) {
      this.io.to(room).emit(event, data);
    }
  }

  /**
   * Get active streams count
   */
  getActiveStreamsCount(): number {
    return this.activeStreams.size;
  }

  /**
   * Shutdown streaming service
   */
  shutdown() {
    this.activeStreams.clear();
    if (this.io) {
      this.io.close();
      this.io = null;
    }
  }
}

export default StreamingService;
