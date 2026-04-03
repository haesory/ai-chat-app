"use client";

import { useState, useCallback, useEffect } from "react";
import type { McpAvailableTool } from "@/lib/types";

export function useMcpTools() {
  const [tools, setTools] = useState<McpAvailableTool[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/mcp/tools");
      if (!res.ok) return;
      const data = (await res.json()) as { tools: McpAvailableTool[] };
      setTools(data.tools);
    } catch {
      /* best effort */
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(refresh, 2000);
    return () => clearTimeout(timer);
  }, [refresh]);

  return { tools, isLoading, refresh };
}
