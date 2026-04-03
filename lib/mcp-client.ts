import "server-only";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type {
  McpServerConfig,
  McpServerStatus,
  McpConnectionStatus,
  McpCapabilities,
  McpToolInfo,
  McpPromptInfo,
  McpResourceInfo,
  McpToolCallResult,
  McpPromptGetResult,
  McpResourceReadResult,
  McpContentPart,
} from "@/lib/types";

interface ManagedMcpClient {
  client: Client;
  name: string;
  status: McpConnectionStatus;
  error?: string;
}

const globalForMcp = globalThis as typeof globalThis & {
  __mcpClients?: Map<string, ManagedMcpClient>;
};

if (!globalForMcp.__mcpClients) {
  globalForMcp.__mcpClients = new Map<string, ManagedMcpClient>();
}

const clients = globalForMcp.__mcpClients;

function createTransport(
  config: McpServerConfig,
): StdioClientTransport | StreamableHTTPClientTransport {
  if (config.transport === "streamable-http") {
    if (!config.url) throw new Error("URL is required for streamable-http");
    const headers: Record<string, string> = { ...config.headers };
    return new StreamableHTTPClientTransport(new URL(config.url), {
      requestInit: Object.keys(headers).length > 0 ? { headers } : undefined,
    });
  }

  if (!config.command) throw new Error("Command is required for stdio");
  return new StdioClientTransport({
    command: config.command,
    args: config.args,
    env: config.env
      ? { ...process.env, ...config.env } as Record<string, string>
      : undefined,
  });
}

export async function connectServer(
  config: McpServerConfig,
): Promise<McpServerStatus> {
  const existing = clients.get(config.id);
  if (existing?.status === "connected") {
    return { id: config.id, status: "connected" };
  }

  if (existing) {
    try { await existing.client.close(); } catch { /* best effort */ }
    clients.delete(config.id);
  }

  const managed: ManagedMcpClient = {
    client: new Client(
      { name: "ai-chat-app", version: "0.1.0" },
    ),
    name: config.name,
    status: "connecting",
  };
  clients.set(config.id, managed);

  managed.client.onerror = (err) => {
    managed.status = "error";
    managed.error = err instanceof Error ? err.message : String(err);
  };

  managed.client.onclose = () => {
    managed.status = "disconnected";
    managed.error = undefined;
  };

  try {
    const transport = createTransport(config);
    await managed.client.connect(transport);
    managed.status = "connected";
    managed.error = undefined;
    return { id: config.id, status: "connected" };
  } catch (err) {
    managed.status = "error";
    managed.error = err instanceof Error ? err.message : String(err);
    return { id: config.id, status: "error", error: managed.error };
  }
}

export async function disconnectServer(id: string): Promise<void> {
  const managed = clients.get(id);
  if (!managed) return;
  try {
    await managed.client.close();
  } catch { /* best effort */ }
  clients.delete(id);
}

export function getStatus(id: string): McpServerStatus {
  const managed = clients.get(id);
  if (!managed) return { id, status: "disconnected" };
  return { id, status: managed.status, error: managed.error };
}

export function getStatuses(ids: string[]): McpServerStatus[] {
  return ids.map(getStatus);
}

export async function getCapabilities(
  id: string,
): Promise<McpCapabilities | null> {
  const managed = clients.get(id);
  if (!managed || managed.status !== "connected") return null;

  const [toolsResult, promptsResult, resourcesResult] = await Promise.all([
    managed.client.listTools().catch(() => ({ tools: [] })),
    managed.client.listPrompts().catch(() => ({ prompts: [] })),
    managed.client.listResources().catch(() => ({ resources: [] })),
  ]);

  const tools: McpToolInfo[] = toolsResult.tools.map((t) => ({
    name: t.name,
    description: t.description,
    inputSchema: t.inputSchema as Record<string, unknown> | undefined,
  }));

  const prompts: McpPromptInfo[] = promptsResult.prompts.map((p) => ({
    name: p.name,
    description: p.description,
    arguments: p.arguments?.map((a) => ({
      name: a.name,
      description: a.description,
      required: a.required,
    })),
  }));

  const resources: McpResourceInfo[] = resourcesResult.resources.map((r) => ({
    uri: r.uri,
    name: r.name,
    description: r.description,
    mimeType: r.mimeType,
  }));

  return { tools, prompts, resources };
}

function getConnectedClient(id: string): Client {
  const managed = clients.get(id);
  if (!managed || managed.status !== "connected") {
    throw new Error("Server is not connected.");
  }
  return managed.client;
}

export async function callTool(
  id: string,
  name: string,
  args: Record<string, unknown>,
): Promise<McpToolCallResult> {
  const client = getConnectedClient(id);
  const result = await client.callTool({ name, arguments: args });
  return {
    content: (result.content as McpContentPart[]) ?? [],
    isError: Boolean(result.isError),
  };
}

export async function getPrompt(
  id: string,
  name: string,
  args: Record<string, string>,
): Promise<McpPromptGetResult> {
  const client = getConnectedClient(id);
  const result = await client.getPrompt({ name, arguments: args });
  return {
    messages: result.messages.map((m) => ({
      role: m.role,
      content: m.content as unknown as McpContentPart,
    })),
  };
}

export async function readResource(
  id: string,
  uri: string,
): Promise<McpResourceReadResult> {
  const client = getConnectedClient(id);
  const result = await client.readResource({ uri });
  return {
    contents: result.contents.map((c) => ({
      uri: c.uri,
      text: "text" in c ? (c.text as string) : undefined,
      blob: "blob" in c ? (c.blob as string) : undefined,
      mimeType: c.mimeType,
    })),
  };
}

export function getServerName(id: string): string {
  return clients.get(id)?.name ?? id;
}

export function getConnectedServerIds(): string[] {
  return Array.from(clients.entries())
    .filter(([, m]) => m.status === "connected")
    .map(([id]) => id);
}

export async function disconnectAll(): Promise<void> {
  const entries = Array.from(clients.entries());
  await Promise.allSettled(
    entries.map(async ([, managed]) => {
      try { await managed.client.close(); } catch { /* ignore */ }
    }),
  );
  clients.clear();
}
