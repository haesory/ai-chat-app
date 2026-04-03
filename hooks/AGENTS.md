# hooks/ — Custom Hooks Rules

## Module Context

All client-side stateful logic lives here. Hooks are the bridge between components and the server (via `fetch`). They own streaming state, localStorage sync, and abort control.

**Target structure:**
```
hooks/
  useChatStream.ts        # Sends message, reads SSE, manages streaming state
  useLocalStorage.ts      # Type-safe localStorage read/write with SSR guard
  useMcpServers.ts        # CRUD for MCP server configs in localStorage
  useChatSession.ts       # Current session messages + history management
  useAbortController.ts   # Reusable AbortController lifecycle hook
```

---

## Tech Stack & Constraints

- Pure React: `useState`, `useEffect`, `useRef`, `useCallback`, `useMemo`. No external state libraries.
- SSE reading: use `fetch` + `ReadableStream` reader (not `EventSource`, which does not support POST or custom headers).
- localStorage access must be guarded against SSR (`typeof window === "undefined"`).
- Abort logic must clean up on component unmount via `useEffect` cleanup.

---

## Implementation Patterns

### SSE stream consumer (`useChatStream`)

```typescript
export function useChatStream() {
  const [tokens, setTokens] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<AppError | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const send = useCallback(async (messages: ChatMessage[]) => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setTokens("");
    setIsStreaming(true);
    setError(null);

    try {
      const res = await fetch("/api/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages }),
        signal: abortRef.current.signal,
      });

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        // parse SSE lines and accumulate tokens
        setTokens((prev) => prev + parseSSEChunk(chunk));
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") setError(mapError(err));
    } finally {
      setIsStreaming(false);
    }
  }, []);

  const cancel = useCallback(() => abortRef.current?.abort(), []);

  return { tokens, isStreaming, error, send, cancel };
}
```

### Type-safe localStorage hook

```typescript
export function useLocalStorage<T>(key: string, defaultValue: T) {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === "undefined") return defaultValue;
    try {
      const item = window.localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  const set = useCallback((next: T) => {
    setValue(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(key, JSON.stringify(next));
    }
  }, [key]);

  return [value, set] as const;
}
```

### Abort cleanup pattern

```typescript
useEffect(() => {
  return () => { abortRef.current?.abort(); };
}, []);
```

---

## Local Golden Rules

Do:
- Return a stable `cancel` function from any hook that initiates a network request.
- Guard every localStorage access with `typeof window !== "undefined"`.
- Expose `error: AppError | null` (from `lib/errors.ts`) — never raw `unknown`.
- Use `useCallback` on functions returned from hooks to keep component re-renders minimal.

Don't:
- Don't fetch inside `useEffect` without an AbortController cleanup.
- Don't store derived values in state. Compute them from source state inline.
- Don't mix localStorage and React state without a single source of truth — the hook owns localStorage and React state simultaneously.
- Don't parse SSE lines in components. SSE parsing belongs inside the hook.
