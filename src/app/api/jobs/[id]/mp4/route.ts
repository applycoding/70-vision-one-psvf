import { pipeline } from "@/lib/pipeline";

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const upstream = await pipeline(`/jobs/${id}/mp4`, {
    method: "PUT",
    body: await request.arrayBuffer(),
    headers: {
      "content-type": "video/mp4",
      "x-scene-timings": request.headers.get("x-scene-timings") ?? "",
      "x-encode-ms": request.headers.get("x-encode-ms") ?? "",
      "x-audio-ms": request.headers.get("x-audio-ms") ?? "",
    },
  });
  return new Response(upstream.body, {
    status: upstream.status,
    headers: { "content-type": "application/json" },
  });
}
