export interface ToolCallInfo {
  id: string;
  toolName: string;
  serverId: string;
  serverName: string;
  arguments: Record<string, unknown>;
  result?: {
    content: McpContentPart[];
    isError?: boolean;
  };
}

export interface McpAvailableTool {
  serverId: string;
  serverName: string;
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolCalls?: ToolCallInfo[];
  createdAt: number;
}

export interface ChatSessionMeta {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
}

export type McpTransportType = "streamable-http" | "stdio";

export interface McpServerConfig {
  id: string;
  name: string;
  transport: McpTransportType;
  enabled: boolean;
  url?: string;
  headers?: Record<string, string>;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  createdAt: number;
  updatedAt: number;
}

export type McpConnectionStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "error";

export interface McpServerStatus {
  id: string;
  status: McpConnectionStatus;
  error?: string;
}

export interface McpToolInfo {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
}

export interface McpPromptInfo {
  name: string;
  description?: string;
  arguments?: { name: string; description?: string; required?: boolean }[];
}

export interface McpResourceInfo {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

export interface McpCapabilities {
  tools: McpToolInfo[];
  prompts: McpPromptInfo[];
  resources: McpResourceInfo[];
}

export interface McpContentPart {
  type: string;
  text?: string;
  data?: string;
  mimeType?: string;
}

export interface McpToolCallResult {
  content: McpContentPart[];
  isError?: boolean;
}

export interface McpPromptMessage {
  role: string;
  content: McpContentPart;
}

export interface McpPromptGetResult {
  messages: McpPromptMessage[];
}

export interface McpResourceContent {
  uri: string;
  text?: string;
  blob?: string;
  mimeType?: string;
}

export interface McpResourceReadResult {
  contents: McpResourceContent[];
}
