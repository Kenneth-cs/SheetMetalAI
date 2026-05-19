import { Router, Request, Response } from 'express';
import multer from 'multer';
import { sseManager } from '../sseManager.js';
import { AgentWorkflow } from '../agents/workflow.js';
import { sessionStore } from '../store/sessionStore.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

const activeWorkflows: Map<string, AgentWorkflow> = new Map();

router.post('/chat', upload.array('files', 10), async (req: Request, res: Response) => {
  try {
    const sessionId = req.body.sessionId;
    const message = req.body.message || '';
    const files = (req.files as Express.Multer.File[]) || [];

    if (!sessionId) {
      return res.status(400).json({ error: '缺少 sessionId' });
    }

    sessionStore.addMessage(sessionId, 'user', message);

    res.json({ success: true, sessionId });

    const session = sessionStore.getOrCreate(sessionId);
    const workflow = new AgentWorkflow(
      sessionId,
      message,
      files,
      session.extractedParams,
      session.chatHistory
    );
    activeWorkflows.set(sessionId, workflow);

    workflow.execute()
      .catch(err => {
        console.error(`Workflow error for session ${sessionId}:`, err);
        try {
          sseManager.sendError(sessionId, err.message || '处理过程中发生错误');
          sseManager.sendDone(sessionId);
        } catch (e) {
          console.error('Failed to send error to client:', e);
        }
      })
      .finally(() => {
        activeWorkflows.delete(sessionId);
      });
  } catch (error: any) {
    console.error('Chat route error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message });
    }
  }
});

router.get('/stream/:sessionId', (req: Request, res: Response) => {
  const { sessionId } = req.params;

  sseManager.addClient(sessionId, res);

  req.on('close', () => {
    console.log(`SSE client disconnected: ${sessionId}`);
    sseManager.removeClient(sessionId);
  });
});

router.post('/confirm-views', upload.array('files', 10), async (req: Request, res: Response) => {
  try {
    const sessionId = req.body.sessionId as string;
    const files = (req.files as Express.Multer.File[]) || [];

    if (!sessionId) {
      return res.status(400).json({ error: '缺少 sessionId' });
    }

    sessionStore.addMessage(sessionId, 'user', '确认视图并继续提取');
    sessionStore.setWorkflowState(sessionId, { phase: 'extracting' });

    res.json({ success: true, sessionId });

    const session = sessionStore.getOrCreate(sessionId);
    const workflowFiles = files.length > 0 ? files : (session.workflowState.files || []);
    const workflow = new AgentWorkflow(
      sessionId,
      '确认视图并继续提取',
      workflowFiles as Express.Multer.File[],
      session.extractedParams || undefined,
      session.chatHistory
    );
    activeWorkflows.set(sessionId, workflow);

    workflow.executeExtractor()
      .catch((err: Error) => {
        console.error(`Extractor error for session ${sessionId}:`, err);
        try {
          sseManager.sendError(sessionId, err.message || '提取过程中发生错误');
          sseManager.sendDone(sessionId);
        } catch (e) {
          console.error('Failed to send error to client:', e);
        }
      })
      .finally(() => {
        activeWorkflows.delete(sessionId);
      });
  } catch (error: any) {
    console.error('Confirm views route error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message });
    }
  }
});

router.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default router;
