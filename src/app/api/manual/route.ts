import { pipeline } from "@/lib/pipeline";

export async function GET() {
  const upstream = await pipeline("/manual");
  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      "content-type": "application/pdf",
      "content-disposition": "attachment; filename=\"S9550-AB-MMA-010_RevA_EDG_Maintenance.pdf\"",
    },
  });
}
