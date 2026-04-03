export const STORAGE_KEYS = {
  SESSIONS: "chat:sessions",
  ACTIVE_SESSION: "chat:active-session",
  sessionMessages: (id: string) => `chat:msg:${id}`,
  MCP_SERVERS: "mcp:servers",
} as const;
