"use client";

import { useEffect, useRef } from "react";
import { supabase, rowToMcpServer } from "@/lib/supabase";

export function McpAutoConnect() {
  const didRun = useRef(false);

  useEffect(() => {
    if (didRun.current) return;
    didRun.current = true;

    supabase
      .from("mcp_servers")
      .select("*")
      .eq("enabled", true)
      .then(({ data }) => {
        if (!data || data.length === 0) return;
        const enabled = data.map(rowToMcpServer);
        fetch("/api/mcp/auto-connect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ servers: enabled }),
        }).catch(() => {
          /* best effort */
        });
      });
  }, []);

  return null;
}
