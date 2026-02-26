import { GoogleGenAI, Type } from "@google/genai";
import { AIAnalysisResponse, PartType } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeDrawing = async (files: { data: string, mimeType: string }[]): Promise<AIAnalysisResponse> => {
  try {
    // We use gemini-3-flash-preview for its robust multimodal (Vision) capabilities and JSON schema support.
    const modelId = "gemini-3-flash-preview";
    
    let parts: any[] = [];

    const systemPrompt = `
      You are an expert Sheet Metal Engineer. Your job is to analyze technical drawings of electrical cabinet parts.
      
      You may be provided with one or more images/files. These could be:
      1. Multiple views of the SAME part (e.g., Front, Top, Side, Isometric).
      2. A single drawing sheet containing multiple views.
      
      Your task:
      1. Synthesize information from ALL provided views to understand the 3D geometry of the part.
      2. Identify the type of part (Flat Panel, L-Bracket, U-Channel, or Box Panel).
      3. If the component is complex (e.g., an assembly or a part with multiple features), identify the MAIN sheet metal body.
      4. Extract the key dimensions in millimeters (mm).
      5. If specific text labels for dimensions are visible, prioritize them.
      6. If dimensions are missing in one view, look for them in others.
      7. If dimensions are still missing, estimate reasonable standard values.
      
      Part Types Definitions:
      - Flat Panel: No bends, just a plate.
      - L-Bracket: One 90-degree bend.
      - U-Channel: Two 90-degree bends in same direction.
      - Box Panel: A flat face with 4 flanges bent up (like a shoe box lid).

      Additionally, provide professional fabrication advice for a hardware factory worker:
      1. Cutting Steps: How to cut the blank (e.g., laser cut profile, notch corners). Mention specific needs like "double cut" for thick materials if needed.
      2. Bending Sequence: The order of bends (e.g., "Bend short flanges first, then long sides").
      3. Technical Tips: Advice on tooling, k-factor adjustments, or handling (e.g., "Watch for collision with back gauge").

      Return the data in JSON format matching the schema.
    `;

    // Add system prompt first
    parts.push({ text: systemPrompt });

    // Add all file parts
    for (const file of files) {
      if (file.mimeType === 'application/dxf') {
        let dxfContent = file.data;
        // Limit DXF content to ~100k tokens (approx 400k chars) to be safe and efficient
        // The error limit is 1M tokens, but we want to leave room for response and other parts
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

    const response = await ai.models.generateContent({
      model: modelId,
      contents: {
        parts: parts
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            identifiedType: {
              type: Type.STRING,
              enum: [
                PartType.FLAT_PANEL,
                PartType.L_BRACKET,
                PartType.U_CHANNEL,
                PartType.BOX_PANEL,
                PartType.UNKNOWN
              ]
            },
            confidence: { type: Type.NUMBER, description: "Confidence score 0-1" },
            reasoning: { type: Type.STRING, description: "Why you chose this type and dimensions" },
            extractedParams: {
              type: Type.OBJECT,
              properties: {
                width: { type: Type.NUMBER, description: "Main width in mm" },
                height: { type: Type.NUMBER, description: "Main height in mm" },
                depth: { type: Type.NUMBER, description: "Depth or height of bend in mm (for Box/U-channel)" },
                flangeLength: { type: Type.NUMBER, description: "Length of the flange for L-brackets" },
                materialThickness: { type: Type.NUMBER, description: "Thickness of sheet in mm" },
                bendRadius: { type: Type.NUMBER, description: "Internal bend radius in mm" }
              }
            },
            fabricationAdvice: {
              type: Type.OBJECT,
              properties: {
                cuttingSteps: { 
                  type: Type.ARRAY, 
                  items: { type: Type.STRING },
                  description: "Step-by-step cutting instructions"
                },
                bendingSequence: { 
                  type: Type.ARRAY, 
                  items: { type: Type.STRING },
                  description: "Ordered list of bends to perform"
                },
                technicalTips: { 
                  type: Type.ARRAY, 
                  items: { type: Type.STRING },
                  description: "Expert tips for the operator"
                }
              },
              required: ["cuttingSteps", "bendingSequence", "technicalTips"]
            }
          },
          required: ["identifiedType", "confidence", "reasoning", "extractedParams", "fabricationAdvice"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    
    // Clean potential markdown wrapping
    const cleanText = text.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    
    return JSON.parse(cleanText) as AIAnalysisResponse;

  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    // Unmask the real error message for better debugging
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`AI Analysis Failed: ${errorMessage}`);
  }
};