import OpenAI from 'openai';
import { AgentContext, AgentRole } from '../types.js';

let _openai: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!_openai) {
    const apiKey = process.env.DASHSCOPE_API_KEY;
    if (!apiKey) {
      throw new Error('DASHSCOPE_API_KEY 环境变量未配置');
    }
    _openai = new OpenAI({
      apiKey,
      baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    });
  }
  return _openai;
}

export interface ModelCallResult {
  content: string;
  rawPrompt: string;
  rawResponse: string;
}

export async function callVisionModel(
  imageBase64: string,
  mimeType: string,
  prompt: string,
  systemPrompt: string
): Promise<ModelCallResult> {
  const client = getOpenAIClient();
  const messages = [
    { role: 'system' as const, content: systemPrompt },
    {
      role: 'user' as const,
      content: [
        { type: 'text' as const, text: prompt },
        {
          type: 'image_url' as const,
          image_url: {
            url: `data:${mimeType};base64,${imageBase64}`,
          },
        },
      ],
    },
  ];

  const response = await client.chat.completions.create({
    model: 'qwen-vl-max',
    messages,
    max_tokens: 2000,
    temperature: 0.1,
  });

  const content = response.choices[0]?.message?.content || '';
  const rawPrompt = JSON.stringify(messages, null, 2);
  const rawResponse = JSON.stringify(response, null, 2);

  return { content, rawPrompt, rawResponse };
}

export function calculateUnfoldLength(
  flanges: number[],
  materialThickness: number,
  bendRadius: number,
  kFactor: number = 0.33
): number {
  const bendDeduction = flanges.length * (materialThickness + bendRadius) * Math.PI / 2 * (1 - kFactor);
  const totalFlangeLength = flanges.reduce((sum, f) => sum + f, 0);
  return totalFlangeLength - bendDeduction;
}

export function validateThickness(thickness: number): { valid: boolean; message?: string } {
  if (thickness < 0.5) {
    return { valid: false, message: `厚度 ${thickness}mm 小于常规最小值 0.5mm` };
  }
  if (thickness > 20) {
    return { valid: false, message: `厚度 ${thickness}mm 超过常规最大值 20mm` };
  }
  return { valid: true };
}

export function validateBendRadius(radius: number, thickness: number): { valid: boolean; message?: string } {
  const minRadius = thickness * 0.5;
  const maxRadius = thickness * 3;

  if (radius < minRadius) {
    return { valid: false, message: `折弯半径 ${radius}mm 过小，最小建议值为 ${minRadius}mm` };
  }
  if (radius > maxRadius) {
    return { valid: false, message: `折弯半径 ${radius}mm 过大，最大建议值为 ${maxRadius}mm` };
  }
  return { valid: true };
}

export function validateHolePositions(
  holes: Array<{ x: number; y: number; diameter?: number }>,
  partWidth: number,
  partHeight: number
): { valid: boolean; issues: string[] } {
  const issues: string[] = [];

  for (const hole of holes) {
    const radius = (hole.diameter || 0) / 2;

    if (hole.x - radius < 0 || hole.x + radius > partWidth) {
      issues.push(`孔 (${hole.x}, ${hole.y}) 超出零件宽度范围`);
    }
    if (hole.y - radius < 0 || hole.y + radius > partHeight) {
      issues.push(`孔 (${hole.x}, ${hole.y}) 超出零件高度范围`);
    }
  }

  return { valid: issues.length === 0, issues };
}

export async function callTextModel(
  prompt: string,
  systemPrompt: string
): Promise<ModelCallResult> {
  const client = getOpenAIClient();
  const messages = [
    { role: 'system' as const, content: systemPrompt },
    { role: 'user' as const, content: prompt },
  ];

  const response = await client.chat.completions.create({
    model: 'qwen-plus',
    messages,
    max_tokens: 1000,
    temperature: 0.1,
  });

  const content = response.choices[0]?.message?.content || '';
  const rawPrompt = JSON.stringify(messages, null, 2);
  const rawResponse = JSON.stringify(response, null, 2);

  return { content, rawPrompt, rawResponse };
}

export function imageToBase64(buffer: Buffer): string {
  return buffer.toString('base64');
}

export function extractJSON(text: string): string {
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim();
  }

  const braceStart = text.indexOf('{');
  const braceEnd = text.lastIndexOf('}');
  if (braceStart !== -1 && braceEnd !== -1 && braceEnd > braceStart) {
    return text.substring(braceStart, braceEnd + 1);
  }

  return text.trim();
}
