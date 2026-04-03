"use client";

import { useCallback, useState, useEffect } from "react";
import Link from "next/link";
import { Settings, Loader2 } from "lucide-react";
import { ChatTimeline } from "@/components/chat/ChatTimeline";
import { ChatInput } from "@/components/input/ChatInput";
import { McpToolsToggle } from "@/components/chat/McpToolsToggle";
import { Sidebar } from "@/components/layout/Sidebar";
import { useChatSession } from "@/hooks/useChatSession";
import { useChatStream } from "@/hooks/useChatStream";
import { useMcpTools } from "@/hooks/useMcpTools";
import type { ChatMessage } from "@/lib/types";

export function ChatPage() {
  const {
    sessions,
    activeSessionId,
    messages,
    addMessage,
    createSession,
    switchSession,
    deleteSession,
  } = useChatSession();
  const { tokens, isStreaming, error, toolCalls, send, cancel } =
    useChatStream();
  const { tools, isLoading: toolsLoading, refresh: refreshTools } =
    useMcpTools();

  const [mounted, setMounted] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [enabledServerIds, setEnabledServerIds] = useState<string[]>([]);

  useEffect(() => setMounted(true), []);

  const handleToggleServer = useCallback(
    (serverId: string) => {
      setEnabledServerIds((prev) =>
        prev.includes(serverId)
          ? prev.filter((id) => id !== serverId)
          : [...prev, serverId],
      );
    },
    [],
  );

  const handleSend = useCallback(
    async (content: string) => {
      let sessionId = activeSessionId;
      if (!sessionId) {
        sessionId = createSession();
      }

      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content,
        createdAt: Date.now(),
      };
      addMessage(userMessage);

      const allMessages = [...messages, userMessage];

      const activeServers =
        enabledServerIds.length > 0 ? enabledServerIds : undefined;
      const result = await send(allMessages, activeServers);

      if (result.text) {
        const assistantMessage: ChatMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: result.text,
          toolCalls:
            result.toolCalls.length > 0 ? result.toolCalls : undefined,
          createdAt: Date.now(),
        };
        addMessage(assistantMessage);
      }
    },
    [activeSessionId, messages, addMessage, send, createSession, enabledServerIds],
  );

  const handleNewChat = useCallback(() => {
    if (isStreaming) cancel();
    createSession();
  }, [isStreaming, cancel, createSession]);

  const handleSwitchSession = useCallback(
    (id: string) => {
      if (isStreaming) cancel();
      switchSession(id);
    },
    [isStreaming, cancel, switchSession],
  );

  const activeTitle =
    sessions.find((s) => s.id === activeSessionId)?.title ?? "AI Chat";

  if (!mounted) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar
        sessions={sessions}
        activeSessionId={activeSessionId}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onNewChat={handleNewChat}
        onSelectSession={handleSwitchSession}
        onDeleteSession={deleteSession}
      />

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-foreground/10 px-4 py-3">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open sidebar"
            className="rounded-lg p-1.5 text-foreground/60 transition-colors hover:bg-foreground/[0.06] hover:text-foreground md:hidden"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-5">
              <path fillRule="evenodd" d="M2 4.75A.75.75 0 0 1 2.75 4h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 4.75ZM2 10a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 10Zm0 5.25a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1-.75-.75Z" clipRule="evenodd" />
            </svg>
          </button>

          <h1 className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
            {activeTitle}
          </h1>

          <Link
            href="/settings/mcp"
            aria-label="MCP 서버 설정"
            className="rounded-lg p-1.5 text-foreground/60 transition-colors hover:bg-foreground/[0.06] hover:text-foreground"
          >
            <Settings className="size-4" />
          </Link>

          <button
            type="button"
            onClick={handleNewChat}
            aria-label="New chat"
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-foreground/60 transition-colors hover:bg-foreground/[0.06] hover:text-foreground"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="size-3.5">
              <path d="M8.75 3.75a.75.75 0 0 0-1.5 0v3.5h-3.5a.75.75 0 0 0 0 1.5h3.5v3.5a.75.75 0 0 0 1.5 0v-3.5h3.5a.75.75 0 0 0 0-1.5h-3.5v-3.5Z" />
            </svg>
            새 채팅
          </button>
        </header>

        <ChatTimeline
          messages={messages}
          streamingContent={tokens}
          isStreaming={isStreaming}
          streamingToolCalls={toolCalls}
        />

        {error && (
          <div role="alert" className="mx-4 mb-2 rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-600">
            {error.message}
          </div>
        )}

        <ChatInput
          onSend={handleSend}
          isStreaming={isStreaming}
          onCancel={cancel}
          toolsSlot={
            <McpToolsToggle
              tools={tools}
              enabledServerIds={enabledServerIds}
              onToggleServer={handleToggleServer}
              isLoading={toolsLoading}
            />
          }
        />
      </main>
    </div>
  );
}
