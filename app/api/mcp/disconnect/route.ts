import { NextRequest } from "next/server";
import { disconnectServer } from "@/lib/mcp-client";
import { mapError } from "@/lib/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

  if (
    typeof body !== "object" ||
    body === null ||
    typeof (body as { id: unknown }).id !== "string"
  ) {
    return Response.json(
      { code: "UNKNOWN", message: "Request must include an id string." },
      { status: 400 },
    );
  }

  try {
    await disconnectServer((body as { id: string }).id);
    return Response.json({ success: true });
  } catch (err) {
    const appError = mapError(err);
    return Response.json(appError, { status: 500 });
  }
}
