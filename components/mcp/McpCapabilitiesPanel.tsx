"use client";

import { useState, useCallback } from "react";
import { Wrench, MessageSquare, FileText, Loader2, Play, BookOpen, Download } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { McpInspectorDialog } from "@/components/mcp/McpInspectorDialog";
import type {
  McpCapabilities,
  McpToolInfo,
  McpPromptInfo,
  McpResourceInfo,
} from "@/lib/types";

type InspectorTarget =
  | { type: "tool"; tool: McpToolInfo }
  | { type: "prompt"; prompt: McpPromptInfo }
  | { type: "resource"; resource: McpResourceInfo }
  | null;

interface McpCapabilitiesPanelProps {
  capabilities: McpCapabilities | null;
  isLoading: boolean;
  error: string | null;
  serverId: string;
}

export function McpCapabilitiesPanel({
  capabilities,
  isLoading,
  error,
  serverId,
}: McpCapabilitiesPanelProps) {
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [inspectorTarget, setInspectorTarget] = useState<InspectorTarget>(null);

  const openInspector = useCallback((target: InspectorTarget) => {
    setInspectorTarget(target);
    setInspectorOpen(true);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div role="alert" className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
        {error}
      </div>
    );
  }

  if (!capabilities) return null;

  const { tools, prompts, resources } = capabilities;

  return (
    <>
      <Tabs defaultValue="tools">
        <TabsList variant="line" className="w-full">
          <TabsTrigger value="tools">
            <Wrench className="size-3.5" />
            Tools ({tools.length})
          </TabsTrigger>
          <TabsTrigger value="prompts">
            <MessageSquare className="size-3.5" />
            Prompts ({prompts.length})
          </TabsTrigger>
          <TabsTrigger value="resources">
            <FileText className="size-3.5" />
            Resources ({resources.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tools">
          {tools.length === 0 ? (
            <EmptyState text="이 서버는 Tool을 제공하지 않습니다." />
          ) : (
            <ul className="flex flex-col gap-2 pt-3" aria-label="Tools 목록">
              {tools.map((t) => (
                <li key={t.name} className="rounded-lg border border-border/60 px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">{t.name}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={() => openInspector({ type: "tool", tool: t })}
                    >
                      <Play className="size-3" />
                      실행
                    </Button>
                  </div>
                  {t.description && (
                    <p className="mt-1 text-xs text-muted-foreground">{t.description}</p>
                  )}
                  {t.inputSchema && Object.keys(t.inputSchema).length > 0 && (
                    <pre className="mt-2 max-h-32 overflow-auto rounded bg-muted px-2 py-1.5 font-mono text-[11px] leading-relaxed text-muted-foreground">
                      {JSON.stringify(t.inputSchema, null, 2)}
                    </pre>
                  )}
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="prompts">
          {prompts.length === 0 ? (
            <EmptyState text="이 서버는 Prompt를 제공하지 않습니다." />
          ) : (
            <ul className="flex flex-col gap-2 pt-3" aria-label="Prompts 목록">
              {prompts.map((p) => (
                <li key={p.name} className="rounded-lg border border-border/60 px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">{p.name}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={() => openInspector({ type: "prompt", prompt: p })}
                    >
                      <BookOpen className="size-3" />
                      테스트
                    </Button>
                  </div>
                  {p.description && (
                    <p className="mt-1 text-xs text-muted-foreground">{p.description}</p>
                  )}
                  {p.arguments && p.arguments.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {p.arguments.map((a) => (
                        <Badge key={a.name} variant="outline" className="text-[10px]">
                          {a.name}
                          {a.required && <span className="text-destructive">*</span>}
                        </Badge>
                      ))}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="resources">
          {resources.length === 0 ? (
            <EmptyState text="이 서버는 Resource를 제공하지 않습니다." />
          ) : (
            <ul className="flex flex-col gap-2 pt-3" aria-label="Resources 목록">
              {resources.map((r) => (
                <li key={r.uri} className="rounded-lg border border-border/60 px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{r.name}</span>
                      {r.mimeType && (
                        <Badge variant="outline" className="text-[10px]">
                          {r.mimeType}
                        </Badge>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={() => openInspector({ type: "resource", resource: r })}
                    >
                      <Download className="size-3" />
                      읽기
                    </Button>
                  </div>
                  <p className="mt-0.5 font-mono text-xs text-muted-foreground">{r.uri}</p>
                  {r.description && (
                    <p className="mt-1 text-xs text-muted-foreground">{r.description}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </TabsContent>
      </Tabs>

      <McpInspectorDialog
        open={inspectorOpen}
        onOpenChange={setInspectorOpen}
        serverId={serverId}
        target={inspectorTarget}
      />
    </>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <p className="py-6 text-center text-sm text-muted-foreground">{text}</p>
  );
}
