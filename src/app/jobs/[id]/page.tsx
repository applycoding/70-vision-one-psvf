import type { Metadata } from "next";
import { CloudJob } from "@/components/cloud-job";

export const metadata: Metadata = {
  title: "Cloud job",
  description: "PROC-EDG-001 cloud generation job.",
};

export default async function JobPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <main>
      <section className="intro">
        <p className="kicker">PROC-EDG-001</p>
        <h1>Cloud job</h1>
        <p className="phase-banner">
          Phase 1 cloud run — synthetic source; MP4 is published only after the Whisper gate passes.
        </p>
      </section>
      <CloudJob jobId={id} />
    </main>
  );
}
