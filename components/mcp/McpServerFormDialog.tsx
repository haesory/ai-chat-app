"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import type { McpServerConfig, McpTransportType } from "@/lib/types";

interface McpServerFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingServer: McpServerConfig | null;
  onSave: (
    data: Omit<McpServerConfig, "id" | "createdAt" | "updatedAt">,
  ) => void;
  onUpdate: (
    id: string,
    data: Partial<Omit<McpServerConfig, "id" | "createdAt">>,
  ) => void;
}

interface KeyValuePair {
  key: string;
  value: string;
}

function toKeyValuePairs(record?: Record<string, string>): KeyValuePair[] {
  if (!record || Object.keys(record).length === 0) return [];
  return Object.entries(record).map(([key, value]) => ({ key, value }));
}

function toRecord(pairs: KeyValuePair[]): Record<string, string> | undefined {
  const filtered = pairs.filter((p) => p.key.trim() !== "");
  if (filtered.length === 0) return undefined;
  return Object.fromEntries(filtered.map((p) => [p.key.trim(), p.value]));
}

const INITIAL_TRANSPORT: McpTransportType = "streamable-http";

export function McpServerFormDialog({
  open,
  onOpenChange,
  editingServer,
  onSave,
  onUpdate,
}: McpServerFormDialogProps) {
  const [name, setName] = useState("");
  const [transport, setTransport] = useState<McpTransportType>(INITIAL_TRANSPORT);
  const [url, setUrl] = useState("");
  const [headers, setHeaders] = useState<KeyValuePair[]>([]);
  const [command, setCommand] = useState("");
  const [args, setArgs] = useState("");
  const [envVars, setEnvVars] = useState<KeyValuePair[]>([]);

  useEffect(() => {
    if (!open) return;
    if (editingServer) {
      setName(editingServer.name);
      setTransport(editingServer.transport);
      setUrl(editingServer.url ?? "");
      setHeaders(toKeyValuePairs(editingServer.headers));
      setCommand(editingServer.command ?? "");
      setArgs(editingServer.args?.join(", ") ?? "");
      setEnvVars(toKeyValuePairs(editingServer.env));
    } else {
      setName("");
      setTransport(INITIAL_TRANSPORT);
      setUrl("");
      setHeaders([]);
      setCommand("");
      setArgs("");
      setEnvVars([]);
    }
  }, [open, editingServer]);

  const isValid =
    name.trim() !== "" &&
    (transport === "streamable-http"
      ? url.trim() !== ""
      : command.trim() !== "");

  const handleSubmit = useCallback(() => {
    if (!isValid) return;

    const parsedArgs = args
      .split(",")
      .map((a) => a.trim())
      .filter(Boolean);

    const data = {
      name: name.trim(),
      transport,
      enabled: editingServer?.enabled ?? true,
      ...(transport === "streamable-http"
        ? { url: url.trim(), headers: toRecord(headers) }
        : {
            command: command.trim(),
            args: parsedArgs.length > 0 ? parsedArgs : undefined,
            env: toRecord(envVars),
          }),
    };

    if (editingServer) {
      onUpdate(editingServer.id, data);
    } else {
      onSave(data);
    }
    onOpenChange(false);
  }, [
    isValid,
    name,
    transport,
    url,
    headers,
    command,
    args,
    envVars,
    editingServer,
    onSave,
    onUpdate,
    onOpenChange,
  ]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editingServer ? "MCP 서버 편집" : "MCP 서버 추가"}
          </DialogTitle>
          <DialogDescription>
            MCP 서버 연결 정보를 입력하세요.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="server-name">이름</Label>
            <Input
              id="server-name"
              placeholder="My MCP Server"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>전송 방식</Label>
            <div className="flex gap-1">
              <Button
                type="button"
                variant={transport === "streamable-http" ? "default" : "outline"}
                size="sm"
                className="flex-1"
                onClick={() => setTransport("streamable-http")}
              >
                Streamable HTTP
              </Button>
              <Button
                type="button"
                variant={transport === "stdio" ? "default" : "outline"}
                size="sm"
                className="flex-1"
                onClick={() => setTransport("stdio")}
              >
                stdio
              </Button>
            </div>
          </div>

          <Separator />

          {transport === "streamable-http" ? (
            <>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="server-url">URL</Label>
                <Input
                  id="server-url"
                  placeholder="https://example.com/mcp"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                />
              </div>
              <KeyValueEditor
                label="헤더"
                pairs={headers}
                onChange={setHeaders}
                keyPlaceholder="Authorization"
                valuePlaceholder="Bearer token..."
              />
            </>
          ) : (
            <>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="server-command">명령어</Label>
                <Input
                  id="server-command"
                  placeholder="npx"
                  value={command}
                  onChange={(e) => setCommand(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="server-args">인수 (쉼표 구분)</Label>
                <Input
                  id="server-args"
                  placeholder="-y, @modelcontextprotocol/server-everything"
                  value={args}
                  onChange={(e) => setArgs(e.target.value)}
                />
              </div>
              <KeyValueEditor
                label="환경변수"
                pairs={envVars}
                onChange={setEnvVars}
                keyPlaceholder="API_KEY"
                valuePlaceholder="sk-..."
              />
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button onClick={handleSubmit} disabled={!isValid}>
            {editingServer ? "저장" : "추가"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function KeyValueEditor({
  label,
  pairs,
  onChange,
  keyPlaceholder,
  valuePlaceholder,
}: {
  label: string;
  pairs: KeyValuePair[];
  onChange: (pairs: KeyValuePair[]) => void;
  keyPlaceholder: string;
  valuePlaceholder: string;
}) {
  const addPair = () => onChange([...pairs, { key: "", value: "" }]);

  const updatePair = (index: number, field: "key" | "value", val: string) => {
    const next = pairs.map((p, i) =>
      i === index ? { ...p, [field]: val } : p,
    );
    onChange(next);
  };

  const removePair = (index: number) => {
    onChange(pairs.filter((_, i) => i !== index));
  };

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          onClick={addPair}
          aria-label={`${label} 추가`}
        >
          <Plus />
        </Button>
      </div>
      {pairs.length === 0 && (
        <p className="text-xs text-muted-foreground">항목이 없습니다.</p>
      )}
      {pairs.map((pair, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <Input
            className="flex-1"
            placeholder={keyPlaceholder}
            value={pair.key}
            onChange={(e) => updatePair(i, "key", e.target.value)}
            aria-label={`${label} 키 ${i + 1}`}
          />
          <Input
            className="flex-1"
            placeholder={valuePlaceholder}
            value={pair.value}
            onChange={(e) => updatePair(i, "value", e.target.value)}
            aria-label={`${label} 값 ${i + 1}`}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={() => removePair(i)}
            aria-label={`${label} ${i + 1}번 삭제`}
          >
            <X className="text-muted-foreground" />
          </Button>
        </div>
      ))}
    </div>
  );
}
