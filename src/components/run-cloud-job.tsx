"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export function RunCloudJob() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const file = new FormData(form).get("manual");
    if (!(file instanceof File) || file.size < 5) {
      setError("Choose a PDF. Empty files are rejected.");
      return;
    }
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/jobs", {
        method: "POST",
        headers: { "content-type": file.type || "application/pdf" },
        body: await file.arrayBuffer(),
      });
      const payload = (await response.json()) as { id?: string; error?: string };
      if (!response.ok || !payload.id) {
        setError(payload.error ?? "The cloud job did not start.");
        setPending(false);
        return;
      }
      router.push(`/jobs/${payload.id}`);
    } catch {
      setError("The cloud job did not start.");
      setPending(false);
    }
  }

  return (
    <form className="cloud-run" action="/api/jobs" method="post" onSubmit={onSubmit}>
      <h2>Cloud path</h2>
      <p>
        Upload a technical manual PDF for PROC-EDG-001. pdf.js parses it in the
        Worker, then GLM-5.3-Flash writes the script. Whisper must reach 95%
        token recall or no MP4 is published.
      </p>
      <p className="hint">
        Default manual: S9550-AB-MMA-010 Rev A.{" "}
        <a href="/api/manual">Download S9550-AB-MMA-010_RevA_EDG_Maintenance.pdf</a>
        . Empty files are rejected. The 3 minute preset targets 2:45 to 3:15.
      </p>
      <div className="field">
        <label htmlFor="cloud-manual">
          Technical manual PDF <span className="req">Required</span>
        </label>
        <input id="cloud-manual" name="manual" type="file" accept="application/pdf,.pdf" required />
      </div>
      <button type="submit" disabled={pending}>
        {pending ? "Starting" : "Run PROC-EDG-001 cloud job"}
      </button>
      {error ? (
        <p className="error is-visible" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}
