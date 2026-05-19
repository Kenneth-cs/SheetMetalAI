import OpenAI from 'openai';

interface Lesson {
  id: string;
  lessonText: string;
  errorType: string;
  drawingFeatures: Record<string, any>;
  similarity?: number;
}

interface DrawingFeatures {
  companyName?: string;
  drawingNumber?: string;
  drawingStyle?: string;
  partType?: string;
}

export class RAGService {
  private _openai: OpenAI | null = null;
  private lessons: Lesson[] = [];

  private get openai(): OpenAI {
    if (!this._openai) {
      const apiKey = process.env.DASHSCOPE_API_KEY;
      if (!apiKey) {
        throw new Error('DASHSCOPE_API_KEY 环境变量未配置');
      }
      this._openai = new OpenAI({
        apiKey,
        baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
      });
    }
    return this._openai;
  }

  async extractDrawingFeatures(imageBase64: string, mimeType: string): Promise<DrawingFeatures> {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'qwen-vl-plus',
        messages: [
          {
            role: 'system',
            content: '你是一个图纸特征提取专家。请从图纸中提取以下元数据特征：公司名称、图号、标题栏信息、排版风格。输出JSON格式。'
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: '请提取这张图纸的特征信息' },
              {
                type: 'image_url',
                image_url: { url: `data:${mimeType};base64,${imageBase64}` }
              }
            ]
          }
        ],
        max_tokens: 500,
        temperature: 0.1,
      });

      const content = response.choices[0]?.message?.content || '{}';
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return {};
    } catch (error) {
      console.error('Failed to extract drawing features:', error);
      return {};
    }
  }

  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-v3',
        input: text,
      });

      return response.data[0]?.embedding || [];
    } catch (error) {
      console.error('Failed to generate embedding:', error);
      return [];
    }
  }

  async findSimilarLessons(features: DrawingFeatures, limit: number = 3): Promise<Lesson[]> {
    if (this.lessons.length === 0) {
      return [];
    }

    const query = JSON.stringify(features);
    const queryEmbedding = await this.generateEmbedding(query);

    if (queryEmbedding.length === 0) {
      return [];
    }

    const scored = this.lessons.map(lesson => {
      const lessonEmbedding = lesson.drawingFeatures ? 
        Object.values(lesson.drawingFeatures).join(' ') : '';
      
      let similarity = 0;
      if (features.companyName && lesson.drawingFeatures?.companyName === features.companyName) {
        similarity += 0.5;
      }
      if (features.partType && lesson.drawingFeatures?.partType === features.partType) {
        similarity += 0.3;
      }
      if (features.drawingStyle && lesson.drawingFeatures?.drawingStyle === features.drawingStyle) {
        similarity += 0.2;
      }

      return { ...lesson, similarity };
    });

    return scored
      .sort((a, b) => (b.similarity || 0) - (a.similarity || 0))
      .slice(0, limit)
      .filter(l => (l.similarity || 0) > 0.1);
  }

  async addLesson(
    errorType: string,
    errorDescription: string,
    correctValue: string,
    drawingFeatures: DrawingFeatures
  ): Promise<Lesson> {
    const lesson: Lesson = {
      id: `lesson-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      lessonText: `错误类型：${errorType}\n错误描述：${errorDescription}\n正确值：${correctValue}`,
      errorType,
      drawingFeatures,
    };

    this.lessons.push(lesson);
    return lesson;
  }

  generateLessonPrompt(lessons: Lesson[]): string {
    if (lessons.length === 0) {
      return '';
    }

    const lessonTexts = lessons.map((l, i) => 
      `${i + 1}. ${l.lessonText}`
    ).join('\n');

    return `\n【历史经验提醒】\n根据历史数据，处理类似图纸时请注意以下问题：\n${lessonTexts}\n请在提取参数时特别注意以上问题，避免重复犯错。`;
  }
}

export const ragService = new RAGService();
