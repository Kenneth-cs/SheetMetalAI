import { GoogleGenAI } from "@google/genai";
import { AIAnalysisResponse, PartType } from "../types";

// Lazy initialization: create the client only when first used,
// so a missing API key won't crash the app on page load.
let _ai: GoogleGenAI | null = null;

const getAI = (): GoogleGenAI => {
  if (!_ai) {
    const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("API Key 未配置。请在 Vercel 后台 Settings → Environment Variables 中添加 GEMINI_API_KEY，然后重新部署。");
    }
    _ai = new GoogleGenAI({ apiKey });
  }
  return _ai;
};

// Helper to list available models
export const listAvailableModels = async () => {
  try {
    const response = await getAI().models.list();
    const models: any[] = [];
    for await (const model of response) {
      models.push(model);
    }
    return models;
  } catch (error) {
    console.error("Failed to list models:", error);
    throw error;
  }
};

// Each file can carry a view label so the AI knows which engineering view it is
export interface ViewFile {
  data: string;
  mimeType: string;
  // e.g. "主视图 (Front View)", "侧视图 (Side View)", "俯视图 (Plan View)"
  viewLabel?: string;
}

export const analyzeDrawing = async (files: ViewFile[]): Promise<AIAnalysisResponse> => {
  try {
    const modelId = "gemini-3-flash-preview";
    console.log(`Attempting to use model: ${modelId}`);

    // Build the view description list to embed in the prompt
    const viewDescriptions = files.map((f, i) => {
      const label = f.viewLabel || `图${i + 1}`;
      return `  - 图${i + 1}：${label}`;
    }).join("\n");

    const systemPrompt = [
      "你是一名专业的钣金工程师。请分析所提供的电柜零件技术图纸，然后只输出一个合法的 JSON 对象，不要有任何其他文字、代码块标记或解释。",
      "",
      `本次提供了 ${files.length} 张图纸视图，视图说明如下：`,
      viewDescriptions,
      "请根据以上视图标注，正确区分每张图所代表的工程视角。",
      "",
      "输出格式（严格按照以下 JSON 结构）：",
      "{",
      '  "identifiedType": "U-Channel",',
      '  "confidence": 0.95,',
      '  "reasoning": "中文推理说明...",',
      '  "extractedParams": {',
      '    "width": 230,',
      '    "height": 25,',
      '    "depth": 15,',
      '    "flangeLength": 15,',
      '    "materialThickness": 1.2,',
      '    "bendRadius": 2,',
      '    "holes": [',
      '      { "type": "CIRCLE", "x": 15, "y": 12.5, "diameter": 5.4, "face": "MAIN" },',
      '      { "type": "CIRCLE", "x": 40, "y": 12.5, "diameter": 5.4, "face": "MAIN" }',
      "    ]",
      "  },",
      '  "fabricationAdvice": {',
      '    "cuttingSteps": ["步骤1...", "步骤2..."],',
      '    "bendingSequence": ["折弯1...", "折弯2..."],',
      '    "technicalTips": ["提示1...", "提示2..."]',
      "  }",
      "}",
      "",
      "identifiedType 枚举值（只能用以下之一）：",
      '"Flat Panel" | "L-Bracket" | "U-Channel" | "Box Panel (4 Bend)" | "Custom/Complex"',
      "",
      "孔位提取规则（非常重要）：",
      "1. 必须将所有孔位填入 holes 数组，不能只在 reasoning 中描述。",
      '2. "NxP(=L)" 表示 N 个间距、P 为间距、L 为总长，孔数 = N+1。',
      '   例："34x25(=850)" 起始 x=17.5 → 共 35 个孔，坐标 x=17.5, 42.5, 67.5, ...。',
      "3. x/y 坐标原点为该零件主面展开后的左下角。",
      "4. face 字段：MAIN（主面）、FLANGE_LEFT（左翼）、FLANGE_RIGHT（右翼）、FLANGE_TOP（顶翼）、FLANGE_BOTTOM（底翼）。",
      "5. 所有数值单位为 mm，必须是普通小数（如 230），不得使用科学计数法。",
      "6. 【禁止重复计孔 - 最关键规则】：",
      "   - 主视图（Front View）展示正面，俯视图（Plan View）展示从上方看的面。",
      "   - 如果一排贯穿孔同时出现在主视图和俯视图（坐标序列相同），它们是同一排孔，只记录一次。",
      "   - 只有当侧视图截面图明确显示孔位于独立翼缘（Flange）上，且与主面孔不在同一展开平面时，才在 holes 中单独记录 face=FLANGE_*。",
      "   - 判断依据：查看侧视图，若孔所在的两个面在截面中处于同一水平面，则是同一排孔，只记一次。",
      "",
      "输出要求：",
      "- reasoning 和 fabricationAdvice 全部用简体中文。",
      '- 数值字段只写数字（如 230，不要写 "230mm"）。',
      "- 直接输出合法 JSON，不要加任何 markdown 标记。",
    ].join("\n");

    let parts: any[] = [];
    parts.push({ text: systemPrompt });

    // Add all file parts, each preceded by its view label as a text hint
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const label = file.viewLabel || `图${i + 1}`;
      // Insert a text label before each image so AI associates label with image
      parts.push({ text: `\n以下是第 ${i + 1} 张图（${label}）：` });

      if (file.mimeType === 'application/dxf') {
        let dxfContent = file.data;
        const MAX_DXF_CHARS = 400000;
        if (dxfContent.length > MAX_DXF_CHARS) {
          console.warn(`DXF file too large (${dxfContent.length} chars), truncating to ${MAX_DXF_CHARS} chars.`);
          dxfContent = dxfContent.substring(0, MAX_DXF_CHARS) + "\n...[TRUNCATED due to size limit]...";
        }
        parts.push({ text: "DXF File Content:\n" + dxfContent });
      } else {
        parts.push({ inlineData: { mimeType: file.mimeType, data: file.data } });
      }
    }

    const response = await getAI().models.generateContent({
      model: modelId,
      contents: { parts }
      // No responseSchema: let the model output free-form JSON.
      // This avoids Gemini silently dropping complex nested fields (like holes array).
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");

    // Strip any accidental markdown code fence wrapping
    const cleanText = text
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    const parsed = JSON.parse(cleanText) as AIAnalysisResponse;
    console.log(`AI returned ${parsed.extractedParams?.holes?.length ?? 0} holes`);
    return parsed;

  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`AI Analysis Failed: ${errorMessage}`);
  }
};
