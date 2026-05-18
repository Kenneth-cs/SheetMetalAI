import OpenAI from "openai";
import { AIAnalysisResponse, PartType } from "../types";

let _client: OpenAI | null = null;

const getClient = (): OpenAI => {
  if (!_client) {
    const apiKey = process.env.DASHSCOPE_API_KEY;
    if (!apiKey) {
      throw new Error("DASHSCOPE_API_KEY 未配置。请在 .env 文件或 Vercel 环境变量中添加 DASHSCOPE_API_KEY。");
    }
    _client = new OpenAI({
      apiKey,
      baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
      dangerouslyAllowBrowser: true,
    });
  }
  return _client;
};

export interface ViewFile {
  data: string;
  mimeType: string;
  viewLabel?: string;
}

const MODEL_ID = "qwen3-vl-plus";

const SYSTEM_PROMPT = `你是一名专业的钣金工程师。你的任务是分析电柜零件技术图纸，提取关键参数，并输出一个合法的 JSON 对象。

输出格式（严格按照以下 JSON 结构，不要有任何其他文字、代码块标记或解释）：
{
  "identifiedType": "U-Channel",
  "confidence": 0.95,
  "step_by_step_reasoning": "1. 识别零件类型... 2. 提取尺寸... 3. 计算孔位...",
  "reasoning": "中文推理说明...",
  "extractedParams": {
    "width": 230,
    "height": 25,
    "depth": 15,
    "flangeLength": 15,
    "materialThickness": 1.2,
    "bendRadius": 2,
    "bendAxis": "LONG",
    "holeArray": {
      "startX": 17.5,
      "startY": 12.5,
      "spacing": 25,
      "count": 35,
      "diameter": 5.4,
      "face": "MAIN"
    },
    "holes": [
      { "type": "CIRCLE", "x": 15, "y": 12.5, "diameter": 5.4, "face": "MAIN" }
    ]
  },
  "fabricationAdvice": {
    "cuttingSteps": ["步骤1...", "步骤2..."],
    "bendingSequence": ["折弯1...", "折弯2..."],
    "technicalTips": ["提示1...", "提示2..."]
  }
}

identifiedType 枚举值（只能用以下之一）：
"Flat Panel" | "L-Bracket" | "U-Channel" | "Box Panel (4 Bend)" | "Custom/Complex"

bendAxis 规则（仅对 U-Channel 类型）：
- "LONG"（沿长边折弯，水槽型）：翼缘沿零件长度方向上下折弯，形成U型水槽截面。适用于宽度 >> 高度的零件。
- "SHORT"（沿短边折弯，ㄇ字型）：翼缘沿宽度方向左右折弯，形成ㄇ型支架截面。适用于高度 >> 宽度的零件。
- 判断依据：观察侧视图截面，如果翼缘在长边方向，则为 LONG；如果翼缘在短边方向，则为 SHORT。

孔位提取规则（非常重要）：
1. 【优先使用 holeArray】：当图纸标注为等距排孔（如 "8x25(=200)" 或 "34x25(=850)"）时，必须输出 holeArray 结构，包含 startX（首孔X坐标）、startY（孔中心Y坐标）、spacing（孔间距）、count（孔数）、diameter（孔直径）。
2. holes 数组仅用于处理不规则分布的孔（如单独的安装孔、不同直径的孔等）。
3. "NxP(=L)" 表示 N 个间距、P 为间距、L 为总长，孔数 = N+1。
   例："34x25(=850)" 起始 x=17.5 → holeArray: { startX: 17.5, startY: 12.5, spacing: 25, count: 35, diameter: 5.4 }
4. x/y 坐标原点为该零件主面展开后的左下角。
5. face 字段：MAIN（主面）、FLANGE_LEFT（左翼）、FLANGE_RIGHT（右翼）、FLANGE_TOP（顶翼）、FLANGE_BOTTOM（底翼）。
6. 所有数值单位为 mm，必须是普通小数（如 230），不得使用科学计数法。
7. 【禁止重复计孔 - 最关键规则】：
   - 主视图（Front View）展示正面，俯视图（Plan View）展示从上方看的面。
   - 如果一排贯穿孔同时出现在主视图和俯视图（坐标序列相同），它们是同一排孔，只记录一次。
   - 只有当侧视图截面图明确显示孔位于独立翼缘（Flange）上，且与主面孔不在同一展开平面时，才在 holes 中单独记录 face=FLANGE_*。
   - 判断依据：查看侧视图，若孔所在的两个面在截面中处于同一水平面，则是同一排孔，只记一次。

输出要求：
- step_by_step_reasoning：必须先进行分步推理，详细写出孔位阵列的计算过程（如：起始坐标、间距、孔数推导）。
- 【总长推算规则】：当图纸标注阵列信息（如"34x25(=850)"）但未直接标注总长时，必须按以下公式推算：零件总长 = 首孔边距 + 阵列跨度 + 末孔边距。如果只给出单侧边距，根据钣金件对称性设计原则，假设两侧边距相等。
- reasoning 和 fabricationAdvice 全部用简体中文。
- 数值字段只写数字（如 230，不要写 "230mm"）。
- 直接输出合法 JSON，不要加任何 markdown 标记。`;

