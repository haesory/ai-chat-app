"use client";

import { useCallback } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { STORAGE_KEYS } from "@/lib/storage-keys";
import type { McpServerConfig } from "@/lib/types";

export function useMcpServers() {
  const [servers, setServers] = useLocalStorage<McpServerConfig[]>(
    STORAGE_KEYS.MCP_SERVERS,
    [],
  );

  const addServer = useCallback(
    (server: Omit<McpServerConfig, "id" | "createdAt" | "updatedAt">) => {
      const now = Date.now();
      const newServer: McpServerConfig = {
        ...server,
        id: crypto.randomUUID(),
        createdAt: now,
        updatedAt: now,
      };
      setServers((prev) => [...prev, newServer]);
      return newServer.id;
    },
    [setServers],
  );

  const updateServer = useCallback(
    (
      id: string,
      updates: Partial<Omit<McpServerConfig, "id" | "createdAt">>,
    ) => {
      setServers((prev) =>
        prev.map((s) =>
          s.id === id ? { ...s, ...updates, updatedAt: Date.now() } : s,
        ),
      );
    },
    [setServers],
  );

  const deleteServer = useCallback(
    (id: string) => {
      setServers((prev) => prev.filter((s) => s.id !== id));
    },
    [setServers],
  );

  const toggleServer = useCallback(
    (id: string) => {
      setServers((prev) =>
        prev.map((s) =>
          s.id === id
            ? { ...s, enabled: !s.enabled, updatedAt: Date.now() }
            : s,
        ),
      );
    },
    [setServers],
  );

  return { servers, addServer, updateServer, deleteServer, toggleServer };
}
