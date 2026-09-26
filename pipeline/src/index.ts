import { respeakJob } from "./workflow";
import { passedGate, tokenRecall } from "./metrics";
import { bundledManual } from "./pdf";
import { parseStoryboard, transcriptText } from "./parse";
import { PROCEDURE_ID, SOURCE_NOTE, WHISPER_THRESHOLD } from "./source";

export { PsvfJob } from "./workflow";

const ASSET_NAME = /^(manual\.pdf|source\.txt|storyboard\.json|audio\.mp3|audio-\d+(?:-\d+)?\.mp3|transcript\.txt|video\.mp4|still-\d+\.png)$/;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const parts = url.pathname.split("/").filter(Boolean);

    try {
      if (request.method === "GET" && parts.length === 1 && parts[0] === "manual") {
        const bytes = bundledManual();
        return new Response(bytes, {
          headers: {
            "content-type": "application/pdf",
            "content-disposition": "attachment; filename=\"S9550-AB-MMA-010_RevA_EDG_Maintenance.pdf\"",
          },
        });
      }
      if (request.method === "GET" && parts[0] === "jobs" && parts[1] === "latest") {
        return await readLatest(env);
      }
      if (request.method === "POST" && parts.length === 1 && parts[0] === "jobs") {
        return await createJob(request, env);
      }
      if (parts[0] === "jobs" && parts[1]) {
        const jobId = parts[1];
        if (request.method === "GET" && parts.length === 2) return await readJob(env, jobId);
        if (request.method === "GET" && parts[2] === "assets" && parts[3]) {
          return await readAsset(env, jobId, parts[3]);
        }
        if (request.method === "PUT" && parts[2] === "mp4") {
          return await publishMp4(request, env, jobId);
        }
        if (request.method === "POST" && parts[2] === "continue") {
          return await continueGate(env, jobId);
        }
        if (request.method === "POST" && parts[2] === "respeak") {
          const instance = await env.JOB_WORKFLOW.create({
            params: { jobId, respeak: true },
          });
          return Response.json({ id: jobId, workflowId: instance.id, status: "respeak_queued" }, { status: 202 });
        }
      }
      return Response.json({ error: "Not found." }, { status: 404 });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Pipeline request failed.";
      return Response.json({ error: message }, { status: 500 });
    }
  },
} satisfies ExportedHandler<Env>;

async function createJob(request: Request, env: Env): Promise<Response> {
  const pdf = new Uint8Array(await request.arrayBuffer());
  if (pdf.byteLength < 5) {
    return Response.json({ error: "Choose a PDF. Empty files are rejected." }, { status: 400 });
  }
  const header = new TextDecoder().decode(pdf.subarray(0, 5));
  if (header !== "%PDF-") {
    return Response.json({ error: "The upload is not a PDF." }, { status: 400 });
  }

  const existing = await env.DB.prepare(
    `SELECT id, status FROM jobs
     WHERE procedure_id = ?
       AND status IN ('queued', 'running', 'gate_passed')
     ORDER BY created_at DESC
     LIMIT 1`,
  )
    .bind(PROCEDURE_ID)
    .first<{ id: string; status: string }>();
  if (existing) {
    return Response.json({ id: existing.id, status: existing.status, reused: true });
  }

  const id = crypto.randomUUID();
  const timestamp = new Date().toISOString();
  await env.BUCKET.put(`${id}/manual.pdf`, pdf, {
    httpMetadata: { contentType: "application/pdf" },
  });
  await env.DB.prepare(
    `INSERT INTO jobs (
      id, procedure_id, status, timing_label, whisper_threshold, source_note, created_at, updated_at
    ) VALUES (?, ?, 'queued', 'ESTIMATED', ?, ?, ?, ?)`,
  )
    .bind(id, PROCEDURE_ID, WHISPER_THRESHOLD, SOURCE_NOTE, timestamp, timestamp)
    .run();

  await env.JOB_WORKFLOW.create({ id, params: { jobId: id } });
  return Response.json({ id, status: "queued", reused: false }, { status: 201 });
}

