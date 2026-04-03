"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { McpServerConfig, McpServerStatus } from "@/lib/types";

const POLL_INTERVAL_MS = 3000;

export function useMcpConnection(serverIds: string[]) {
  const [statusMap, setStatusMap] = useState<Record<string, McpServerStatus>>(
    {},
  );
  const [isPolling, setIsPolling] = useState(false);
  const idsRef = useRef(serverIds);
  idsRef.current = serverIds;

  const fetchStatuses = useCallback(async (ids: string[]) => {
    if (ids.length === 0) return;
    try {
      const res = await fetch(
        `/api/mcp/status?ids=${encodeURIComponent(ids.join(","))}`,
      );
      if (!res.ok) return;
      const data = (await res.json()) as { statuses: McpServerStatus[] };
      const next: Record<string, McpServerStatus> = {};
      for (const s of data.statuses) {
        next[s.id] = s;
      }
      setStatusMap(next);
    } catch {
      /* network error — keep stale state */
    }
  }, []);

  useEffect(() => {
    if (serverIds.length === 0) {
      setIsPolling(false);
      return;
    }

    setIsPolling(true);
    fetchStatuses(serverIds);

    const timer = setInterval(() => {
      fetchStatuses(idsRef.current);
    }, POLL_INTERVAL_MS);

    return () => {
      clearInterval(timer);
      setIsPolling(false);
    };
  }, [serverIds.join(","), fetchStatuses]);

  const connect = useCallback(
    async (config: McpServerConfig) => {
      setStatusMap((prev) => ({
        ...prev,
        [config.id]: { id: config.id, status: "connecting" },
      }));

      try {
        const res = await fetch("/api/mcp/connect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(config),
        });
        const result = (await res.json()) as McpServerStatus;
        setStatusMap((prev) => ({ ...prev, [config.id]: result }));
      } catch {
        setStatusMap((prev) => ({
          ...prev,
          [config.id]: {
            id: config.id,
            status: "error",
            error: "연결에 실패했습니다.",
          },
        }));
      }
    },
    [],
  );

  const disconnect = useCallback(async (id: string) => {
    try {
      await fetch("/api/mcp/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      setStatusMap((prev) => ({
        ...prev,
        [id]: { id, status: "disconnected" },
      }));
    } catch {
      /* keep stale state */
    }
  }, []);

  return { statusMap, connect, disconnect, isPolling };
}
