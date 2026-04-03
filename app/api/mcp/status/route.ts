import { NextRequest } from "next/server";
import { getStatuses } from "@/lib/mcp-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const idsParam = req.nextUrl.searchParams.get("ids");

  if (!idsParam) {
    return Response.json(
      { code: "UNKNOWN", message: "Query parameter 'ids' is required." },
      { status: 400 },
    );
  }

  const ids = idsParam.split(",").filter(Boolean);
  const statuses = getStatuses(ids);
  return Response.json({ statuses });
}
