import "server-only";

import type { FunctionDeclaration } from "@google/genai";
import { callTool } from "@/lib/mcp-client";
import type { McpAvailableTool, McpToolCallResult } from "@/lib/types";

export interface ToolMapping {
  serverId: string;
  serverName: string;
}

export function mcpToolsToGeminiFunctions(
  tools: McpAvailableTool[],
): { declarations: FunctionDeclaration[]; mapping: Map<string, ToolMapping> } {
  const mapping = new Map<string, ToolMapping>();
  const declarations: FunctionDeclaration[] = [];

  for (const tool of tools) {
    mapping.set(tool.name, {
      serverId: tool.serverId,
      serverName: tool.serverName,
    });

    declarations.push({
      name: tool.name,
      description: tool.description,
      parametersJsonSchema: tool.inputSchema ?? {
        type: "object",
        properties: {},
      },
    });
  }

  return { declarations, mapping };
}

export async function executeToolCall(
  serverId: string,
  name: string,
  args: Record<string, unknown>,
): Promise<McpToolCallResult> {
  try {
    return await callTool(serverId, name, args);
  } catch (err) {
    return {
      content: [
        {
          type: "text",
          text: err instanceof Error ? err.message : String(err),
        },
      ],
      isError: true,
    };
  }
}
