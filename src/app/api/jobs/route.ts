import { pipeline } from "@/lib/pipeline";

export async function POST(request: Request) {
  const bytes = await request.arrayBuffer();
  if (bytes.byteLength < 5) {
    return Response.json({ error: "Choose a PDF. Empty files are rejected." }, { status: 400 });
  }
  const header = new TextDecoder().decode(bytes.slice(0, 5));
  if (header !== "%PDF-") {
    return Response.json({ error: "The upload is not a PDF." }, { status: 400 });
  }
  const upstream = await pipeline("/jobs", {
    method: "POST",
    body: bytes,
    headers: { "content-type": "application/pdf" },
  });
  return new Response(upstream.body, {
    status: upstream.status,
    headers: { "content-type": "application/json" },
  });
}

export async function GET() {
  const upstream = await pipeline("/jobs/latest");
  return new Response(upstream.body, {
    status: upstream.status,
    headers: { "content-type": "application/json" },
  });
}
