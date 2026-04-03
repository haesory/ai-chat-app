export const STORAGE_KEYS = {
  SESSIONS: "chat:sessions",
  ACTIVE_SESSION: "chat:active-session",
  sessionMessages: (id: string) => `chat:msg:${id}`,
} as const;
