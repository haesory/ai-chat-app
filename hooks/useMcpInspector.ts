"use client";

import { useState, useCallback } from "react";
import type {
  McpToolCallResult,
  McpPromptGetResult,
  McpResourceReadResult,
} from "@/lib/types";

type InspectorResult =
  | McpToolCallResult
  | McpPromptGetResult
  | McpResourceReadResult
  | null;

export function useMcpInspector(serverId: string | null) {
  const [result, setResult] = useState<InspectorResult>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const callTool = useCallback(
    async (name: string, args: Record<string, unknown>) => {
      if (!serverId) return;
      setIsLoading(true);
      setError(null);
      setResult(null);
      try {
        const res = await fetch(`/api/mcp/${serverId}/tools/call`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, arguments: args }),
        });
        const data: unknown = await res.json();
        if (!res.ok) {
          const msg =
            typeof data === "object" &&
            data !== null &&
            "message" in data &&
            typeof (data as Record<string, unknown>).message === "string"
              ? (data as { message: string }).message
              : "Tool call failed.";
          setError(msg);
        } else {
          setResult(data as McpToolCallResult);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Network error.");
      } finally {
        setIsLoading(false);
      }
    },
    [serverId],
  );

  const getPrompt = useCallback(
    async (name: string, args: Record<string, string>) => {
      if (!serverId) return;
      setIsLoading(true);
      setError(null);
      setResult(null);
      try {
        const res = await fetch(`/api/mcp/${serverId}/prompts/get`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, arguments: args }),
        });
        const data: unknown = await res.json();
        if (!res.ok) {
          const msg =
            typeof data === "object" &&
            data !== null &&
            "message" in data &&
            typeof (data as Record<string, unknown>).message === "string"
              ? (data as { message: string }).message
              : "Prompt get failed.";
          setError(msg);
        } else {
          setResult(data as McpPromptGetResult);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Network error.");
      } finally {
        setIsLoading(false);
      }
    },
    [serverId],
  );

  const readResource = useCallback(
    async (uri: string) => {
      if (!serverId) return;
      setIsLoading(true);
      setError(null);
      setResult(null);
      try {
        const res = await fetch(`/api/mcp/${serverId}/resources/read`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ uri }),
        });
        const data: unknown = await res.json();
        if (!res.ok) {
          const msg =
            typeof data === "object" &&
            data !== null &&
            "message" in data &&
            typeof (data as Record<string, unknown>).message === "string"
              ? (data as { message: string }).message
              : "Resource read failed.";
          setError(msg);
        } else {
          setResult(data as McpResourceReadResult);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Network error.");
      } finally {
        setIsLoading(false);
      }
    },
    [serverId],
  );

  const clear = useCallback(() => {
    setResult(null);
    setError(null);
    setIsLoading(false);
  }, []);

  return { result, isLoading, error, callTool, getPrompt, readResource, clear };
}
