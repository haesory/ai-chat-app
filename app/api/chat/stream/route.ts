import { NextRequest } from "next/server";
import { streamChat } from "@/lib/gemini";
import { mapError } from "@/lib/errors";
import type { ChatMessage } from "@/lib/types";

export const runtime = "nodejs";

interface ChatRequestBody {
  messages: ChatMessage[];
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

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const text of streamChat(body.messages, signal)) {
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
