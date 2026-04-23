import { Router } from 'express';
import SessionMemoryService from '../services/sessionMemoryService';
import StreamingService from '../services/streamingService';

const router = Router();

let sessionService: SessionMemoryService;
let streamingService: StreamingService;

export function initializeSessionRoutes(
  sessionSvc: SessionMemoryService,
  streamingSvc: StreamingService
) {
  sessionService = sessionSvc;
  streamingService = streamingSvc;
  return router;
}

/**
 * POST /api/sessions - Create new session
 */
router.post('/', (req, res) => {
  try {
    const { userId, contextId, metadata } = req.body;
    const session = sessionService.createSession(userId, contextId, metadata);
    res.json({ success: true, session });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/sessions/:sessionId - Get session details
 */
router.get('/:sessionId', (req, res) => {
  try {
    const session = sessionService.getSession(req.params.sessionId);
    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }
    res.json({ success: true, session });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/sessions/:sessionId/messages - Add message to session
 */
router.post('/:sessionId/messages', (req, res) => {
  try {
    const { role, content, metadata } = req.body;
    if (!role || !content) {
      return res.status(400).json({ success: false, error: 'role and content are required' });
    }

    const session = sessionService.addMessage(req.params.sessionId, role, content, metadata);
    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }

    res.json({ success: true, session });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/sessions/:sessionId/history - Get conversation history
 */
router.get('/:sessionId/history', (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
    const messages = sessionService.getConversationHistory(req.params.sessionId, limit);
    res.json({ success: true, messages });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/sessions/:sessionId/context - Get formatted context for LLM
 */
router.get('/:sessionId/context', (req, res) => {
  try {
    const systemPrompt = req.query.systemPrompt as string | undefined;
    const context = sessionService.formatForLLM(req.params.sessionId, systemPrompt);
    res.json({ success: true, context });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/sessions/:sessionId/messages - Clear session messages
 */
router.delete('/:sessionId/messages', (req, res) => {
  try {
    const success = sessionService.clearMessages(req.params.sessionId);
    if (!success) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/sessions/:sessionId - Delete session
 */
router.delete('/:sessionId', (req, res) => {
  try {
    const success = sessionService.deleteSession(req.params.sessionId);
    if (!success) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/sessions/stats - Get session statistics
 */
router.get('/stats', (req, res) => {
  try {
    const stats = sessionService.getStats();
    res.json({ success: true, stats });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/sessions - List all active sessions
 */
router.get('/', (req, res) => {
  try {
    const sessions = sessionService.getAllSessions();
    res.json({ success: true, sessions });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/sessions/cleanup - Cleanup expired sessions
 */
router.post('/cleanup', (req, res) => {
  try {
    const removed = sessionService.cleanup();
    res.json({ success: true, removed });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/stream - Start streaming response (HTTP fallback)
 */
router.post('/stream', async (req, res) => {
  try {
    const { sessionId, prompt, model, systemPrompt } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ success: false, error: 'prompt is required' });
    }

    // For HTTP streaming, we'll use Server-Sent Events
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const session = sessionId ? sessionService.getSession(sessionId) : null;
    if (sessionId && !session) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }

    if (sessionId) {
      sessionService.addMessage(sessionId, 'user', prompt);
    }

    let fullResponse = '';
    
    try {
      const gatewayService = (streamingService as any).gatewayService;
      const response = await gatewayService.sendCommand(model || 'default', prompt, systemPrompt);
      const chunks = response.response.split(/(\s+)/);

      for (const chunk of chunks) {
        fullResponse += chunk;
        res.write(`data: ${JSON.stringify({ type: 'token', data: chunk })}\n\n`);
        await new Promise(resolve => setTimeout(resolve, 20));
      }

      if (sessionId) {
        sessionService.addMessage(sessionId, 'assistant', fullResponse);
      }

      res.write(`data: ${JSON.stringify({ type: 'complete', data: fullResponse })}\n\n`);
    } catch (error: any) {
      res.write(`data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`);
    }

    res.end();
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
