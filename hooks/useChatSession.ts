"use client";

import { useState, useCallback, useRef } from "react";
import {
  readStorage,
  writeStorage,
  removeStorage,
} from "./useLocalStorage";
import { STORAGE_KEYS } from "@/lib/storage-keys";
import type { ChatMessage, ChatSessionMeta } from "@/lib/types";

function makeSession(): ChatSessionMeta {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    title: "새 대화",
    createdAt: now,
    updatedAt: now,
  };
}

function loadSessions(): ChatSessionMeta[] {
  return readStorage<ChatSessionMeta[]>(STORAGE_KEYS.SESSIONS, []);
}

function loadActiveId(sessions: ChatSessionMeta[]): string {
  const stored = readStorage<string | null>(STORAGE_KEYS.ACTIVE_SESSION, null);
  if (stored && sessions.some((s) => s.id === stored)) return stored;
  return sessions[0]?.id ?? "";
}

function loadMessages(sessionId: string): ChatMessage[] {
  if (!sessionId) return [];
  return readStorage<ChatMessage[]>(
    STORAGE_KEYS.sessionMessages(sessionId),
    [],
  );
}

export function useChatSession() {
  const [sessions, setSessions] = useState<ChatSessionMeta[]>(loadSessions);
  const [activeSessionId, setActiveSessionId] = useState<string>(() =>
    loadActiveId(loadSessions()),
  );
  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    loadMessages(loadActiveId(loadSessions())),
  );

  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  const sessionsRef = useRef(sessions);
  sessionsRef.current = sessions;

  const activeIdRef = useRef(activeSessionId);
  activeIdRef.current = activeSessionId;

  const persistSessions = useCallback((next: ChatSessionMeta[]) => {
    sessionsRef.current = next;
    setSessions(next);
    writeStorage(STORAGE_KEYS.SESSIONS, next);
  }, []);

  const persistActiveId = useCallback((id: string) => {
    activeIdRef.current = id;
    setActiveSessionId(id);
    writeStorage(STORAGE_KEYS.ACTIVE_SESSION, id);
  }, []);

  const persistMessages = useCallback(
    (sessionId: string, msgs: ChatMessage[]) => {
      messagesRef.current = msgs;
      setMessages(msgs);
      writeStorage(STORAGE_KEYS.sessionMessages(sessionId), msgs);
    },
    [],
  );

  const createSession = useCallback(() => {
    const session = makeSession();
    const updated = [session, ...sessionsRef.current];
    persistSessions(updated);
    persistActiveId(session.id);
    persistMessages(session.id, []);
    return session.id;
  }, [persistSessions, persistActiveId, persistMessages]);

  const switchSession = useCallback(
    (id: string) => {
      if (id === activeIdRef.current) return;
      persistActiveId(id);
      const msgs = loadMessages(id);
      messagesRef.current = msgs;
      setMessages(msgs);
    },
    [persistActiveId],
  );

  const deleteSession = useCallback(
    (id: string) => {
      removeStorage(STORAGE_KEYS.sessionMessages(id));
      const remaining = sessionsRef.current.filter((s) => s.id !== id);
      persistSessions(remaining);

      if (id === activeIdRef.current) {
        if (remaining.length > 0) {
          persistActiveId(remaining[0].id);
          const msgs = loadMessages(remaining[0].id);
          messagesRef.current = msgs;
          setMessages(msgs);
        } else {
          const fresh = makeSession();
          persistSessions([fresh]);
          persistActiveId(fresh.id);
          persistMessages(fresh.id, []);
        }
      }
    },
    [persistSessions, persistActiveId, persistMessages],
  );

  const addMessage = useCallback(
    (message: ChatMessage) => {
      const currentId = activeIdRef.current;
      if (!currentId) return;

      const nextMessages = [...messagesRef.current, message];
      persistMessages(currentId, nextMessages);

      const updated = sessionsRef.current.map((s) => {
        if (s.id !== currentId) return s;
        const needsTitle =
          s.title === "새 대화" && message.role === "user";
        return {
          ...s,
          updatedAt: Date.now(),
          ...(needsTitle
            ? { title: message.content.slice(0, 30) }
            : {}),
        };
      });
      persistSessions(updated);
    },
    [persistMessages, persistSessions],
  );

  const clearMessages = useCallback(() => {
    const currentId = activeIdRef.current;
    if (!currentId) return;
    persistMessages(currentId, []);
  }, [persistMessages]);

  return {
    sessions,
    activeSessionId,
    messages,
    addMessage,
    setMessages,
    clearMessages,
    createSession,
    switchSession,
    deleteSession,
  };
}
