import { NextRequest, NextResponse } from "next/server";
import { connectServer } from "@/lib/mcp-client";
import { mapError } from "@/lib/errors";
import type { McpServerConfig, McpServerStatus } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { servers?: McpServerConfig[] };
    const servers = body.servers;

    if (!Array.isArray(servers)) {
      return NextResponse.json(
        { code: "UNKNOWN", message: "servers must be an array" },
        { status: 400 },
      );
    }

    const results: McpServerStatus[] = await Promise.all(
      servers.map((cfg) => connectServer(cfg)),
    );

    return NextResponse.json({ results });
  } catch (err) {
    const appError = mapError(err);
    return NextResponse.json(appError, { status: 500 });
  }
}
