# app/api — Route Handler Rules

## Module Context

All server-side logic lives here. This is the only place allowed to call Gemini, MCP servers, or any external API. The client never calls those services directly.

**Directory layout (target):**
```
app/api/
  chat/
    stream/route.ts      # SSE streaming endpoint for LLM responses
  mcp/
    route.ts             # MCP server proxy (list tools, call tool)
  health/route.ts        # Optional liveness check
```

**Dependencies (add via pnpm as needed):**
- `@google/genai` — Google Gen AI SDK (server-side only, replaces legacy `@google/generative-ai`)
- Native `fetch` for MCP HTTP transport

---

## Implementation Patterns

### SSE Streaming Route (boilerplate)

```typescript
// app/api/chat/stream/route.ts
import { NextRequest } from "next/server";

export const runtime = "nodejs"; // required for streaming

export async function POST(req: NextRequest) {
  const { signal } = req;
  const body = await req.json();

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // iterate Gemini generateContentStream chunks
        for await (const chunk of geminiStream) {
          if (signal.aborted) break;
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: chunk })}\n\n`));
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      } catch (err) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(mapError(err))}\n\n`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
```

### Error Mapping (unified shape)

All upstream errors must be mapped before being sent to the client:

```typescript
// lib/errors.ts (source of truth — import from there)
type AppError = { code: string; message: string; retryable: boolean };

function mapError(err: unknown): AppError {
  // 401 -> UNAUTHORIZED, 429 -> RATE_LIMITED, 5xx -> SERVER_ERROR, etc.
}
```

### Input Validation

Validate request bodies with a narrow type guard before using them. Never trust `body as SomeType`.

```typescript
function isValidChatRequest(body: unknown): body is ChatRequest {
  return (
    typeof body === "object" &&
    body !== null &&
    "messages" in body &&
    Array.isArray((body as ChatRequest).messages)
  );
}
```

---

## Tech Stack & Constraints

- Runtime: `export const runtime = "nodejs"` on streaming routes (Edge runtime does not support all Node APIs).
- Use native `fetch`, never `axios`.
- Read `process.env.GEMINI_API_KEY` and `process.env.LLM_MODEL` only inside Route Handlers or `lib/` server utilities. Never import them into client components.
- Keep each `route.ts` under 200 lines. Extract Gemini adapter to `lib/gemini.ts`, MCP client to `lib/mcp-client.ts`.

---

## Local Golden Rules

Do:
- Always check `signal.aborted` inside streaming loops to respect client cancellation.
- Return a proper `Response` (not `NextResponse.json`) for SSE routes.
- Mask API keys in all log output.
- Validate and sanitize all incoming JSON before processing.

Don't:
- Don't put business logic directly in `route.ts`. Delegate to `lib/` functions.
- Don't hard-code model names. Read from `process.env.LLM_MODEL` with a safe fallback.
- Don't swallow errors silently. Always emit a structured error event to the SSE stream or return a JSON error body.
- Don't use `export const dynamic = "force-dynamic"` as a workaround without understanding the caching implications.
