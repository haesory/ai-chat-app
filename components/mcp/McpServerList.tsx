"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { Plus, Server, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMcpServers } from "@/hooks/useMcpServers";
import { useMcpConnection } from "@/hooks/useMcpConnection";
import { useMcpCapabilities } from "@/hooks/useMcpCapabilities";
import { McpServerCard } from "@/components/mcp/McpServerCard";
import { McpServerFormDialog } from "@/components/mcp/McpServerFormDialog";
import { McpCapabilitiesPanel } from "@/components/mcp/McpCapabilitiesPanel";
import type { McpServerConfig } from "@/lib/types";

export function McpServerList() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const { servers, addServer, updateServer, deleteServer } = useMcpServers();

  const serverIds = useMemo(() => servers.map((s) => s.id), [servers]);
  const { statusMap, connect, disconnect } = useMcpConnection(serverIds);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const expandedStatus = expandedId ? statusMap[expandedId] : undefined;
  const capServerId =
    expandedStatus?.status === "connected" ? expandedId : null;
  const { capabilities, isLoading: capLoading, error: capError } =
    useMcpCapabilities(capServerId);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingServer, setEditingServer] = useState<McpServerConfig | null>(
    null,
  );

  const handleAdd = useCallback(() => {
    setEditingServer(null);
    setDialogOpen(true);
  }, []);

  const handleEdit = useCallback((server: McpServerConfig) => {
    setEditingServer(server);
    setDialogOpen(true);
  }, []);

  const handleDelete = useCallback(
    (id: string) => {
      disconnect(id);
      deleteServer(id);
      if (expandedId === id) setExpandedId(null);
    },
    [deleteServer, disconnect, expandedId],
  );

  const handleToggleExpand = useCallback(
    (id: string) => {
      setExpandedId((prev) => (prev === id ? null : id));
    },
    [],
  );

  if (!mounted) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">MCP 서버</h2>
          <p className="text-sm text-muted-foreground">
            연결할 MCP 서버를 관리합니다.
          </p>
        </div>
        <Button size="sm" onClick={handleAdd}>
          <Plus />
          서버 추가
        </Button>
      </div>

      {servers.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-foreground/15 py-12">
          <div className="flex size-12 items-center justify-center rounded-xl bg-muted">
            <Server className="size-6 text-muted-foreground" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium">등록된 서버가 없습니다</p>
            <p className="mt-1 text-xs text-muted-foreground">
              &quot;서버 추가&quot; 버튼을 눌러 MCP 서버를 등록하세요.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {servers.map((server) => {
            const status = statusMap[server.id] ?? {
              id: server.id,
              status: "disconnected" as const,
            };
            const isExpanded = expandedId === server.id;
            return (
              <div key={server.id} className="flex flex-col gap-0">
                <McpServerCard
                  server={server}
                  status={status}
                  expanded={isExpanded}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onConnect={connect}
                  onDisconnect={disconnect}
                  onToggleExpand={handleToggleExpand}
                />
                {isExpanded && status.status === "connected" && (
                  <div className="ml-4 border-l-2 border-border/60 pl-4 pt-2 pb-2">
                    <McpCapabilitiesPanel
                      capabilities={capabilities}
                      isLoading={capLoading}
                      error={capError}
                      serverId={server.id}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <McpServerFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editingServer={editingServer}
        onSave={addServer}
        onUpdate={updateServer}
      />
    </>
  );
}
