import type { Metadata } from "next";
import { FactoryLineage } from "@/components/factory-lineage";
import { manual } from "@/lib/factory";

export const metadata: Metadata = {
  title: "Factory run",
  description:
    "Public demo of ingest through source-to-timecode lineage for PROC-EDG-001.",
};

export default function FactoryDemoPage() {
  return (
    <main>
      <section className="intro">
        <p className="kicker">Demo 1 · no login</p>
        <h1>Factory run</h1>
        <p className="lead">
          {manual.document} Rev {manual.revision} through PROC-EDG-001, with
          timecodes from the latest published job.
        </p>
      </section>
      <FactoryLineage />
    </main>
  );
}
