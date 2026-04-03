"use client";

import { useEffect, useRef } from "react";
import { STORAGE_KEYS } from "@/lib/storage-keys";
import type { McpServerConfig } from "@/lib/types";

function readServers(): McpServerConfig[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.MCP_SERVERS);
    return raw ? (JSON.parse(raw) as McpServerConfig[]) : [];
  } catch {
    return [];
  }
}

export function McpAutoConnect() {
  const didRun = useRef(false);

  useEffect(() => {
    if (didRun.current) return;
    didRun.current = true;

    const enabled = readServers().filter((s) => s.enabled);
    if (enabled.length === 0) return;

    fetch("/api/mcp/auto-connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ servers: enabled }),
    }).catch(() => {
      /* best effort */
    });
  }, []);

  return null;
}
