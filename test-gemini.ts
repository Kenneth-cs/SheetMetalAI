import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function listModels() {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    // The new SDK might have a different way to list models.
    // If it's @google/generative-ai, it's different.
    // Let's assume the current code structure is correct for the installed package.
    // But I don't see listModels on GoogleGenAI instance usually.
    // It's usually on a specific client or via API.
    
    // Let's try to just run a simple generation with a known model to test connectivity.
    console.log("Testing Gemini 1.5 Flash...");
    const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent("Hello, are you there?");
    console.log("Response:", result.response.text());
  } catch (error) {
    console.error("Error:", error);
  }
}

listModels();
