"use client";

import { useState, useEffect, useCallback } from "react";
import type { McpCapabilities } from "@/lib/types";

export function useMcpCapabilities(serverId: string | null) {
  const [capabilities, setCapabilities] = useState<McpCapabilities | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCapabilities = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/mcp/${encodeURIComponent(id)}/capabilities`);
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          message?: string;
        } | null;
        throw new Error(body?.message ?? "Failed to fetch capabilities");
      }
      const data = (await res.json()) as McpCapabilities;
      setCapabilities(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setCapabilities(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!serverId) {
      setCapabilities(null);
      setError(null);
      return;
    }
    fetchCapabilities(serverId);
  }, [serverId, fetchCapabilities]);

  const refresh = useCallback(() => {
    if (serverId) fetchCapabilities(serverId);
  }, [serverId, fetchCapabilities]);

  return { capabilities, isLoading, error, refresh };
}
