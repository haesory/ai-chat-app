import { NextRequest } from "next/server";
import {
  streamChat,
  toGeminiContents,
  generateWithTools,
  streamWithTools,
  buildFunctionCallParts,
  buildFunctionResponseParts,
} from "@/lib/gemini";
import { mapError } from "@/lib/errors";
import {
  getConnectedServerIds,
  getCapabilities,
  getServerName,
} from "@/lib/mcp-client";
import {
  mcpToolsToGeminiFunctions,
  executeToolCall,
} from "@/lib/gemini-tools";
import type { ChatMessage, McpAvailableTool, McpContentPart } from "@/lib/types";
import type { Content } from "@google/genai";

export const runtime = "nodejs";

const MAX_TOOL_LOOPS = 10;

interface ChatRequestBody {
  messages: ChatMessage[];
  enabledServerIds?: string[];
}

function isValidChatRequest(body: unknown): body is ChatRequestBody {
  return (
    typeof body === "object" &&
    body !== null &&
    "messages" in body &&
    Array.isArray((body as ChatRequestBody).messages) &&
    (body as ChatRequestBody).messages.every(
      (m: unknown) =>
        typeof m === "object" &&
        m !== null &&
        "role" in m &&
        "content" in m &&
        typeof (m as ChatMessage).content === "string",
    )
  );
}

function contentPartsToText(parts: McpContentPart[]): string {
  return parts
    .filter((p) => p.type === "text" && p.text)
    .map((p) => p.text!)
    .join("\n");
}

async function collectTools(
  serverIds: string[],
): Promise<McpAvailableTool[]> {
  const connectedIds = getConnectedServerIds();
  const targetIds = serverIds.filter((id) => connectedIds.includes(id));

  const tools: McpAvailableTool[] = [];
  const capsResults = await Promise.all(
    targetIds.map(async (id) => {
      const caps = await getCapabilities(id);
      return { id, caps };
    }),
  );

  for (const { id, caps } of capsResults) {
    if (!caps) continue;
    for (const tool of caps.tools) {
      tools.push({
        serverId: id,
        serverName: getServerName(id),
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
      });
    }
  }

  return tools;
}

export async function POST(req: NextRequest) {
  const { signal } = req;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ code: "UNKNOWN", message: "Invalid JSON body." }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  if (!isValidChatRequest(body)) {
    return new Response(
      JSON.stringify({
        code: "UNKNOWN",
        message: "Request must include a messages array.",
      }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const { enabledServerIds } = body;
  const hasToolSupport =
    enabledServerIds && enabledServerIds.length > 0;

  if (!hasToolSupport) {
    return streamTextOnly(body.messages, signal);
  }

  return streamWithToolLoop(body.messages, enabledServerIds, signal);
}

function streamTextOnly(
  messages: ChatMessage[],
  signal: AbortSignal,
): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const text of streamChat(messages, signal)) {
          if (signal.aborted) break;
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ text })}\n\n`),
          );
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      } catch (err) {
        const appError = mapError(err);
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: appError })}\n\n`),
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

function streamWithToolLoop(
  messages: ChatMessage[],
  serverIds: string[],
  signal: AbortSignal,
): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      function send(data: unknown) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(data)}\n\n`),
        );
      }

      try {
        const mcpTools = await collectTools(serverIds);
        const { declarations, mapping } =
          mcpToolsToGeminiFunctions(mcpTools);

        const contents: Content[] = toGeminiContents(messages);

        for (let loop = 0; loop < MAX_TOOL_LOOPS; loop++) {
          if (signal.aborted) break;

          const result = await generateWithTools(
            contents,
            declarations,
            signal,
          );

          if (
            result.functionCalls &&
            result.functionCalls.length > 0
          ) {
            contents.push({
              role: "model",
              parts: buildFunctionCallParts(result.functionCalls),
            });

            const responseEntries: {
              name: string;
              response: Record<string, unknown>;
            }[] = [];

            for (const fc of result.functionCalls) {
              const fnName = fc.name ?? "unknown";
              const fnArgs = (fc.args ?? {}) as Record<string, unknown>;
              const info = mapping.get(fnName);
              const serverId = info?.serverId ?? serverIds[0];
              const serverName = info?.serverName ?? serverId;

              const callId = crypto.randomUUID();

              send({
                toolCall: {
                  id: callId,
                  name: fnName,
                  serverId,
                  serverName,
                  arguments: fnArgs,
                },
              });

              const toolResult = await executeToolCall(
                serverId,
                fnName,
                fnArgs,
              );

              send({
                toolResult: {
                  callId,
                  content: toolResult.content,
                  isError: toolResult.isError,
                },
              });

              const resultText = contentPartsToText(toolResult.content);
              responseEntries.push({
                name: fnName,
                response: {
                  result: resultText || "No output",
                  isError: toolResult.isError ?? false,
                },
              });
            }

            contents.push({
              role: "user",
              parts: buildFunctionResponseParts(responseEntries),
            });

            continue;
          }

          if (result.text) {
            send({ text: result.text });
          }
          break;
        }

        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      } catch (err) {
        const appError = mapError(err);
        send({ error: appError });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
