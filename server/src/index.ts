import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import agentRouter from './routes/agent.js';
import ragRouter from './routes/rag.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true,
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use('/api/agent', agentRouter);
app.use('/api/rag', ragRouter);

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 SheetMetalAI Backend running on http://localhost:${PORT}`);
  console.log(`📡 SSE endpoint: http://localhost:${PORT}/api/agent/stream/:sessionId`);
  console.log(`💬 Chat endpoint: http://localhost:${PORT}/api/agent/chat`);
});

export default app;
