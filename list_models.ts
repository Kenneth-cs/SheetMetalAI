import { GoogleGenAI } from "@google/genai";
import fs from "fs";
import path from "path";

// Load .env manually
try {
  const envPath = path.resolve(process.cwd(), ".env");
  if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, "utf8");
    envConfig.split("\n").forEach((line) => {
      const [key, value] = line.split("=");
      if (key && value) {
        process.env[key.trim()] = value.trim();
      }
    });
  }
} catch (e) {
  console.error("Error loading .env", e);
}

async function listModels() {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("GEMINI_API_KEY not found in .env");
      return;
    }
    console.log("Initializing SDK with key length:", apiKey.length);
    
    const ai = new GoogleGenAI({ apiKey });
    
    console.log("Listing models...");
    // The new SDK method for listing models:
    // It seems to be `ai.models.list()` based on recent docs for @google/genai
    // Note: If this fails, we might need to check the exact method signature.
    
    const response = await ai.models.list(); 
    
    console.log("Available models:");
    // The response might be an async iterable or contain a 'models' array.
    // Let's inspect it.
    if (response && typeof response === 'object') {
        if (Array.isArray(response)) {
            response.forEach(m => console.log(`- ${m.name}`));
        } else if ('models' in response && Array.isArray(response.models)) {
            response.models.forEach((m: any) => console.log(`- ${m.name}`));
        } else {
             // It might be an async iterable
             try {
                 for await (const model of response) {
                     console.log(`- ${model.name}`);
                 }
             } catch (e) {
                 console.log("Response is not iterable:", response);
             }
        }
    } else {
        console.log("Unexpected response format:", response);
    }
    
  } catch (error: any) {
    console.error("Error listing models:", error.message);
    if (error.status) console.error("Status:", error.status);
    if (error.body) console.error("Body:", error.body);
  }
}

listModels();
