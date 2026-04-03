"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { mapError, type AppError } from "@/lib/errors";
import type { ChatMessage, ToolCallInfo, McpContentPart } from "@/lib/types";

interface SSEToolCall {
  id: string;
  name: string;
  serverId: string;
  serverName: string;
  arguments: Record<string, unknown>;
}

interface SSEToolResult {
  callId: string;
  content: McpContentPart[];
  isError?: boolean;
}

interface SSEDataChunk {
  text?: string;
  error?: AppError;
  toolCall?: SSEToolCall;
  toolResult?: SSEToolResult;
}

function parseSSELines(raw: string): SSEDataChunk[] {
  const chunks: SSEDataChunk[] = [];
  const lines = raw.split("\n");
  for (const line of lines) {
    if (!line.startsWith("data: ")) continue;
    const payload = line.slice(6).trim();
    if (payload === "[DONE]") continue;
    try {
      chunks.push(JSON.parse(payload) as SSEDataChunk);
    } catch {
      // skip malformed lines
    }
  }
  return chunks;
}

export function useChatStream() {
  const [tokens, setTokens] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<AppError | null>(null);
  const [toolCalls, setToolCalls] = useState<ToolCallInfo[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const send = useCallback(
    async (
      messages: ChatMessage[],
      enabledServerIds?: string[],
    ): Promise<{ text: string; toolCalls: ToolCallInfo[] }> => {
      abortRef.current?.abort();
      abortRef.current = new AbortController();
      setTokens("");
      setIsStreaming(true);
      setError(null);
      setToolCalls([]);

      const pendingCalls = new Map<string, ToolCallInfo>();

      try {
        const res = await fetch("/api/chat/stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages, enabledServerIds }),
          signal: abortRef.current.signal,
        });

        if (!res.ok) {
          const errorBody = await res.json().catch(() => ({}));
          setError({
            code: errorBody.code ?? "SERVER_ERROR",
            message: errorBody.message ?? `HTTP ${res.status}`,
            retryable: res.status >= 500,
          });
          setIsStreaming(false);
          return { text: "", toolCalls: [] };
        }

        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let accumulated = "";
        const completedCalls: ToolCallInfo[] = [];

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const raw = decoder.decode(value, { stream: true });
          const chunks = parseSSELines(raw);

          for (const chunk of chunks) {
            if (chunk.error) {
              setError(chunk.error);
              setIsStreaming(false);
              return {
                text: accumulated,
                toolCalls: completedCalls,
              };
            }

            if (chunk.toolCall) {
              const tc: ToolCallInfo = {
                id: chunk.toolCall.id,
                toolName: chunk.toolCall.name,
                serverId: chunk.toolCall.serverId,
                serverName: chunk.toolCall.serverName,
                arguments: chunk.toolCall.arguments,
              };
              pendingCalls.set(tc.id, tc);
              completedCalls.push(tc);
              setToolCalls([...completedCalls]);
            }

            if (chunk.toolResult) {
              const existing = pendingCalls.get(chunk.toolResult.callId);
              if (existing) {
                existing.result = {
                  content: chunk.toolResult.content,
                  isError: chunk.toolResult.isError,
                };
                setToolCalls([...completedCalls]);
              }
            }

            if (chunk.text) {
              accumulated += chunk.text;
              setTokens(accumulated);
            }
          }
        }

        return { text: accumulated, toolCalls: completedCalls };
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setError(mapError(err));
        }
        return { text: "", toolCalls: [] };
      } finally {
        setIsStreaming(false);
      }
    },
    [],
  );

  const cancel = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return { tokens, isStreaming, error, toolCalls, send, cancel };
}
