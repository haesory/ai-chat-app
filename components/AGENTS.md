# components/ — UI Component Rules

## Module Context

All reusable React components live here. Components are client-side by default (`"use client"`). They receive data as props; they never call Gemini or MCP directly.

**Target structure:**
```
components/
  chat/
    ChatBubble.tsx         # User / AI message bubble
    McpResultCard.tsx      # MCP tool call result display
    ChatTimeline.tsx       # Scrollable message list
    StreamingIndicator.tsx # Animated loading dots
  input/
    ChatInput.tsx          # Textarea + send button + slash-command hint
    PromptHint.tsx         # "/" shortcut popup for prompt templates
  layout/
    TopBar.tsx             # Model selector + MCP server management entry
    SecurityBanner.tsx     # localStorage sensitive data warning
  ui/                      # shadcn/ui generated primitives (do not hand-edit)
```

---

## Tech Stack & Constraints

- **shadcn/ui** for all interactive primitives (Button, Dialog, Popover, Select, Textarea, etc.).
  - Add new shadcn components: `pnpm dlx shadcn@latest add <component>`
  - Never manually copy-paste shadcn source. Use the CLI.
- **Tailwind CSS v4** for layout, spacing, color, typography. No inline `style={{}}` except for dynamic values unreachable via Tailwind (e.g. computed pixel widths).
- **Lucide** for icons. Import individual icons, not the whole barrel: `import { Send } from "lucide-react"`.
- **No global state.** Components receive state via props or read from hooks in `hooks/`. Never import a Zustand/Redux store directly inside a component unless explicitly justified.

---

## Implementation Patterns

### Component file template

```typescript
"use client";

import { ComponentProps } from "react";

interface ChatBubbleProps {
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
}

export function ChatBubble({ role, content, isStreaming = false }: ChatBubbleProps) {
  return (
    <article
      aria-label={`${role} message`}
      className={role === "user" ? "self-end bg-primary text-primary-foreground" : "self-start bg-muted"}
    >
      <p>{content}</p>
      {isStreaming && <span aria-live="polite" aria-label="AI is typing" />}
    </article>
  );
}
```

### Streaming state display

- Show `StreamingIndicator` while `isStreaming === true`.
- Use `aria-live="polite"` on the container that receives streamed tokens so screen readers announce updates.
- Scroll the `ChatTimeline` to the bottom on each new token using a `useEffect` + `ref.scrollIntoView`.

### Error state pattern

Every component that fetches or triggers async work must handle three states: `idle`, `loading`, `error`. Render a friendly message + retry button in error state:

```typescript
{error && (
  <div role="alert" className="text-destructive">
    <p>{error.message}</p>
    <Button variant="outline" onClick={retry}>Retry</Button>
  </div>
)}
```

### Slash-command hint

When the user types `/` as the first character in `ChatInput`, render `PromptHint` as a Popover above the input. Do not implement a custom dropdown from scratch — use shadcn `Popover` + `Command`.

---

## Local Golden Rules

Do:
- Add `aria-label`, `role`, and `aria-live` to every interactive and dynamic element.
- Support keyboard navigation: `Enter` sends message, `Escape` dismisses popovers.
- Keep components pure and presentational where possible. Logic belongs in hooks.
- Co-locate a `types.ts` inside each subdirectory if it has more than two shared types.

Don't:
- Don't use `useEffect` for derived state — compute it inline or with `useMemo`.
- Don't put fetch calls inside components. Use hooks from `hooks/` instead.
- Don't import anything from `app/api/` into components. The boundary is absolute.
- Don't create a component with more than one exported function unless it is a named-export barrel (`index.ts`).
