"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type LineageRow = {
  scene_index: number;
  step_label: string;
  figure: string;
  page_ref: string;
  stills_source?: string | null;
  t_start_ms: number;
  t_end_ms: number;
};

type LatestJob = {
  job: {
    id: string;
    source_note: string | null;
    audio_duration_ms: number | null;
  };
  lineage: LineageRow[];
  error?: string;
};

function formatMs(ms: number): string {
  const clamped = Math.max(0, ms);
  const minutes = Math.floor(clamped / 60000);
  const seconds = Math.floor((clamped % 60000) / 1000);
  const millis = clamped % 1000;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(millis).padStart(3, "0")}`;
}

export function FactoryLineage() {
  const [payload, setPayload] = useState<LatestJob | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    void fetch("/api/jobs")
      .then(async (response) => {
        const body = (await response.json()) as LatestJob;
        if (!response.ok) {
          setError(body.error ?? "No published job yet.");
          return;
        }
        setPayload(body);
      })
      .catch(() => setError("The job store did not respond."));
  }, []);

  if (error) return <p>{error}</p>;
  if (!payload) return <p>Loading the latest published lineage.</p>;

  return (
    <>
      <p>{payload.job.source_note}</p>
      <p>
        <Link href={`/jobs/${payload.job.id}`}>Open job {payload.job.id}</Link>
        {" · "}
        <a href={`/api/jobs/${payload.job.id}/assets/video.mp4`}>Play the MP4</a>
      </p>
      <div className="table-wrap">
        <table>
          <caption>PROC-EDG-001 lineage from the latest published job.</caption>
          <thead>
            <tr>
              <th scope="col">Step</th>
              <th scope="col">Figure</th>
              <th scope="col">Page</th>
              <th scope="col">Still</th>
              <th scope="col">Start</th>
              <th scope="col">End</th>
            </tr>
          </thead>
          <tbody>
            {payload.lineage.map((row) => (
              <tr key={row.scene_index}>
                <th scope="row">{row.step_label}</th>
                <td>{row.figure}</td>
                <td>{row.page_ref}</td>
                <td>{row.stills_source ?? ""}</td>
                <td>{formatMs(row.t_start_ms)}</td>
                <td>{formatMs(row.t_end_ms)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