async function readLatest(env: Env): Promise<Response> {
  const row = await env.DB.prepare(
    `SELECT id FROM jobs
     WHERE procedure_id = ? AND status = 'published'
     ORDER BY created_at DESC
     LIMIT 1`,
  )
    .bind(PROCEDURE_ID)
    .first<{ id: string }>();
  if (!row) return Response.json({ error: "No published job." }, { status: 404 });
  return readJob(env, row.id);
}

async function readJob(env: Env, jobId: string): Promise<Response> {
  const job = await env.DB.prepare("SELECT * FROM jobs WHERE id = ?").bind(jobId).first();
  if (!job) return Response.json({ error: "Job not found." }, { status: 404 });
  const { results: timings } = await env.DB.prepare(
    "SELECT stage, duration_ms, label FROM stage_timings WHERE job_id = ? ORDER BY stage",
  )
    .bind(jobId)
    .all();
  const { results: lineage } = await env.DB.prepare(
    `SELECT scene_index, step_label, script_line, figure, page_ref, asset_key, stills_source, t_start_ms, t_end_ms
     FROM lineage WHERE job_id = ? ORDER BY scene_index`,
  )
    .bind(jobId)
    .all();
  return Response.json({
    job,
    timings,
    lineage,
    encode:
      "Chrome Mediabunny + WebCodecs. Workers have no WebCodecs, so the MP4 is composed in the browser after the Whisper gate passes.",
    metric: "Multiset token recall of the narration script against the Whisper transcript. Threshold 0.95. Fail closed.",
  });
}

async function readAsset(env: Env, jobId: string, name: string): Promise<Response> {
  if (!ASSET_NAME.test(name)) return Response.json({ error: "Unknown asset." }, { status: 400 });
  if (name === "video.mp4") {
    const job = await env.DB.prepare("SELECT status FROM jobs WHERE id = ?")
      .bind(jobId)
      .first<{ status: string }>();
    if (job?.status !== "published") {
      return Response.json({ error: "No published MP4." }, { status: 404 });
    }
  }
  const object = await env.BUCKET.get(`${jobId}/${name}`);
  if (!object) return Response.json({ error: "Asset not found." }, { status: 404 });
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  return new Response(object.body, { headers });
}

async function publishMp4(request: Request, env: Env, jobId: string): Promise<Response> {
  const job = await env.DB.prepare("SELECT status, whisper_score FROM jobs WHERE id = ?")
    .bind(jobId)
    .first<{ status: string; whisper_score: number | null }>();
  if (!job) return Response.json({ error: "Job not found." }, { status: 404 });
  if (job.status === "blocked" || (job.whisper_score ?? 0) < WHISPER_THRESHOLD) {
    return Response.json({ error: "Whisper gate blocked publish." }, { status: 409 });
  }
  if (job.status !== "gate_passed" && job.status !== "published") {
    return Response.json({ error: "Job is not ready to publish." }, { status: 409 });
  }

  const timingsHeader = request.headers.get("x-scene-timings");
  if (!timingsHeader) return Response.json({ error: "Scene timings are required." }, { status: 400 });
  const timings = JSON.parse(timingsHeader) as { index: number; t_start_ms: number; t_end_ms: number }[];
  if (!Array.isArray(timings) || timings.length === 0) {
    return Response.json({ error: "Scene timings are empty." }, { status: 400 });
  }
  for (const timing of timings) {
    if (!Number.isFinite(timing.t_start_ms) || timing.t_end_ms <= timing.t_start_ms) {
      return Response.json({ error: "A scene timecode is empty." }, { status: 400 });
    }
  }
  const bytes = new Uint8Array(await request.arrayBuffer());
  if (bytes.byteLength < 1000) {
    return Response.json({ error: "MP4 payload is empty." }, { status: 400 });
  }

  await env.BUCKET.put(`${jobId}/video.mp4`, bytes, {
    httpMetadata: { contentType: "video/mp4" },
  });
  for (const timing of timings) {
    await env.DB.prepare(
      "UPDATE lineage SET t_start_ms = ?, t_end_ms = ? WHERE job_id = ? AND scene_index = ?",
    )
      .bind(timing.t_start_ms, timing.t_end_ms, jobId, timing.index)
      .run();
  }

  const encodeMs = Number(request.headers.get("x-encode-ms") ?? "0");
  const audioMs = Number(request.headers.get("x-audio-ms") ?? "0");
  if (encodeMs > 0) {
    await env.DB.prepare(
      `INSERT INTO stage_timings (job_id, stage, duration_ms, label)
       VALUES (?, 'encode', ?, 'MEASURED')
       ON CONFLICT(job_id, stage) DO UPDATE SET duration_ms = excluded.duration_ms, label = 'MEASURED'`,
    )
      .bind(jobId, Math.round(encodeMs))
      .run();
  }
  await env.DB.prepare("UPDATE stage_timings SET label = 'MEASURED' WHERE job_id = ?")
    .bind(jobId)
    .run();
  await env.DB.prepare(
    `UPDATE jobs
     SET status = 'published', timing_label = 'MEASURED', mp4_key = ?, audio_duration_ms = ?, updated_at = ?, error = NULL
     WHERE id = ?`,
  )
    .bind(`${jobId}/video.mp4`, Math.round(audioMs), new Date().toISOString(), jobId)
    .run();

  return Response.json({ id: jobId, status: "published" });
}

