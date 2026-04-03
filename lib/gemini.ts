import "server-only";

import { GoogleGenAI, type Content } from "@google/genai";
import type { ChatMessage } from "./types";

function getClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not set.");
  }
  return new GoogleGenAI({ apiKey });
}

function toGeminiContents(messages: ChatMessage[]): Content[] {
  return messages.map((msg) => ({
    role: msg.role === "user" ? "user" : "model",
    parts: [{ text: msg.content }],
  }));
}

export async function* streamChat(
  messages: ChatMessage[],
  signal: AbortSignal,
): AsyncGenerator<string> {
  const model = process.env.LLM_MODEL ?? "gemini-2.5-flash-lite";
  const contents = toGeminiContents(messages);

  const ai = getClient();
  const response = await ai.models.generateContentStream({
    model,
    contents,
  });

  for await (const chunk of response) {
    if (signal.aborted) return;
    if (chunk.text) {
      yield chunk.text;
    }
  }
}
