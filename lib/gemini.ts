import { GoogleGenAI } from "@google/genai";

let geminiClient: GoogleGenAI | null = null;

export function getGeminiModelName() {
  return process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";
}

export function getGeminiClient() {
  if (!process.env.GEMINI_API_KEY) {
    return null;
  }

  geminiClient ??= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  return geminiClient;
}
