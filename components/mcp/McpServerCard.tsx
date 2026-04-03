"use client";

import { Pencil, Trash2, Globe, Terminal, Plug, Unplug, ChevronDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { McpServerConfig, McpServerStatus } from "@/lib/types";

interface McpServerCardProps {
  server: McpServerConfig;
  status: McpServerStatus;
  expanded: boolean;
  onEdit: (server: McpServerConfig) => void;
  onDelete: (id: string) => void;
  onConnect: (config: McpServerConfig) => void;
  onDisconnect: (id: string) => void;
  onToggleExpand: (id: string) => void;
}

const STATUS_CONFIG = {
  disconnected: { dot: "bg-muted-foreground/40", label: "연결 해제" },
  connecting: { dot: "bg-yellow-500 animate-pulse", label: "연결 중..." },
  connected: { dot: "bg-green-500", label: "연결됨" },
  error: { dot: "bg-destructive", label: "오류" },
} as const;

export function McpServerCard({
  server,
  status,
  expanded,
  onEdit,
  onDelete,
  onConnect,
  onDisconnect,
  onToggleExpand,
}: McpServerCardProps) {
  const isHttp = server.transport === "streamable-http";
  const connStatus = status.status;
  const cfg = STATUS_CONFIG[connStatus];
  const isConnected = connStatus === "connected";
  const isConnecting = connStatus === "connecting";

  return (
    <Card size="sm">
      <CardContent className="flex flex-col gap-0">
        <div className="flex items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
            {isHttp ? (
              <Globe className="size-4 text-muted-foreground" />
            ) : (
              <Terminal className="size-4 text-muted-foreground" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-medium">{server.name}</span>
              <Badge variant="outline" className="shrink-0 text-[10px]">
                {isHttp ? "HTTP" : "stdio"}
              </Badge>
              <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <span className={cn("inline-block size-1.5 rounded-full", cfg.dot)} />
                {cfg.label}
              </span>
            </div>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {isHttp ? server.url : server.command}
              {status.error && connStatus === "error" && (
                <span className="ml-1 text-destructive">— {status.error}</span>
              )}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            {isConnected ? (
              <Button
                variant="outline"
                size="xs"
                onClick={() => onDisconnect(server.id)}
                aria-label={`${server.name} 연결 해제`}
              >
                <Unplug className="size-3" />
                해제
              </Button>
            ) : (
              <Button
                variant="default"
                size="xs"
                onClick={() => onConnect(server)}
                disabled={isConnecting}
                aria-label={`${server.name} 연결`}
              >
                <Plug className="size-3" />
                연결
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => onEdit(server)}
              aria-label={`${server.name} 편집`}
            >
              <Pencil />
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => onDelete(server.id)}
              aria-label={`${server.name} 삭제`}
            >
              <Trash2 className="text-destructive" />
            </Button>
            {isConnected && (
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => onToggleExpand(server.id)}
                aria-label="Capabilities 펼치기"
              >
                <ChevronDown
                  className={cn(
                    "size-4 transition-transform",
                    expanded && "rotate-180",
                  )}
                />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
