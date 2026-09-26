"use client";

import {
  AudioBufferSource,
  BufferTarget,
  CanvasSource,
  Mp4OutputFormat,
  Output,
  Quality,
} from "mediabunny";
import { useEffect, useRef, useState } from "react";

type Scene = {
  step: string;
  script: string;
  caption: string;
  duration_ms: number;
  audio_files?: string[];
  highlight?: { x: number; y: number } | null;
};

type LineageRow = {
  scene_index: number;
  step_label: string;
  script_line: string;
  figure: string;
  t_start_ms: number;
  t_end_ms: number;
};

type TimingRow = {
  stage: string;
  duration_ms: number;
  label: string;
};

type JobPayload = {
  job: {
    id: string;
    status: string;
    timing_label: string;
    stills_source: string | null;
    whisper_score: number | null;
    error: string | null;
    source_note: string | null;
    audio_duration_ms: number | null;
  };
  timings: TimingRow[];
  lineage: LineageRow[];
  encode: string;
  error?: string;
};

function formatMs(ms: number): string {
  const clamped = Math.max(0, ms);
  const minutes = Math.floor(clamped / 60000);
  const seconds = Math.floor((clamped % 60000) / 1000);
  const millis = clamped % 1000;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(millis).padStart(3, "0")}`;
}

export function CloudJob({ jobId }: { jobId: string }) {
  const [payload, setPayload] = useState<JobPayload | null>(null);
  const [encodeError, setEncodeError] = useState("");
  const started = useRef(false);

  useEffect(() => {
    let stopped = false;
    async function poll() {
      const response = await fetch(`/api/jobs/${jobId}`);
      const next = (await response.json()) as JobPayload;
      if (stopped) return;
      setPayload(next);
      if (next.job?.status === "gate_passed") {
        void encode(next);
      }
    }
    void poll();
    const timer = window.setInterval(() => void poll(), 4000);
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [jobId]);

  async function encode(current: JobPayload) {
    if (started.current || current.job.status !== "gate_passed") return;
    if (!("VideoEncoder" in window)) {
      setEncodeError("This browser has no WebCodecs encoder. Open the job in Chrome.");
      return;
    }
    started.current = true;
    const startedAt = performance.now();
    try {
      const storyboardResponse = await fetch(`/api/jobs/${jobId}/assets/storyboard.json`);
      const storyboard = (await storyboardResponse.json()) as { scenes: Scene[] };
      const audioContext = new AudioContext();
      const audioBuffers: AudioBuffer[][] = [];
      for (const [index, scene] of storyboard.scenes.entries()) {
        const files = scene.audio_files?.length ? scene.audio_files : [`audio-${index}.mp3`];
        const buffers: AudioBuffer[] = [];
        for (const name of files) {
          const audioResponse = await fetch(`/api/jobs/${jobId}/assets/${name}`);
          if (!audioResponse.ok) throw new Error(`Audio ${name} is missing.`);
          const audioBytes = await audioResponse.arrayBuffer();
          buffers.push(await audioContext.decodeAudioData(audioBytes.slice(0)));
        }
        audioBuffers.push(buffers);
      }
      await audioContext.close();

      const canvas = document.createElement("canvas");
      canvas.width = 1280;
      canvas.height = 720;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Canvas is unavailable.");

      const output = new Output({
        format: new Mp4OutputFormat(),
        target: new BufferTarget(),
      });
      const video = new CanvasSource(canvas, {
        codec: "avc",
        quality: new Quality({ bitrate: 1_000_000 }),
      });
      const audio = new AudioBufferSource({
        codec: "aac",
        quality: new Quality({ bitrate: 128_000 }),
      });
      output.addVideoTrack(video, { frameRate: 1 });
      output.addAudioTrack(audio);
      await output.start();

      let cursor = 0;
      const timings: { index: number; t_start_ms: number; t_end_ms: number }[] = [];
      let audioMs = 0;
      for (const [index, scene] of storyboard.scenes.entries()) {
        const buffers = audioBuffers[index] ?? [];
        const duration = buffers.reduce((sum, buffer) => sum + buffer.duration, 0);
        if (duration <= 0) throw new Error(`Scene ${index + 1} audio has no duration.`);
        audioMs += duration * 1000;
        const still = await loadImage(`/api/jobs/${jobId}/assets/still-${index}.png`);
        drawScene(context, canvas.width, canvas.height, still, captionOnce(scene.script), scene.highlight);
        await video.add(cursor, duration);
        timings.push({
          index,
          t_start_ms: Math.round(cursor * 1000),
          t_end_ms: Math.round((cursor + duration) * 1000),
        });
        cursor += duration;
        for (const buffer of buffers) await audio.add(buffer);
      }
      await output.finalize();
      const buffer = output.target.buffer;
      if (!buffer || buffer.byteLength < 1000) {
        throw new Error("Mediabunny did not return a playable MP4.");
      }
      if (audioMs < 165_000 || audioMs > 195_000) {
        throw new Error(
          `This cut is ${Math.round(audioMs / 1000)} seconds. The 3 minute preset must be 2:45 to 3:15, so it was not published.`,
        );
      }

      const response = await fetch(`/api/jobs/${jobId}/mp4`, {
        method: "PUT",
        body: buffer,
        headers: {
          "content-type": "video/mp4",
          "x-scene-timings": JSON.stringify(timings),
          "x-encode-ms": String(Math.round(performance.now() - startedAt)),
          "x-audio-ms": String(Math.round(audioMs)),
        },
      });
      if (!response.ok) {
        const failure = (await response.json()) as { error?: string };
        throw new Error(failure.error ?? "Publish failed.");
      }
      const refreshed = await fetch(`/api/jobs/${jobId}`);
      setPayload((await refreshed.json()) as JobPayload);
    } catch (error) {
      started.current = false;
      setEncodeError(error instanceof Error ? error.message : "Encode failed.");
    }
  }

  const job = payload?.job;

  return (
    <section className="ticket">
      <h2>Job {jobId}</h2>
      {!job ? <p>Loading the cloud job.</p> : null}
      {job ? (
        <>
          <p>
            Status: {job.status}. Timing label: {job.timing_label}.
          </p>
          {job.stills_source ? <p>Stills: {job.stills_source}.</p> : null}
          {job.whisper_score !== null ? (
            <p>Whisper token recall: {job.whisper_score.toFixed(3)} (threshold 0.95).</p>
          ) : null}
          {job.source_note ? <p>{job.source_note}</p> : null}
          {job.error ? (
            <p className="error is-visible" role="alert">
              {job.error}
            </p>
          ) : null}
          {encodeError ? (
            <p className="error is-visible" role="alert">
              {encodeError}
            </p>
          ) : null}
          {payload?.encode ? <p className="hint">{payload.encode}</p> : null}
          {job.status === "published" ? (
            <video controls src={`/api/jobs/${jobId}/assets/video.mp4`} />
          ) : null}
          <h3>Stage timings</h3>
          <ul>
            {(payload?.timings ?? []).map((timing) => (
              <li key={timing.stage}>
                {timing.stage}: {(timing.duration_ms / 1000).toFixed(1)} s ({timing.label})
              </li>
            ))}
          </ul>
          <h3>Lineage</h3>
          <div className="table-wrap">
            <table>
              <caption>PROC-EDG-001 scenes with timecode.</caption>
              <thead>
                <tr>
                  <th scope="col">Step</th>
                  <th scope="col">Figure</th>
                  <th scope="col">Start</th>
                  <th scope="col">End</th>
                </tr>
              </thead>
              <tbody>
                {(payload?.lineage ?? []).map((row) => (
                  <tr key={row.scene_index}>
                    <th scope="row">{row.step_label}</th>
                    <td>{row.figure}</td>
                    <td>{formatMs(row.t_start_ms)}</td>
                    <td>{formatMs(row.t_end_ms)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </section>
  );
}

function captionOnce(script: string): string {
  return script
    .replace(/check this figure(?: five one| 5-1)? point again and record it before you start the set\.?/gi, "")
    .replace(/figure five one/gi, "Figure 5-1")
    .replace(/\s+/g, " ")
    .trim();
}

function drawScene(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  image: HTMLImageElement,
  caption: string,
  highlight?: { x: number; y: number } | null,
) {
  const band = 210;
  context.fillStyle = "#14110f";
  context.fillRect(0, 0, width, height);
  const frameWidth = width;
  const frameHeight = height - band;
  const scale = Math.min(frameWidth / image.width, frameHeight / image.height);
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;
  const originX = (frameWidth - drawWidth) / 2;
  const originY = (frameHeight - drawHeight) / 2;
  context.drawImage(image, originX, originY, drawWidth, drawHeight);
  if (highlight && Number.isFinite(highlight.x) && Number.isFinite(highlight.y)) {
    const radius = 70 * scale;
    context.beginPath();
    context.arc(originX + highlight.x * drawWidth, originY + highlight.y * drawHeight, radius, 0, Math.PI * 2);
    context.strokeStyle = "rgba(226, 6, 0, 0.9)";
    context.lineWidth = Math.max(3, 4 * scale);
    context.stroke();
  }
  context.fillStyle = "#f3eee6";
  context.fillRect(0, frameHeight, width, band);
  context.fillStyle = "#1a1512";
  context.font = "22px sans-serif";
  const lines = wrapText(context, caption, width - 64);
  lines.slice(0, 7).forEach((line, index) => {
    context.fillText(line, 32, frameHeight + 28 + index * 26);
  });
}

function wrapText(context: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (context.measureText(next).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Could not load ${url}.`));
    image.src = url;
  });
}
