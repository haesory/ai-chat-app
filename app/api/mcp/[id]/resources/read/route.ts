import { readResource } from "@/lib/mcp-client";
import { mapError } from "@/lib/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

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
    typeof (body as Record<string, unknown>).uri !== "string"
  ) {
    return Response.json(
      { code: "UNKNOWN", message: "Missing required field: uri." },
      { status: 400 },
    );
  }

  const { uri } = body as { uri: string };

  try {
    const result = await readResource(id, uri);
    return Response.json(result);
  } catch (err) {
    const appError = mapError(err);
    return Response.json(appError, { status: 500 });
  }
}
