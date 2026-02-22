import { GoogleGenAI, Type } from "@google/genai";
import { AIAnalysisResponse, PartType } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeDrawing = async (data: string, mimeType: string): Promise<AIAnalysisResponse> => {
  try {
    // We use gemini-3-flash-preview for its robust multimodal (Vision) capabilities and JSON schema support.
    const modelId = "gemini-3-flash-preview";
    
    let parts: any[] = [];

    const systemPrompt = `
      You are an expert Sheet Metal Engineer. Your job is to analyze technical drawings of electrical cabinet parts.
      
      1. Identify the type of part (Flat Panel, L-Bracket, U-Channel, or Box Panel). 
      2. Extract the key dimensions in millimeters (mm).
      3. If specific text labels for dimensions are visible, prioritize them.
      4. If dimensions are missing, estimate reasonable standard values for an electrical cabinet.
      
      Part Types Definitions:
      - Flat Panel: No bends, just a plate.
      - L-Bracket: One 90-degree bend.
      - U-Channel: Two 90-degree bends in same direction.
      - Box Panel: A flat face with 4 flanges bent up (like a shoe box lid).

      Return the data in JSON format matching the schema.
    `;

    if (mimeType === 'application/dxf') {
      // Handle DXF as text prompt
      parts = [
        { text: systemPrompt },
        { text: "Here is the DXF file content (AutoCAD Drawing Interchange Format). Analyze the geometry and text entities to extract dimensions:\n\n" + data }
      ];
    } else {
      // Handle Image/PDF as inline data
      parts = [
        { inlineData: { mimeType: mimeType, data: data } },
        { text: systemPrompt }
      ];
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
            }
          },
          required: ["identifiedType", "confidence", "reasoning", "extractedParams"]
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