const SMART_SYSTEM_PROMPT = `你是一名专业的钣金工程师。你的任务是分析一张包含多个视图的电柜零件技术图纸，通过自主推理提取关键参数，并输出一个合法的 JSON 对象。

【重要】你必须严格按照以下步骤进行推理，然后输出结果：

第一步：视图拆解
- 仔细观察图纸，识别其中包含哪些视图（主视图、侧视图、俯视图等）
- 标注每个视图在图纸中的位置和所展示的内容

第二步：独立提取
- 从主视图中提取：总长、高度、孔位信息
- 从侧视图中提取：截面形状、翼缘高度、折弯信息
- 从俯视图中提取：宽度信息、孔位排布

第三步：交叉验证
- 对比各视图提取的数据是否一致
- 如果发现矛盾，说明你的判断依据

第四步：输出 JSON

输出格式（严格按照以下 JSON 结构，不要有任何其他文字、代码块标记或解释）：
{
  "identifiedType": "U-Channel",
  "confidence": 0.95,
  "step_by_step_reasoning": "第一步：视图拆解 - 图纸包含主视图（左上）和侧视图（右上）。第二步：独立提取 - 主视图显示总长300mm... 第三步：交叉验证 - 两视图数据一致...",
  "reasoning": "中文推理说明...",
  "extractedParams": {
    "width": 230,
    "height": 25,
    "depth": 15,
    "flangeLength": 15,
    "materialThickness": 1.2,
    "bendRadius": 2,
    "holes": [
      { "type": "CIRCLE", "x": 15, "y": 12.5, "diameter": 5.4, "face": "MAIN" }
    ]
  },
  "fabricationAdvice": {
    "cuttingSteps": ["步骤1...", "步骤2..."],
    "bendingSequence": ["折弯1...", "折弯2..."],
    "technicalTips": ["提示1...", "提示2..."]
  }
}

identifiedType 枚举值（只能用以下之一）：
"Flat Panel" | "L-Bracket" | "U-Channel" | "Box Panel (4 Bend)" | "Custom/Complex"

孔位提取规则（非常重要）：
1. 必须将所有孔位填入 holes 数组，不能只在 reasoning 中描述。
2. "NxP(=L)" 表示 N 个间距、P 为间距、L 为总长，孔数 = N+1。
   例："34x25(=850)" 起始 x=17.5 → 共 35 个孔，坐标 x=17.5, 42.5, 67.5, ...。
3. x/y 坐标原点为该零件主面展开后的左下角。
4. face 字段：MAIN（主面）、FLANGE_LEFT（左翼）、FLANGE_RIGHT（右翼）、FLANGE_TOP（顶翼）、FLANGE_BOTTOM（底翼）。
5. 所有数值单位为 mm，必须是普通小数（如 230），不得使用科学计数法。
6. 【禁止重复计孔 - 最关键规则】：
   - 如果一排贯穿孔同时出现在主视图和俯视图（坐标序列相同），它们是同一排孔，只记录一次。
   - 只有当侧视图明确显示孔位于独立翼缘上时，才单独记录。

输出要求：
- step_by_step_reasoning：必须严格按照"第一步→第二步→第三步→第四步"的格式写出推理过程。
- reasoning 和 fabricationAdvice 全部用简体中文。
- 数值字段只写数字（如 230，不要写 "230mm"）。
- 直接输出合法 JSON，不要加任何 markdown 标记。`;

