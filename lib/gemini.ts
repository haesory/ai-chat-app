import "server-only";

import {
  GoogleGenAI,
  type Content,
  type FunctionDeclaration,
  type FunctionCall,
  type Part,
} from "@google/genai";
import type { ChatMessage } from "./types";

function getClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not set.");
  }
  return new GoogleGenAI({ apiKey });
}

export function toGeminiContents(messages: ChatMessage[]): Content[] {
  return messages.map((msg) => ({
    role: msg.role === "user" ? "user" : "model",
    parts: [{ text: msg.content }],
  }));
}

export function getModelName(): string {
  return process.env.LLM_MODEL ?? "gemini-2.5-flash-lite";
}

function getSystemInstruction(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
  const weekday = weekdays[now.getDay()];
  const hour = now.getHours();
  const minute = String(now.getMinutes()).padStart(2, "0");
  const ampm = hour < 12 ? "오전" : "오후";
  const hour12 = hour % 12 || 12;

  return [
    `현재 날짜: ${year}년 ${month}월 ${day}일 ${weekday}요일`,
    `현재 시각: ${ampm} ${hour12}시 ${minute}분 (${hour}:${minute} KST)`,
    `사용자가 현재 시간이나 날짜를 물으면 위 정보를 기반으로 정확히 답변하세요.`,
  ].join("\n");
}

export async function* streamChat(
  messages: ChatMessage[],
  signal: AbortSignal,
): AsyncGenerator<string> {
  const model = getModelName();
  const contents = toGeminiContents(messages);

  const ai = getClient();
  const response = await ai.models.generateContentStream({
    model,
    contents,
    config: {
      systemInstruction: getSystemInstruction(),
    },
  });

  for await (const chunk of response) {
    if (signal.aborted) return;
    if (chunk.text) {
      yield chunk.text;
    }
  }
}

export interface GenerateWithToolsResult {
  text?: string;
  functionCalls?: FunctionCall[];
}

export async function generateWithTools(
  contents: Content[],
  tools: FunctionDeclaration[],
  signal: AbortSignal,
): Promise<GenerateWithToolsResult> {
  if (signal.aborted) return {};

  const ai = getClient();
  const model = getModelName();

  const response = await ai.models.generateContent({
    model,
    contents,
    config: {
      systemInstruction: getSystemInstruction(),
      tools: tools.length > 0 ? [{ functionDeclarations: tools }] : undefined,
    },
  });

  return {
    text: response.text ?? undefined,
    functionCalls: response.functionCalls ?? undefined,
  };
}

export async function* streamWithTools(
  contents: Content[],
  tools: FunctionDeclaration[],
  signal: AbortSignal,
): AsyncGenerator<string> {
  if (signal.aborted) return;

  const ai = getClient();
  const model = getModelName();

  const response = await ai.models.generateContentStream({
    model,
    contents,
    config: {
      systemInstruction: getSystemInstruction(),
      tools: tools.length > 0 ? [{ functionDeclarations: tools }] : undefined,
    },
  });

  for await (const chunk of response) {
    if (signal.aborted) return;
    if (chunk.text) {
      yield chunk.text;
    }
  }
}

export function buildFunctionResponseParts(
  calls: { name: string; response: Record<string, unknown> }[],
): Part[] {
  return calls.map((c) => ({
    functionResponse: {
      name: c.name,
      response: c.response,
    },
  }));
}

export function buildFunctionCallParts(
  calls: FunctionCall[],
): Part[] {
  return calls.map((fc) => ({
    functionCall: {
      name: fc.name!,
      args: fc.args,
    },
  }));
}