async function continueGate(env: Env, jobId: string): Promise<Response> {
  const started = Date.now();
  const storyboardObject = await env.BUCKET.get(`${jobId}/storyboard.json`);
  if (!storyboardObject) return Response.json({ error: "Storyboard missing." }, { status: 404 });
  const board = parseStoryboard(await storyboardObject.json());
  const parts: string[] = [];
  for (const [index, scene] of board.scenes.entries()) {
    const files = scene.audio_files?.length ? scene.audio_files : [`audio-${index}.mp3`];
    for (const name of files) {
      const audioObject = await env.BUCKET.get(`${jobId}/${name}`);
      if (!audioObject) return Response.json({ error: `Missing ${name}.` }, { status: 404 });
      const audio = new Uint8Array(await audioObject.arrayBuffer());
      const text = transcriptText(
        await runAi(env, "@cf/openai/whisper-large-v3-turbo", {
          audio: bytesToBase64(audio),
          language: "en",
          task: "transcribe",
        }),
      );
      parts.push(text);
    }
  }
  const transcript = parts.join(" ").trim();
  const job = await env.DB.prepare("SELECT script_text FROM jobs WHERE id = ?")
    .bind(jobId)
    .first<{ script_text: string | null }>();
  const score = tokenRecall(job?.script_text ?? "", transcript);
  const pass = transcript.length > 0 && passedGate(score);
  await env.BUCKET.put(`${jobId}/transcript.txt`, transcript, {
    httpMetadata: { contentType: "text/plain; charset=utf-8" },
  });
  await env.DB.prepare(
    `INSERT INTO stage_timings (job_id, stage, duration_ms, label)
     VALUES (?, 'whisper', ?, 'ESTIMATED')
     ON CONFLICT(job_id, stage) DO UPDATE SET duration_ms = excluded.duration_ms, label = 'ESTIMATED'`,
  )
    .bind(jobId, Date.now() - started)
    .run();
  await env.DB.prepare(
    `UPDATE jobs SET status = ?, whisper_score = ?, error = ?, updated_at = ? WHERE id = ?`,
  )
    .bind(
      pass ? "gate_passed" : "blocked",
      score,
      pass
        ? null
        : `Whisper gate failed closed. Token recall ${score.toFixed(3)} is below ${WHISPER_THRESHOLD}. No MP4 published.`,
      new Date().toISOString(),
      jobId,
    )
    .run();
  return Response.json({ pass, score, status: pass ? "gate_passed" : "blocked" });
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const size = 0x8000;
  for (let index = 0; index < bytes.length; index += size) {
    binary += String.fromCharCode(...bytes.subarray(index, index + size));
  }
  return btoa(binary);
}

async function runAi(env: Env, model: string, input: Record<string, unknown>): Promise<unknown> {
  const ai = env.AI as unknown as {
    run: (model: string, input: Record<string, unknown>) => Promise<unknown>;
  };
  return ai.run(model, input);
}