const SMART_FEW_SHOT_EXAMPLES = `示例：单图智能识别
用户上传了一张包含主视图和侧视图的完整图纸。主视图显示：总长 300mm，高度 50mm，6 个 Φ5.4 孔。侧视图显示：U 型截面，翼缘 20mm，板厚 1.5mm。
你的回答：
{
  "identifiedType": "U-Channel",
  "confidence": 0.90,
  "step_by_step_reasoning": "第一步：视图拆解 - 图纸左半部分为主视图，显示零件正面轮廓和孔位；右半部分为侧视图，显示截面形状。第二步：独立提取 - 主视图：总长300mm，高度50mm，标注'6x50(=250)'表示6个孔间距50mm；侧视图：U型截面，翼缘20mm，板厚1.5mm，折弯半径R2。第三步：交叉验证 - 主视图高度50mm与侧视图U型高度一致，数据无矛盾。第四步：输出结果。",
  "reasoning": "图纸包含主视图和侧视图两个视角。主视图展示零件正面，总长300mm，高度50mm，主面上有6个直径5.4mm的通孔。侧视图展示U型截面，翼缘20mm，板厚1.5mm。",
  "extractedParams": {
    "width": 300,
    "height": 50,
    "depth": 20,
    "flangeLength": 20,
    "materialThickness": 1.5,
    "bendRadius": 2,
    "holes": [
      { "type": "CIRCLE", "x": 25, "y": 25, "diameter": 5.4, "face": "MAIN" },
      { "type": "CIRCLE", "x": 75, "y": 25, "diameter": 5.4, "face": "MAIN" },
      { "type": "CIRCLE", "x": 125, "y": 25, "diameter": 5.4, "face": "MAIN" },
      { "type": "CIRCLE", "x": 175, "y": 25, "diameter": 5.4, "face": "MAIN" },
      { "type": "CIRCLE", "x": 225, "y": 25, "diameter": 5.4, "face": "MAIN" },
      { "type": "CIRCLE", "x": 275, "y": 25, "diameter": 5.4, "face": "MAIN" }
    ]
  },
  "fabricationAdvice": {
    "cuttingSteps": ["按展开尺寸 340mm x 50mm 激光切割下料", "注意预留折弯余量"],
    "bendingSequence": ["先折两侧翼缘，采用向上折弯", "折弯顺序：先左翼后右翼，保证对称性"],
    "technicalTips": ["1.5mm 板厚建议使用 V=8mm 下模", "折弯扣除值约为 2.6mm/刀"]
  }
}`;

