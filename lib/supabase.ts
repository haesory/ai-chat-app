import { createClient } from "@supabase/supabase-js";
import type {
  ChatSessionMeta,
  ChatMessage,
  McpServerConfig,
  ToolCallInfo,
} from "@/lib/types";

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

// ---------- DB row shapes ----------

interface SessionRow {
  id: string;
  title: string;
  created_at: number;
  updated_at: number;
}

interface MessageRow {
  id: string;
  session_id: string;
  role: "user" | "assistant";
  content: string;
  tool_calls: ToolCallInfo[] | null;
  created_at: number;
}

interface McpServerRow {
  id: string;
  name: string;
  transport: "streamable-http" | "stdio";
  enabled: boolean;
  url: string | null;
  headers: Record<string, string> | null;
  command: string | null;
  args: string[] | null;
  env: Record<string, string> | null;
  created_at: number;
  updated_at: number;
}

// ---------- Mappers ----------

export function rowToSession(row: SessionRow): ChatSessionMeta {
  return {
    id: row.id,
    title: row.title,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function rowToMessage(row: MessageRow): ChatMessage {
  return {
    id: row.id,
    role: row.role,
    content: row.content,
    ...(row.tool_calls ? { toolCalls: row.tool_calls } : {}),
    createdAt: row.created_at,
  };
}

export function rowToMcpServer(row: McpServerRow): McpServerConfig {
  return {
    id: row.id,
    name: row.name,
    transport: row.transport,
    enabled: row.enabled,
    ...(row.url != null ? { url: row.url } : {}),
    ...(row.headers != null ? { headers: row.headers } : {}),
    ...(row.command != null ? { command: row.command } : {}),
    ...(row.args != null ? { args: row.args } : {}),
    ...(row.env != null ? { env: row.env } : {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
