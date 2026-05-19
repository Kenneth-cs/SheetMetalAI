import { Router, Request, Response } from 'express';
import { ragService } from '../services/ragService.js';

const router = Router();

router.post('/feedback', async (req: Request, res: Response) => {
  try {
    const { drawingId, errorType, errorDescription, correctValue, drawingFeatures } = req.body;

    if (!errorType || !errorDescription || !correctValue) {
      return res.status(400).json({ error: '缺少必要参数' });
    }

    const lesson = await ragService.addLesson(
      errorType,
      errorDescription,
      correctValue,
      drawingFeatures || {}
    );

    res.json({ success: true, lessonId: lesson.id });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/extract-features', async (req: Request, res: Response) => {
  try {
    const { imageBase64, mimeType } = req.body;

    if (!imageBase64 || !mimeType) {
      return res.status(400).json({ error: '缺少图片数据' });
    }

    const features = await ragService.extractDrawingFeatures(imageBase64, mimeType);
    res.json({ features });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/lessons', async (_req: Request, res: Response) => {
  try {
    res.json({ lessons: [] });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
