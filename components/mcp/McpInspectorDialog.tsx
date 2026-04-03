"use client";

import { useState, useEffect } from "react";
import { Loader2, Play, BookOpen, Download } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useMcpInspector } from "@/hooks/useMcpInspector";
import type {
  McpToolInfo,
  McpPromptInfo,
  McpResourceInfo,
  McpToolCallResult,
  McpPromptGetResult,
  McpResourceReadResult,
} from "@/lib/types";

type InspectorTarget =
  | { type: "tool"; tool: McpToolInfo }
  | { type: "prompt"; prompt: McpPromptInfo }
  | { type: "resource"; resource: McpResourceInfo }
  | null;

interface McpInspectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serverId: string;
  target: InspectorTarget;
}

export function McpInspectorDialog({
  open,
  onOpenChange,
  serverId,
  target,
}: McpInspectorDialogProps) {
  const { result, isLoading, error, callTool, getPrompt, readResource, clear } =
    useMcpInspector(serverId);

  useEffect(() => {
    if (!open) clear();
  }, [open, clear]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{getTitle(target)}</DialogTitle>
          <DialogDescription>{getDescription(target)}</DialogDescription>
        </DialogHeader>

        {target?.type === "tool" && (
          <ToolInspector
            tool={target.tool}
            onExecute={callTool}
            result={result as McpToolCallResult | null}
            isLoading={isLoading}
            error={error}
          />
        )}
        {target?.type === "prompt" && (
          <PromptInspector
            prompt={target.prompt}
            onGet={getPrompt}
            result={result as McpPromptGetResult | null}
            isLoading={isLoading}
            error={error}
          />
        )}
        {target?.type === "resource" && (
          <ResourceInspector
            resource={target.resource}
            onRead={readResource}
            result={result as McpResourceReadResult | null}
            isLoading={isLoading}
            error={error}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function getTitle(target: InspectorTarget): string {
  if (!target) return "Inspector";
  switch (target.type) {
    case "tool":
      return `Tool: ${target.tool.name}`;
    case "prompt":
      return `Prompt: ${target.prompt.name}`;
    case "resource":
      return `Resource: ${target.resource.name}`;
  }
}

function getDescription(target: InspectorTarget): string {
  if (!target) return "";
  switch (target.type) {
    case "tool":
      return target.tool.description ?? "설명 없음";
    case "prompt":
      return target.prompt.description ?? "설명 없음";
    case "resource":
      return target.resource.description ?? target.resource.uri;
  }
}

function ToolInspector({
  tool,
  onExecute,
  result,
  isLoading,
  error,
}: {
  tool: McpToolInfo;
  onExecute: (name: string, args: Record<string, unknown>) => Promise<void>;
  result: McpToolCallResult | null;
  isLoading: boolean;
  error: string | null;
}) {
  const [argsJson, setArgsJson] = useState("{}");
  const [parseError, setParseError] = useState<string | null>(null);

  const handleExecute = () => {
    setParseError(null);
    try {
      const parsed: unknown = JSON.parse(argsJson);
      if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
        setParseError("인자는 JSON 객체여야 합니다.");
        return;
      }
      onExecute(tool.name, parsed as Record<string, unknown>);
    } catch {
      setParseError("유효하지 않은 JSON입니다.");
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {tool.inputSchema && Object.keys(tool.inputSchema).length > 0 && (
        <div>
          <Label className="mb-1.5 text-xs text-muted-foreground">
            Input Schema
          </Label>
          <ScrollArea className="max-h-32 overflow-auto rounded-md border bg-muted/30">
            <pre className="px-3 py-2 font-mono text-[11px] leading-relaxed text-muted-foreground">
              {JSON.stringify(tool.inputSchema, null, 2)}
            </pre>
          </ScrollArea>
        </div>
      )}

      <div>
        <Label htmlFor="tool-args" className="mb-1.5">
          Arguments (JSON)
        </Label>
        <Textarea
          id="tool-args"
          value={argsJson}
          onChange={(e) => setArgsJson(e.target.value)}
          className="font-mono text-xs"
          rows={4}
          aria-invalid={!!parseError}
        />
        {parseError && (
          <p className="mt-1 text-xs text-destructive">{parseError}</p>
        )}
      </div>

      <Button onClick={handleExecute} disabled={isLoading} size="sm">
        {isLoading ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Play className="size-4" />
        )}
        실행
      </Button>

      <ResultDisplay error={error}>
        {result && <ToolResult result={result} />}
      </ResultDisplay>
    </div>
  );
}

function ToolResult({ result }: { result: McpToolCallResult }) {
  return (
    <div className="flex flex-col gap-2">
      {result.isError && (
        <Badge variant="destructive" className="w-fit">
          Error
        </Badge>
      )}
      {result.content.map((part, i) => (
        <ContentPartDisplay key={i} part={part} isError={result.isError} />
      ))}
    </div>
  );
}

function PromptInspector({
  prompt,
  onGet,
  result,
  isLoading,
  error,
}: {
  prompt: McpPromptInfo;
  onGet: (name: string, args: Record<string, string>) => Promise<void>;
  result: McpPromptGetResult | null;
  isLoading: boolean;
  error: string | null;
}) {
  const [args, setArgs] = useState<Record<string, string>>({});

  useEffect(() => {
    if (prompt.arguments) {
      const initial: Record<string, string> = {};
      for (const a of prompt.arguments) {
        initial[a.name] = "";
      }
      setArgs(initial);
    }
  }, [prompt]);

  const handleGet = () => {
    onGet(prompt.name, args);
  };

  return (
    <div className="flex flex-col gap-3">
      {prompt.arguments && prompt.arguments.length > 0 && (
        <div className="flex flex-col gap-2">
          {prompt.arguments.map((a) => (
            <div key={a.name}>
              <Label htmlFor={`prompt-arg-${a.name}`} className="mb-1.5">
                {a.name}
                {a.required && (
                  <span className="ml-0.5 text-destructive">*</span>
                )}
                {a.description && (
                  <span className="ml-2 font-normal text-muted-foreground">
                    {a.description}
                  </span>
                )}
              </Label>
              <Input
                id={`prompt-arg-${a.name}`}
                value={args[a.name] ?? ""}
                onChange={(e) =>
                  setArgs((prev) => ({ ...prev, [a.name]: e.target.value }))
                }
                placeholder={a.description ?? a.name}
              />
            </div>
          ))}
        </div>
      )}

      <Button onClick={handleGet} disabled={isLoading} size="sm">
        {isLoading ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <BookOpen className="size-4" />
        )}
        가져오기
      </Button>

      <ResultDisplay error={error}>
        {result && <PromptResult result={result} />}
      </ResultDisplay>
    </div>
  );
}

function PromptResult({ result }: { result: McpPromptGetResult }) {
  return (
    <div className="flex flex-col gap-2">
      {result.messages.map((msg, i) => (
        <div
          key={i}
          className="rounded-lg border border-border/60 px-3 py-2"
        >
          <Badge variant="outline" className="mb-1.5 text-[10px]">
            {msg.role}
          </Badge>
          <ContentPartDisplay part={msg.content} />
        </div>
      ))}
    </div>
  );
}

function ResourceInspector({
  resource,
  onRead,
  result,
  isLoading,
  error,
}: {
  resource: McpResourceInfo;
  onRead: (uri: string) => Promise<void>;
  result: McpResourceReadResult | null;
  isLoading: boolean;
  error: string | null;
}) {
  const handleRead = () => {
    onRead(resource.uri);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="font-mono text-xs text-muted-foreground">
          {resource.uri}
        </span>
        {resource.mimeType && (
          <Badge variant="outline" className="text-[10px]">
            {resource.mimeType}
          </Badge>
        )}
      </div>

      <Button onClick={handleRead} disabled={isLoading} size="sm">
        {isLoading ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Download className="size-4" />
        )}
        읽기
      </Button>

      <ResultDisplay error={error}>
        {result && <ResourceResult result={result} />}
      </ResultDisplay>
    </div>
  );
}

function ResourceResult({ result }: { result: McpResourceReadResult }) {
  return (
    <div className="flex flex-col gap-2">
      {result.contents.map((c, i) => (
        <div key={i} className="flex flex-col gap-1">
          <span className="font-mono text-[10px] text-muted-foreground">
            {c.uri}
            {c.mimeType && ` (${c.mimeType})`}
          </span>
          {c.text != null ? (
            <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed">
              {c.text}
            </pre>
          ) : c.blob != null ? (
            <p className="text-xs text-muted-foreground">
              바이너리 데이터 ({c.blob.length} bytes base64)
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">내용 없음</p>
          )}
        </div>
      ))}
    </div>
  );
}

function ContentPartDisplay({
  part,
  isError,
}: {
  part: { type: string; text?: string; data?: string; mimeType?: string };
  isError?: boolean;
}) {
  if (part.type === "text" && part.text != null) {
    return (
      <pre
        className={`whitespace-pre-wrap font-mono text-xs leading-relaxed ${
          isError ? "text-destructive" : ""
        }`}
      >
        {part.text}
      </pre>
    );
  }

  if (part.type === "image" && part.data) {
    return (
      <img
        src={`data:${part.mimeType ?? "image/png"};base64,${part.data}`}
        alt="Tool result"
        className="max-h-64 rounded"
      />
    );
  }

  return (
    <pre className="whitespace-pre-wrap font-mono text-[11px] text-muted-foreground">
      {JSON.stringify(part, null, 2)}
    </pre>
  );
}

function ResultDisplay({
  error,
  children,
}: {
  error: string | null;
  children: React.ReactNode;
}) {
  if (!error && !children) return null;

  return (
    <div className="flex flex-col gap-2">
      <Label className="text-xs text-muted-foreground">결과</Label>
      <ScrollArea className="max-h-64 overflow-auto rounded-md border bg-muted/30 p-3">
        {error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : (
          children
        )}
      </ScrollArea>
    </div>
  );
}
