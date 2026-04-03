"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { mapError, type AppError } from "@/lib/errors";
import type { ChatMessage } from "@/lib/types";

interface SSEDataChunk {
  text?: string;
  error?: AppError;
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
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const send = useCallback(async (messages: ChatMessage[]) => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setTokens("");
    setIsStreaming(true);
    setError(null);

    try {
      const res = await fetch("/api/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages }),
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
        return "";
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const raw = decoder.decode(value, { stream: true });
        const chunks = parseSSELines(raw);

        for (const chunk of chunks) {
          if (chunk.error) {
            setError(chunk.error);
            setIsStreaming(false);
            return accumulated;
          }
          if (chunk.text) {
            accumulated += chunk.text;
            setTokens(accumulated);
          }
        }
      }

      return accumulated;
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setError(mapError(err));
      }
      return "";
    } finally {
      setIsStreaming(false);
    }
  }, []);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return { tokens, isStreaming, error, send, cancel };
}
