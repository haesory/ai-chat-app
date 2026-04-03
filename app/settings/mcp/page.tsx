import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { McpServerList } from "@/components/mcp/McpServerList";

export const metadata: Metadata = {
  title: "MCP 서버 설정 — AI Chat",
};

export default function McpSettingsPage() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8">
      <div>
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          채팅으로 돌아가기
        </Link>
      </div>

      <McpServerList />
    </div>
  );
}
