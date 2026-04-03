"use client";

import { useEffect, useRef, Fragment } from "react";
import { ChatBubble } from "./ChatBubble";
import { ToolCallBubble } from "./ToolCallBubble";
import { StreamingIndicator } from "./StreamingIndicator";
import type { ChatMessage, ToolCallInfo } from "@/lib/types";

interface ChatTimelineProps {
  messages: ChatMessage[];
  streamingContent: string;
  isStreaming: boolean;
  streamingToolCalls?: ToolCallInfo[];
}

export function ChatTimeline({
  messages,
  streamingContent,
  isStreaming,
  streamingToolCalls,
}: ChatTimelineProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent, streamingToolCalls]);

  if (messages.length === 0 && !isStreaming) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="text-center">
          <h2 className="text-lg font-medium text-foreground/70">AI Chat</h2>
          <p className="mt-1 text-sm text-foreground/50">
            메시지를 입력하여 대화를 시작하세요.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6" role="log" aria-label="Chat messages">
      <div className="mx-auto flex max-w-3xl flex-col gap-3">
        {messages.map((msg) => (
          <Fragment key={msg.id}>
            {msg.toolCalls && msg.toolCalls.length > 0 && (
              <div className="flex flex-col gap-1.5">
                {msg.toolCalls.map((tc) => (
                  <ToolCallBubble key={tc.id} toolCall={tc} />
                ))}
              </div>
            )}
            <ChatBubble role={msg.role} content={msg.content} />
          </Fragment>
        ))}

        {isStreaming && streamingToolCalls && streamingToolCalls.length > 0 && (
          <div className="flex flex-col gap-1.5">
            {streamingToolCalls.map((tc) => (
              <ToolCallBubble key={tc.id} toolCall={tc} />
            ))}
          </div>
        )}

        {isStreaming && streamingContent && (
          <ChatBubble role="assistant" content={streamingContent} isStreaming />
        )}
        {isStreaming && !streamingContent && (!streamingToolCalls || streamingToolCalls.length === 0) && (
          <StreamingIndicator />
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
