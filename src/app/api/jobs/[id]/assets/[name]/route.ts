import { pipeline } from "@/lib/pipeline";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string; name: string }> },
) {
  const { id, name } = await context.params;
  const upstream = await pipeline(`/jobs/${id}/assets/${name}`);
  const headers = new Headers(upstream.headers);
  return new Response(upstream.body, { status: upstream.status, headers });
}
