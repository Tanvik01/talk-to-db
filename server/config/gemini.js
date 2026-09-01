import 'dotenv/config';
import { createGoogleGenerativeAI } from '@ai-sdk/google';

export function getGeminiModel(modelName = 'gemini-2.5-flash') {
    const apiKey = process.env.GEMINI_API_KEY || 
                   process.env.GOOGLE_GENERATIVE_AI_API_KEY || 
                   process.env.GOOGLE_API_KEY ||
                   process.env.VITE_GEMINI_API_KEY;

    if (!apiKey) {
        throw new Error("Google Generative AI API key is missing. Please set GEMINI_API_KEY in server/.env");
    }

    const provider = createGoogleGenerativeAI({
        apiKey: apiKey.trim(),
    });

    return provider(modelName);
}

export default getGeminiModel;
