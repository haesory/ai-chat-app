import { NextRequest, NextResponse } from "next/server";
import {
  getConnectedServerIds,
  getCapabilities,
  getServerName,
} from "@/lib/mcp-client";
import { mapError } from "@/lib/errors";
import type { McpAvailableTool } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const serverIdsParam = req.nextUrl.searchParams.get("serverIds");
    const requestedIds = serverIdsParam
      ? serverIdsParam.split(",").filter(Boolean)
      : null;

    const connectedIds = getConnectedServerIds();
    const targetIds = requestedIds
      ? connectedIds.filter((id) => requestedIds.includes(id))
      : connectedIds;

    const allTools: McpAvailableTool[] = [];

    const capsResults = await Promise.all(
      targetIds.map(async (id) => {
        const caps = await getCapabilities(id);
        return { id, caps };
      }),
    );

    for (const { id, caps } of capsResults) {
      if (!caps) continue;
      for (const tool of caps.tools) {
        allTools.push({
          serverId: id,
          serverName: getServerName(id),
          name: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema,
        });
      }
    }

    return NextResponse.json({ tools: allTools });
  } catch (err) {
    const appError = mapError(err);
    return NextResponse.json(appError, { status: 500 });
  }
}
