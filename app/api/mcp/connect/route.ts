import { NextRequest } from "next/server";
import { connectServer } from "@/lib/mcp-client";
import { mapError } from "@/lib/errors";
import type { McpServerConfig } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isValidConfig(body: unknown): body is McpServerConfig {
  if (typeof body !== "object" || body === null) return false;
  const b = body as Record<string, unknown>;
  if (typeof b.id !== "string" || typeof b.name !== "string") return false;
  if (b.transport !== "streamable-http" && b.transport !== "stdio") return false;
  if (b.transport === "streamable-http" && typeof b.url !== "string") return false;
  if (b.transport === "stdio" && typeof b.command !== "string") return false;
  return true;
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json(
      { code: "UNKNOWN", message: "Invalid JSON body." },
      { status: 400 },
    );
  }

  if (!isValidConfig(body)) {
    return Response.json(
      { code: "UNKNOWN", message: "Invalid server configuration." },
      { status: 400 },
    );
  }

  try {
    const status = await connectServer(body);
    return Response.json(status);
  } catch (err) {
    const appError = mapError(err);
    return Response.json(appError, { status: 500 });
  }
}
