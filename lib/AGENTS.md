# lib/ — Shared Utilities & Adapters Rules

## Module Context

Server and shared utilities live here. `lib/` is imported by Route Handlers (`app/api/`) and, for pure utilities only, by hooks. Components never import from `lib/` directly — they go through hooks.

**Target structure:**
```
lib/
  gemini.ts          # Gemini API adapter (init client, stream generator)
  mcp-client.ts      # MCP server HTTP/stdio transport wrapper
  errors.ts          # AppError type + mapError() + HTTP status helpers
  session.ts         # ChatMessage type + session serialization helpers
  storage-keys.ts    # Centralised localStorage key constants
  utils.ts           # Generic pure utilities (cn, formatDate, truncate, etc.)
```

---

## Tech Stack & Constraints

- `gemini.ts` and `mcp-client.ts` are **server-only** — never import them in client components or hooks. Add `"server-only"` package import at the top once installed.
- `errors.ts`, `session.ts`, `storage-keys.ts`, `utils.ts` are **isomorphic** (safe on both server and client).
- Use `@google/genai` SDK for Gemini (replaces legacy `@google/generative-ai`). Never call the Gemini REST endpoint with raw `fetch`.
- Read env vars only inside server-only modules. Never re-export them.

---

## Implementation Patterns

### Gemini adapter (`lib/gemini.ts`)

```typescript
import "server-only";
import { GoogleGenAI, type Content } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

function toGeminiContents(messages: ChatMessage[]): Content[] {
  return messages.map((msg) => ({
    role: msg.role === "user" ? "user" : "model",
    parts: [{ text: msg.content }],
  }));
}

export async function* streamChat(messages: ChatMessage[], signal: AbortSignal) {
  const model = process.env.LLM_MODEL ?? "gemini-2.5-flash-lite";
  const contents = toGeminiContents(messages);
  const response = await ai.models.generateContentStream({ model, contents });
  for await (const chunk of response) {
    if (signal.aborted) return;
    if (chunk.text) yield chunk.text;
  }
}
```

### Error mapping (`lib/errors.ts`)

```typescript
export type AppError = {
  code: "UNAUTHORIZED" | "RATE_LIMITED" | "SERVER_ERROR" | "NETWORK_ERROR" | "UNKNOWN";
  message: string;
  retryable: boolean;
};

export function mapError(err: unknown): AppError {
  if (err instanceof Response || (err as { status?: number }).status) {
    const status = (err as { status: number }).status;
    if (status === 401 || status === 403) return { code: "UNAUTHORIZED", message: "Invalid API key.", retryable: false };
    if (status === 429) return { code: "RATE_LIMITED", message: "Rate limit reached. Try again shortly.", retryable: true };
    return { code: "SERVER_ERROR", message: "Upstream service error.", retryable: true };
  }
  if ((err as Error)?.name === "AbortError") return { code: "NETWORK_ERROR", message: "Request cancelled.", retryable: false };
  return { code: "UNKNOWN", message: "An unexpected error occurred.", retryable: true };
}
```

### Tailwind class merger (`lib/utils.ts`)

```typescript
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

### localStorage key constants (`lib/storage-keys.ts`)

```typescript
export const STORAGE_KEYS = {
  MCP_SERVERS: "mcp:servers",
  CHAT_SESSION: "chat:session",
} as const;
```

---

## Local Golden Rules

Do:
- Add `import "server-only"` at the top of `gemini.ts` and `mcp-client.ts`.
- Export a single `mapError` function from `errors.ts` and use it everywhere.
- Keep `utils.ts` for pure, stateless functions only (no `fetch`, no env reads).
- Use `STORAGE_KEYS` constants everywhere — never hardcode localStorage key strings.

Don't:
- Don't let `lib/gemini.ts` or `lib/mcp-client.ts` be imported by any client-side module. The bundler should catch this via `"server-only"`.
- Don't put component-specific helpers in `lib/`. They belong in the component's directory.
- Don't add more than one responsibility per file — if `gemini.ts` grows beyond 150 lines, split out `gemini-history.ts` or `gemini-types.ts`.
- Don't catch errors and silently discard them. Always call `mapError` and propagate the result.
