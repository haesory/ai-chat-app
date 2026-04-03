# app/ — App Shell & Pages Rules

## Module Context

The Next.js App Router root. Contains the global layout, the single chat page, and global CSS. This folder owns the page-level composition — it assembles components from `components/` but contains no business logic itself.

**Current structure:**
```
app/
  globals.css       # Tailwind v4 import + CSS custom properties
  layout.tsx        # Root layout: <html>, <body>, font, SecurityBanner
  page.tsx          # Chat page: composes TopBar, ChatTimeline, ChatInput
  api/              # Route handlers (see app/api/AGENTS.md)
```

---

## Tech Stack & Constraints

- Tailwind v4 is configured purely via `globals.css` (`@import "tailwindcss"`). There is no `tailwind.config.ts`. Add custom CSS variables in `globals.css` under `:root`.
- `layout.tsx` is a **Server Component** by default. Do not add `"use client"` to it.
- `page.tsx` should remain a thin composition layer. If it exceeds 80 lines, extract into a `components/layout/` component.
- Font loading: use `next/font` in `layout.tsx`. Never link Google Fonts via `<link>` tags.

---

## Implementation Patterns

### Root layout skeleton

```typescript
// app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SecurityBanner } from "@/components/layout/SecurityBanner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AI Chat",
  description: "MCP Host & Client AI Chat",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className={`${inter.className} min-h-screen bg-background text-foreground`}>
        <SecurityBanner />
        {children}
      </body>
    </html>
  );
}
```

### Chat page skeleton

```typescript
// app/page.tsx
import { TopBar } from "@/components/layout/TopBar";
import { ChatTimeline } from "@/components/chat/ChatTimeline";
import { ChatInput } from "@/components/input/ChatInput";

export default function ChatPage() {
  return (
    <main className="flex h-screen flex-col">
      <TopBar />
      <ChatTimeline />
      <ChatInput />
    </main>
  );
}
```

---

## Local Golden Rules

Do:
- Keep `layout.tsx` and `page.tsx` as Server Components unless a specific client interaction forces `"use client"`.
- Set `<html lang="ko">` (Korean UI) for accessibility.
- Define all CSS custom properties (colors, radii) in `globals.css` under `:root` and `[data-theme="dark"]`.

Don't:
- Don't put `useState`, `useEffect`, or any React hooks directly in `page.tsx`. Delegate to client components.
- Don't import from `app/api/` inside page or layout files.
- Don't add per-page `metadata` objects unless the page has a distinct title/description from the root.
