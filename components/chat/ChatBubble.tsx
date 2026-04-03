"use client";

import { MarkdownRenderer } from "./MarkdownRenderer";

interface ChatBubbleProps {
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
}

export function ChatBubble({ role, content, isStreaming = false }: ChatBubbleProps) {
  const isUser = role === "user";

  return (
    <article
      aria-label={`${role} message`}
      className={`flex ${isUser ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
          isUser
            ? "bg-blue-600 text-white rounded-br-md whitespace-pre-wrap"
            : "bg-foreground/[0.06] text-foreground rounded-bl-md"
        } ${isStreaming ? "animate-pulse" : ""}`}
      >
        {isUser ? (
          content
        ) : content ? (
          <MarkdownRenderer content={content} />
        ) : isStreaming ? (
          "\u200B"
        ) : null}
      </div>
    </article>
  );
}
