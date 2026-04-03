"use client";

import Link from "next/link";
import { Wrench, Server, Settings } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  PopoverHeader,
  PopoverTitle,
} from "@/components/ui/popover";
import type { McpAvailableTool } from "@/lib/types";

interface McpToolsToggleProps {
  tools: McpAvailableTool[];
  enabledServerIds: string[];
  onToggleServer: (serverId: string) => void;
  isLoading: boolean;
}

interface ServerGroup {
  serverId: string;
  serverName: string;
  toolCount: number;
}

function groupByServer(tools: McpAvailableTool[]): ServerGroup[] {
  const map = new Map<string, ServerGroup>();
  for (const t of tools) {
    const existing = map.get(t.serverId);
    if (existing) {
      existing.toolCount += 1;
    } else {
      map.set(t.serverId, {
        serverId: t.serverId,
        serverName: t.serverName,
        toolCount: 1,
      });
    }
  }
  return Array.from(map.values());
}

export function McpToolsToggle({
  tools,
  enabledServerIds,
  onToggleServer,
  isLoading,
}: McpToolsToggleProps) {
  const servers = groupByServer(tools);
  const enabledToolCount = tools.filter((t) =>
    enabledServerIds.includes(t.serverId),
  ).length;

  return (
    <Popover>
      <PopoverTrigger
        className="relative flex size-10 shrink-0 items-center justify-center rounded-xl border border-foreground/15 text-foreground/60 transition-colors hover:bg-foreground/[0.06] hover:text-foreground"
        aria-label="MCP 도구 설정"
      >
        <Wrench className="size-4" />
        {enabledToolCount > 0 && (
          <Badge
            variant="default"
            className="absolute -right-1.5 -top-1.5 flex size-4 items-center justify-center rounded-full p-0 text-[9px]"
          >
            {enabledToolCount}
          </Badge>
        )}
      </PopoverTrigger>

      <PopoverContent side="top" align="start" sideOffset={8} className="w-64">
        <PopoverHeader>
          <PopoverTitle>MCP 도구</PopoverTitle>
        </PopoverHeader>

        {isLoading && (
          <p className="text-xs text-muted-foreground">로딩 중...</p>
        )}

        {!isLoading && servers.length === 0 && (
          <div className="space-y-2 text-center">
            <p className="text-xs text-muted-foreground">
              연결된 MCP 서버가 없습니다.
            </p>
            <Link
              href="/settings/mcp"
              className="inline-flex items-center gap-1 text-xs text-blue-500 hover:underline"
            >
              <Settings className="size-3" />
              서버 설정
            </Link>
          </div>
        )}

        {servers.length > 0 && (
          <div className="space-y-1">
            {servers.map((server) => {
              const isEnabled = enabledServerIds.includes(server.serverId);
              return (
                <button
                  key={server.serverId}
                  type="button"
                  onClick={() => onToggleServer(server.serverId)}
                  className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors ${
                    isEnabled
                      ? "bg-blue-500/10 text-blue-600"
                      : "text-foreground/60 hover:bg-foreground/[0.06]"
                  }`}
                >
                  <Server className="size-3.5 shrink-0" />
                  <span className="min-w-0 flex-1 truncate">
                    {server.serverName}
                  </span>
                  <Badge
                    variant={isEnabled ? "default" : "outline"}
                    className="text-[10px]"
                  >
                    {server.toolCount} tools
                  </Badge>
                </button>
              );
            })}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