const FEW_SHOT_EXAMPLES = `示例 1：单视图 U 型槽
用户上传了 1 张主视图（Front View），图纸标注：总长 300mm，高度 50mm，翼缘 20mm，板厚 1.5mm，R2，主面有 6 个 Φ5.4 孔，起始 x=25 间距 50mm。
你的回答：
{
  "identifiedType": "U-Channel",
  "confidence": 0.92,
  "step_by_step_reasoning": "1. 识别零件类型：截面呈U型，属于U-Channel。2. 提取主体尺寸：总长300mm，高度50mm，翼缘20mm。3. 计算孔位：图纸标注'6x50(=250)'，起始x=25，间距50mm，共6个孔。坐标：25, 75, 125, 175, 225, 275。y坐标取高度中心25mm。4. 汇总：板厚1.5mm，折弯半径R2。",
  "reasoning": "根据主视图分析，零件呈 U 型截面，总长 300mm，高度 50mm，两侧翼缘各 20mm，板厚 1.5mm，折弯半径 2mm。主面上有 6 个直径 5.4mm 的通孔，沿长度方向均匀分布。",
  "extractedParams": {
    "width": 300,
    "height": 50,
    "depth": 20,
    "flangeLength": 20,
    "materialThickness": 1.5,
    "bendRadius": 2,
    "holes": [
      { "type": "CIRCLE", "x": 25, "y": 25, "diameter": 5.4, "face": "MAIN" },
      { "type": "CIRCLE", "x": 75, "y": 25, "diameter": 5.4, "face": "MAIN" },
      { "type": "CIRCLE", "x": 125, "y": 25, "diameter": 5.4, "face": "MAIN" },
      { "type": "CIRCLE", "x": 175, "y": 25, "diameter": 5.4, "face": "MAIN" },
      { "type": "CIRCLE", "x": 225, "y": 25, "diameter": 5.4, "face": "MAIN" },
      { "type": "CIRCLE", "x": 275, "y": 25, "diameter": 5.4, "face": "MAIN" }
    ]
  },
  "fabricationAdvice": {
    "cuttingSteps": ["按展开尺寸 340mm x 50mm 激光切割下料", "注意预留折弯余量"],
    "bendingSequence": ["先折两侧翼缘，采用向上折弯", "折弯顺序：先左翼后右翼，保证对称性"],
    "technicalTips": ["1.5mm 板厚建议使用 V=8mm 下模", "折弯扣除值约为 2.6mm/刀"]
  }
}

示例 2：阵列孔与总长推算
用户上传了一张 U 型槽的主视图，图纸标注：高度 25mm，翼缘 15mm，板厚 1.2mm，R2，主面标注 "34x25(=850)"，首孔边距 15mm。
你的回答：
{
  "identifiedType": "U-Channel",
  "confidence": 0.95,
  "step_by_step_reasoning": "1. 识别零件类型：U型截面，属于U-Channel。2. 推算总长：图纸标注阵列跨度850mm（34个间距x25mm），首孔边距15mm。根据对称性设计，末孔边距也应为15mm。因此零件总长 width = 15 + 850 + 15 = 880mm。3. 提取孔阵列参数：startX=15, startY=12.5（高度中心）, spacing=25, count=35（34个间距意味着35个孔）, diameter=5.4。4. 汇总：height=25, depth=15, 板厚1.2mm, R2。",
  "reasoning": "图纸标注'34x25(=850)'表示34个间距，每个间距25mm，阵列总跨度850mm。首孔距边15mm，根据钣金件对称性设计原则，末孔距边也应为15mm。因此零件总长 = 15 + 850 + 15 = 880mm。共35个孔（34+1）。",
  "extractedParams": {
    "width": 880,
    "height": 25,
    "depth": 15,
    "flangeLength": 15,
    "materialThickness": 1.2,
    "bendRadius": 2,
    "holeArray": {
      "startX": 15,
      "startY": 12.5,
      "spacing": 25,
      "count": 35,
      "diameter": 5.4,
      "face": "MAIN"
    },
    "holes": []
  },
  "fabricationAdvice": {
    "cuttingSteps": ["按展开尺寸 910mm x 25mm 激光切割下料", "注意预留折弯余量"],
    "bendingSequence": ["先折两侧翼缘，采用向上折弯"],
    "technicalTips": ["1.2mm 板厚建议使用 V=6mm 下模", "阵列孔可使用数控冲床批量加工"]
  }
}`;

function extractJSON(text: string): string {
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim();
  }

  const braceStart = text.indexOf("{");
  const braceEnd = text.lastIndexOf("}");
  if (braceStart !== -1 && braceEnd !== -1 && braceEnd > braceStart) {
    return text.substring(braceStart, braceEnd + 1);
  }

  return text.trim();
}

function buildUserContent(files: ViewFile[]): OpenAI.Chat.Completions.ChatCompletionContentPart[] {
  const content: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [];

  const viewDescriptions = files.map((f, i) => {
    const label = f.viewLabel || `图${i + 1}`;
    return `  - 图${i + 1}：${label}`;
  }).join("\n");

  content.push({
    type: "text",
    text: `本次提供了 ${files.length} 张图纸视图，视图说明如下：\n${viewDescriptions}\n请根据以上视图标注，正确区分每张图所代表的工程视角，然后输出分析结果 JSON。`,
  });

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const label = file.viewLabel || `图${i + 1}`;

    content.push({
      type: "text",
      text: `\n以下是第 ${i + 1} 张图（${label}）：`,
    });

    if (file.mimeType === "application/dxf") {
      let dxfContent = file.data;
      const MAX_DXF_CHARS = 400000;
      if (dxfContent.length > MAX_DXF_CHARS) {
        console.warn(`DXF file too large (${dxfContent.length} chars), truncating to ${MAX_DXF_CHARS} chars.`);
        dxfContent = dxfContent.substring(0, MAX_DXF_CHARS) + "\n...[TRUNCATED due to size limit]...";
      }
      content.push({
        type: "text",
        text: "DXF File Content:\n" + dxfContent,
      });
    } else {
      content.push({
        type: "image_url",
        image_url: {
          url: `data:${file.mimeType};base64,${file.data}`,
        },
      });
    }
  }

  return content;
}

