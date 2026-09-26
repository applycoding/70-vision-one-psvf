"use client";

import { useState, type FormEvent } from "react";
import { lengths, procedures, tones, timing } from "@/lib/factory";

type JobTicket = {
  id: string;
  fileName: string;
  fileSize: string;
  procedure: string;
  length: string;
  tone: string;
  revision: "A" | "B";
  encodeReady: boolean;
};

function formatBytes(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function syncAriaInvalid(control: EventTarget | null) {
  if (!(control instanceof HTMLInputElement)) return;
  control.setAttribute(
    "aria-invalid",
    control.matches(":user-invalid") ? "true" : "false",
  );
}

export function JobForm() {
  const [ticket, setTicket] = useState<JobTicket | null>(null);
  const [fileError, setFileError] = useState("");

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    if (String(data.get("company") ?? "").trim() !== "") return;

    const fileInput = form.elements.namedItem("manual");
    const file = data.get("manual");
    if (!(fileInput instanceof HTMLInputElement) || !(file instanceof File)) {
      return;
    }

    const isPdf =
      file.size > 0 &&
      (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf"));

    if (!isPdf) {
      const message = "Choose a PDF technical manual.";
      fileInput.setCustomValidity(message);
      setFileError(message);
      fileInput.reportValidity();
      return;
    }

    fileInput.setCustomValidity("");
    setFileError("");

    const procedureId = String(data.get("procedure"));
    const procedure =
      procedures.find((item) => item.id === procedureId)?.title ?? "Entire manual";
    const length =
      lengths.find((item) => item.value === String(data.get("length")))?.label ??
      "3 minutes";
    const tone =
      tones.find((item) => item.value === String(data.get("tone")))?.label ??
      "Warnings first";
    const revision = data.get("revision") === "B" ? "B" : "A";

    setTicket({
      id: crypto.randomUUID(),
      fileName: file.name,
      fileSize: formatBytes(file.size),
      procedure: procedureId === "all" ? "Entire manual" : `${procedureId} · ${procedure}`,
      length,
      tone,
      revision,
      encodeReady: "VideoEncoder" in window,
    });
  }

  const revB = procedures.filter((item) => item.staleOnRevB);

  return (
    <form className="job-form" action="/" method="post" onSubmit={onSubmit} noValidate>
      <div className="visually-hidden" aria-hidden="true">
        <label htmlFor="company">Company</label>
        <input id="company" name="company" tabIndex={-1} autoComplete="off" />
      </div>

      <fieldset>
        <legend>Manual</legend>
        <p className="hint" id="manual-hint">
          Authoritative file for this demo is {`S9550-AB-MMA-010`} Rev A. The PDF
          body stays Rev A. Rev B is the change-impact trigger.
        </p>
        <div className="field">
          <label htmlFor="manual">
            Technical manual PDF <span className="req">Required</span>
          </label>
          <input
            id="manual"
            name="manual"
            type="file"
            accept="application/pdf,.pdf"
            required
            aria-describedby={fileError ? "manual-hint manual-error" : "manual-hint"}
            aria-errormessage="manual-error"
            onInput={(event) => {
              event.currentTarget.setCustomValidity("");
              setFileError("");
              syncAriaInvalid(event.currentTarget);
            }}
            onBlur={(event) => syncAriaInvalid(event.currentTarget)}
          />
          <p
            id="manual-error"
            className={fileError ? "error is-visible" : "error"}
            role={fileError ? "alert" : undefined}
          >
            {fileError || "Choose a PDF technical manual."}
          </p>
        </div>
        <div className="choices" role="radiogroup" aria-labelledby="revision-legend">
          <p className="choice-label" id="revision-legend">
            Revision
          </p>
          <label>
            <input type="radio" name="revision" value="A" defaultChecked />
            Rev A, authoritative
          </label>
          <label>
            <input type="radio" name="revision" value="B" />
            Rev B, change-impact preview
          </label>
        </div>
      </fieldset>

      <fieldset>
        <legend>
          Procedure <span className="req">Required</span>
        </legend>
        <div className="choices">
          <label>
            <input type="radio" name="procedure" value="all" />
            Entire manual
          </label>
          {procedures.map((procedure) => (
            <label key={procedure.id}>
              <input
                type="radio"
                name="procedure"
                value={procedure.id}
                defaultChecked={procedure.id === "PROC-EDG-001"}
              />
              <span>
                {procedure.id}
                <small>{procedure.title}</small>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend>
          Target length <span className="req">Required</span>
        </legend>
        <p className="hint">Public demo clips stay at or under 5 minutes.</p>
        <div className="choices">
          {lengths.map((length) => (
            <label key={length.value}>
              <input
                type="radio"
                name="length"
                value={length.value}
                defaultChecked={length.value === "3"}
              />
              {length.label}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend>
          Tone <span className="req">Required</span>
        </legend>
        <div className="choices">
          {tones.map((tone) => (
            <label key={tone.value}>
              <input
                type="radio"
                name="tone"
                value={tone.value}
                defaultChecked={tone.value === "warnings-first"}
              />
              {tone.label}
            </label>
          ))}
        </div>
      </fieldset>

      <button type="submit">Start generation</button>
      <noscript>
        <p className="hint">Starting a job in this build needs JavaScript.</p>
      </noscript>

      <section className="ticket" aria-live="polite">
        {ticket ? (
          <>
            <h2>Job {ticket.id}</h2>
            <dl>
              <div>
                <dt>Manual</dt>
                <dd>
                  {ticket.fileName} ({ticket.fileSize})
                </dd>
              </div>
              <div>
                <dt>Procedure</dt>
                <dd>{ticket.procedure}</dd>
              </div>
              <div>
                <dt>Length</dt>
                <dd>{ticket.length}</dd>
              </div>
              <div>
                <dt>Tone</dt>
                <dd>{ticket.tone}</dd>
              </div>
              <div>
                <dt>Revision</dt>
                <dd>Rev {ticket.revision}</dd>
              </div>
              <div>
                <dt>Wall clock</dt>
                <dd>
                  Not measured. Online estimate {timing.online}. Offline estimate{" "}
                  {timing.offline}. {timing.note}
                </dd>
              </div>
              <div>
                <dt>Encode</dt>
                <dd>
                  {ticket.encodeReady
                    ? "This browser exposes WebCodecs, so Mediabunny can encode here."
                    : "This browser does not expose WebCodecs. Playback can still work. Client encode needs Chrome."}
                </dd>
              </div>
            </dl>
            {ticket.revision === "B" ? (
              <div>
                <h3>Planned Rev B deltas</h3>
                <ul>
                  {revB.map((item) => (
                    <li key={item.id}>
                      {item.id}: {item.revB}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            <p>
              The job is recorded in this browser. Cloud ingest is not bound on
              this build, so GLM-5.3-Flash, Lucid Origin, and Aura-2 EN did not
              run, and no video was rendered.
            </p>
          </>
        ) : (
          <p>Job status appears here after you start generation.</p>
        )}
      </section>
    </form>
  );
}
