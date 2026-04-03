# AI Chat App — Root Agent Rules

## Project Context & Operations

**Goal:** MCP Host & Client AI chat app. Users can connect MCP servers, manage chat sessions, and interact with an LLM (Gemini) via streaming SSE.

**Tech Stack:**
- Next.js 16 (App Router, `/app`) — FE + BE in one repo
- React 19, TypeScript 5 (strict)
- Tailwind CSS v4 (PostCSS, no config file — uses `@import "tailwindcss"` in `globals.css`)
- shadcn/ui + Lucide icons
- Gemini API via `@google/generative-ai` (server-side only)
- Storage: localStorage only (MVP — no DB)

**Operational Commands:**
```
pnpm install          # install dependencies
pnpm dev              # start dev server (http://localhost:3000)
pnpm build            # production build
pnpm start            # serve production build
pnpm lint             # ESLint (flat config, eslint.config.mjs)
pnpm format           # Prettier format
pnpm typecheck        # tsc --noEmit
pnpm test             # vitest (when configured)
```

**Environment variables (`.env.local`, never commit):**
```
GEMINI_API_KEY=
LLM_MODEL=
```

---

## Golden Rules

### Immutable (never break these)

- Never call Gemini or any external API from client-side code. All LLM and MCP calls go through server-side Route Handlers only.
- Never commit `.env.local` or any file containing real API keys.
- Never introduce a server-side DB or ORM in MVP. Storage = localStorage.
- Never allow a file to exceed 500 lines. Split by Single Responsibility Principle.

### Do's

- Use `pnpm` exclusively. Never run `npm install` or `yarn`.
- Keep Route Handlers in `app/api/**/route.ts`. One file per endpoint.
- Stream LLM responses via SSE (`text/event-stream`). Always support `AbortController` cancellation.
- Map all upstream errors (401, 403, 429, 5xx) to a unified `{ code, message }` shape before sending to client.
- Use shadcn/ui primitives for all interactive UI. Extend with Tailwind utility classes.
- Add `aria-*` attributes, keyboard navigation, and visible loading/error states to every interactive component.
- Show a security warning banner when localStorage contains sensitive values.
- Prefer co-located types (`types.ts` next to the module) over a single global types file.

### Don'ts

- Don't use `any` in TypeScript. Use `unknown` + type guards.
- Don't use a global state store (Zustand, Redux, Jotai) unless justified in a PR comment. React state + custom hooks is the default.
- Don't add `console.log` in production paths. Use structured logging with sensitive-field masking.
- Don't use `axios`. Use native `fetch` everywhere.
- Don't create new shadcn components from scratch if an existing primitive covers the use case.
- Don't use table-format routing maps in AGENTS.md files.

---

## Standards & References

**Naming conventions:**
- Components: PascalCase (`ChatBubble.tsx`)
- Hooks: camelCase prefixed with `use` (`useChatStream.ts`)
- Utilities: camelCase (`formatMessage.ts`)
- Route handlers: `app/api/<resource>/route.ts`
- Types: PascalCase suffixed with type role (`ChatMessage`, `MpcServerConfig`)

**Imports:** Use the `@/` path alias (maps to project root).

**Commit message format:** `<type>(<scope>): <short description>` — types: `feat`, `fix`, `refactor`, `chore`, `docs`, `test`.

**Maintenance policy:** When a rule in any AGENTS.md contradicts the actual code, propose an update to the AGENTS.md file before making the code change.

---

## Context Map

- **[App Shell & Layout](./app/AGENTS.md)** — Editing `layout.tsx`, `page.tsx`, `globals.css`, or adding new App Router pages/segments.
- **[API Route Handlers](./app/api/AGENTS.md)** — Creating or modifying server-side Route Handlers: chat streaming, MCP proxy, error handling.
- **[UI Components](./components/AGENTS.md)** — Building or editing shadcn/ui-based components: chat bubbles, MCP result cards, input bar, modals.
- **[Custom Hooks & State](./hooks/AGENTS.md)** — Writing or modifying client-side React hooks: streaming state, localStorage sync, abort control.
- **[Shared Utilities & MCP Client](./lib/AGENTS.md)** — Adding utilities, Gemini adapter, MCP client logic, error mappers, type definitions.
