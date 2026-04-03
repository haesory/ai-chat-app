"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { supabase, rowToSession, rowToMessage } from "@/lib/supabase";
import type { ChatMessage, ChatSessionMeta } from "@/lib/types";

function makeSessionRow(): {
  id: string;
  title: string;
  created_at: number;
  updated_at: number;
} {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    title: "새 대화",
    created_at: now,
    updated_at: now,
  };
}

export function useChatSession() {
  const [sessions, setSessions] = useState<ChatSessionMeta[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  const sessionsRef = useRef(sessions);
  sessionsRef.current = sessions;

  const activeIdRef = useRef(activeSessionId);
  activeIdRef.current = activeSessionId;

  // Load sessions on mount and set active session
  useEffect(() => {
    let cancelled = false;

    async function init() {
      const { data, error } = await supabase
        .from("chat_sessions")
        .select("*")
        .order("updated_at", { ascending: false });

      if (cancelled || error) return;

      if (!data || data.length === 0) {
        // Bootstrap a fresh session if DB is empty
        const row = makeSessionRow();
        await supabase.from("chat_sessions").insert(row);
        const fresh = rowToSession(row);
        setSessions([fresh]);
        setActiveSessionId(fresh.id);
        setIsLoading(false);
        return;
      }

      const mapped = data.map(rowToSession);
      setSessions(mapped);

      const firstId = mapped[0].id;
      setActiveSessionId(firstId);

      const { data: msgs } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("session_id", firstId)
        .order("created_at", { ascending: true });

      if (!cancelled) {
        setMessages((msgs ?? []).map(rowToMessage));
        setIsLoading(false);
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, []);

  const switchSession = useCallback(async (id: string) => {
    if (id === activeIdRef.current) return;
    setActiveSessionId(id);
    activeIdRef.current = id;

    const { data } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("session_id", id)
      .order("created_at", { ascending: true });

    setMessages((data ?? []).map(rowToMessage));
  }, []);

  const createSession = useCallback(async () => {
    const row = makeSessionRow();
    await supabase.from("chat_sessions").insert(row);
    const session = rowToSession(row);

    const next = [session, ...sessionsRef.current];
    setSessions(next);
    sessionsRef.current = next;

    setActiveSessionId(session.id);
    activeIdRef.current = session.id;

    setMessages([]);
    messagesRef.current = [];

    return session.id;
  }, []);

  const deleteSession = useCallback(
    async (id: string) => {
      // Cascade deletes messages via FK
      await supabase.from("chat_sessions").delete().eq("id", id);

      const remaining = sessionsRef.current.filter((s) => s.id !== id);

      if (id === activeIdRef.current) {
        if (remaining.length > 0) {
          setSessions(remaining);
          sessionsRef.current = remaining;

          const nextId = remaining[0].id;
          setActiveSessionId(nextId);
          activeIdRef.current = nextId;

          const { data } = await supabase
            .from("chat_messages")
            .select("*")
            .eq("session_id", nextId)
            .order("created_at", { ascending: true });

          setMessages((data ?? []).map(rowToMessage));
          messagesRef.current = (data ?? []).map(rowToMessage);
        } else {
          // No sessions left — create a fresh one
          const row = makeSessionRow();
          await supabase.from("chat_sessions").insert(row);
          const fresh = rowToSession(row);

          setSessions([fresh]);
          sessionsRef.current = [fresh];
          setActiveSessionId(fresh.id);
          activeIdRef.current = fresh.id;
          setMessages([]);
          messagesRef.current = [];
        }
      } else {
        setSessions(remaining);
        sessionsRef.current = remaining;
      }
    },
    [],
  );

  const addMessage = useCallback((message: ChatMessage) => {
    const currentId = activeIdRef.current;
    if (!currentId) return;

    // Optimistic update
    const nextMessages = [...messagesRef.current, message];
    setMessages(nextMessages);
    messagesRef.current = nextMessages;

    const now = Date.now();
    const needsTitle =
      sessionsRef.current.find((s) => s.id === currentId)?.title === "새 대화" &&
      message.role === "user";

    const updatedSessions = sessionsRef.current.map((s) => {
      if (s.id !== currentId) return s;
      return {
        ...s,
        updatedAt: now,
        ...(needsTitle ? { title: message.content.slice(0, 30) } : {}),
      };
    });
    setSessions(updatedSessions);
    sessionsRef.current = updatedSessions;

    // Persist to DB
    supabase
      .from("chat_messages")
      .insert({
        id: message.id,
        session_id: currentId,
        role: message.role,
        content: message.content,
        tool_calls: message.toolCalls ?? null,
        created_at: message.createdAt,
      })
      .then(() => {
        const titleUpdate = needsTitle
          ? { updated_at: now, title: message.content.slice(0, 30) }
          : { updated_at: now };
        return supabase
          .from("chat_sessions")
          .update(titleUpdate)
          .eq("id", currentId);
      });
  }, []);

  const clearMessages = useCallback(async () => {
    const currentId = activeIdRef.current;
    if (!currentId) return;

    await supabase
      .from("chat_messages")
      .delete()
      .eq("session_id", currentId);

    setMessages([]);
    messagesRef.current = [];
  }, []);

  return {
    sessions,
    activeSessionId,
    messages,
    isLoading,
    addMessage,
    setMessages,
    clearMessages,
    createSession,
    switchSession,
    deleteSession,
  };
}
