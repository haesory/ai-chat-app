import { getCapabilities, getStatus } from "@/lib/mcp-client";
import { mapError } from "@/lib/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const status = getStatus(id);
  if (status.status !== "connected") {
    return Response.json(
      { code: "UNKNOWN", message: "Server is not connected." },
      { status: 404 },
    );
  }

  try {
    const capabilities = await getCapabilities(id);
    return Response.json(capabilities);
  } catch (err) {
    const appError = mapError(err);
    return Response.json(appError, { status: 500 });
  }
}