export const analyzeDrawing = async (files: ViewFile[], mode: 'split' | 'smart' = 'split'): Promise<AIAnalysisResponse> => {
  try {
    const client = getClient();
    console.log(`Attempting to use model: ${MODEL_ID} via DashScope (mode: ${mode})`);

    const userContent = buildUserContent(files);

    const systemContent = mode === 'smart'
      ? SMART_SYSTEM_PROMPT + "\n\n" + SMART_FEW_SHOT_EXAMPLES
      : SYSTEM_PROMPT + "\n\n" + FEW_SHOT_EXAMPLES;

    const response = await client.chat.completions.create({
      model: MODEL_ID,
      messages: [
        {
          role: "system",
          content: systemContent,
        },
        {
          role: "user",
          content: userContent,
        },
      ],
      temperature: 0.1,
      max_tokens: 4096,
    });

    const text = response.choices[0]?.message?.content;
    console.log("AI response length:", text?.length);
    console.log("AI response preview:", text?.substring(0, 200));

    if (!text) {
      throw new Error("AI 未返回任何内容");
    }

    const jsonStr = extractJSON(text);
    const parsed = JSON.parse(jsonStr) as AIAnalysisResponse;

    if (!parsed.identifiedType || !parsed.extractedParams) {
      throw new Error("AI 返回的 JSON 缺少必要字段 (identifiedType / extractedParams)");
    }

    const validTypes: string[] = Object.values(PartType);
    if (!validTypes.includes(parsed.identifiedType)) {
      console.warn(`AI returned invalid type "${parsed.identifiedType}", falling back to Custom/Complex`);
      parsed.identifiedType = PartType.UNKNOWN;
    }

    console.log(`AI returned ${parsed.extractedParams?.holes?.length ?? 0} holes`);
    return parsed;

  } catch (error) {
    console.error("Qwen Analysis Error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`AI Analysis Failed: ${errorMessage}`);
  }
};

export interface ViewBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DetectedViewBoxes {
  front: ViewBox | null;
  side: ViewBox | null;
  plan: ViewBox | null;
}

const DETECT_PROMPT = `你是一名专业的图纸分析助手。请仔细观察这张工程图纸，识别并定位其中的各个视图区域。

你需要找出以下视图的边界框（如果存在）：
- 主视图 (Front View)：通常展示零件的正面轮廓
- 侧视图 (Side View)：通常展示零件的截面形状
- 俯视图 (Plan View)：通常展示零件的顶部布局

输出格式（严格按照以下 JSON 结构，不要有任何其他文字、代码块标记或解释）：
{
  "front": { "x": 10, "y": 5, "width": 40, "height": 45 },
  "side": { "x": 55, "y": 5, "width": 40, "height": 45 },
  "plan": { "x": 10, "y": 55, "width": 40, "height": 40 }
}

重要规则：
1. 坐标值使用相对于图片宽高的百分比（0-100），不是像素值。
2. x, y 是边界框左上角的百分比位置。
3. width, height 是边界框宽高占图片的百分比。
4. 如果某个视图在图纸中不存在，将其值设为 null。
5. 尽量精确框选，边界框应紧贴视图内容，留少量边距即可。
6. 直接输出合法 JSON，不要加任何 markdown 标记。`;

export const detectViewBoxes = async (imageData: string, mimeType: string): Promise<DetectedViewBoxes> => {
  try {
    const client = getClient();
    console.log(`Detecting view boxes using ${MODEL_ID}...`);

    const response = await client.chat.completions.create({
      model: MODEL_ID,
      messages: [
        {
          role: "system",
          content: DETECT_PROMPT,
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "请识别这张图纸中各个视图（主视图、侧视图、俯视图）的边界框位置。",
            },
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${imageData}`,
              },
            },
          ],
        },
      ],
      temperature: 0.1,
      max_tokens: 1024,
    });

    const text = response.choices[0]?.message?.content;
    console.log("Detect response:", text?.substring(0, 300));

    if (!text) {
      throw new Error("AI 未返回视图检测结果");
    }

    const jsonStr = extractJSON(text);
    const parsed = JSON.parse(jsonStr);

    const result: DetectedViewBoxes = {
      front: parsed.front || null,
      side: parsed.side || null,
      plan: parsed.plan || null,
    };

    console.log("Detected view boxes:", result);
    return result;

  } catch (error) {
    console.error("View detection error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`视图检测失败: ${errorMessage}`);
  }
};

export const listAvailableModels = async (): Promise<{ name: string }[]> => {
  return [{ name: MODEL_ID }];
};
