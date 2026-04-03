"use client";

import { useState, useCallback, useEffect } from "react";
import { supabase, rowToMcpServer } from "@/lib/supabase";
import type { McpServerConfig } from "@/lib/types";

export function useMcpServers() {
  const [servers, setServers] = useState<McpServerConfig[]>([]);

  // Load from Supabase on mount
  useEffect(() => {
    let cancelled = false;

    supabase
      .from("mcp_servers")
      .select("*")
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        if (!cancelled && data) {
          setServers(data.map(rowToMcpServer));
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const addServer = useCallback(
    async (server: Omit<McpServerConfig, "id" | "createdAt" | "updatedAt">) => {
      const now = Date.now();
      const id = crypto.randomUUID();

      const row = {
        id,
        name: server.name,
        transport: server.transport,
        enabled: server.enabled,
        url: server.url ?? null,
        headers: server.headers ?? null,
        command: server.command ?? null,
        args: server.args ?? null,
        env: server.env ?? null,
        created_at: now,
        updated_at: now,
      };

      // Optimistic update
      const newServer: McpServerConfig = { ...server, id, createdAt: now, updatedAt: now };
      setServers((prev) => [...prev, newServer]);

      await supabase.from("mcp_servers").insert(row);
      return id;
    },
    [],
  );

  const updateServer = useCallback(
    async (
      id: string,
      updates: Partial<Omit<McpServerConfig, "id" | "createdAt">>,
    ) => {
      const now = Date.now();

      // Optimistic update
      setServers((prev) =>
        prev.map((s) =>
          s.id === id ? { ...s, ...updates, updatedAt: now } : s,
        ),
      );

      const dbUpdates: Record<string, unknown> = { updated_at: now };
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.transport !== undefined) dbUpdates.transport = updates.transport;
      if (updates.enabled !== undefined) dbUpdates.enabled = updates.enabled;
      if (updates.url !== undefined) dbUpdates.url = updates.url;
      if (updates.headers !== undefined) dbUpdates.headers = updates.headers;
      if (updates.command !== undefined) dbUpdates.command = updates.command;
      if (updates.args !== undefined) dbUpdates.args = updates.args;
      if (updates.env !== undefined) dbUpdates.env = updates.env;

      await supabase.from("mcp_servers").update(dbUpdates).eq("id", id);
    },
    [],
  );

  const deleteServer = useCallback(async (id: string) => {
    // Optimistic update
    setServers((prev) => prev.filter((s) => s.id !== id));
    await supabase.from("mcp_servers").delete().eq("id", id);
  }, []);

  const toggleServer = useCallback(async (id: string) => {
    const now = Date.now();

    // Optimistic update
    let nextEnabled = false;
    setServers((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        nextEnabled = !s.enabled;
        return { ...s, enabled: nextEnabled, updatedAt: now };
      }),
    );

    await supabase
      .from("mcp_servers")
      .update({ enabled: nextEnabled, updated_at: now })
      .eq("id", id);
  }, []);

  return { servers, addServer, updateServer, deleteServer, toggleServer };
}
