import { WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep } from "cloudflare:workers";
import { passedGate, tokenRecall, WHISPER_THRESHOLD } from "./metrics";
import {
  extractJson,
  fallbackPng,
  modelText,
  parseStoryboard,
  readBytes,
  transcriptText,
  type Scene,
  type Storyboard,
} from "./parse";
import { extractFullFigure51, highlightFor } from "./figures";
import { parseManualPdf } from "./pdf";
import {
  DOCUMENT_ID,
  PROCEDURE_ID,
  REVISION,
  TARGET_DURATION_MS,
} from "./source";

type Params = { jobId: string; respeak?: boolean };

const MIN_SECONDS = 165;
const MAX_SECONDS = 195;
const TARGET_SECONDS = 180;

const stepOptions = {
  retries: { limit: 1, delay: "10 seconds", backoff: "linear" as const },
  timeout: "5 minutes" as const,
};

export class PsvfJob extends WorkflowEntrypoint<Env, Params> {
  async run(event: WorkflowEvent<Params>, step: WorkflowStep) {
    const jobId = event.payload.jobId;
    const env = this.env;

    if (event.payload.respeak) {
      return await step.do("respeak", { ...stepOptions, timeout: "8 minutes" }, async () => {
        return await respeakJob(env, jobId);
      });
    }

    await step.do("mark running", stepOptions, async () => {
      await touch(env, jobId, { status: "running" });
      return { ok: true };
    });

    await step.do("ingest", stepOptions, async () => {
      const started = Date.now();
      const object = await env.BUCKET.get(`${jobId}/manual.pdf`);
      if (!object || object.size < 5) {
        throw new Error("No PDF is stored for this job.");
      }
      const parsed = await parseManualPdf(new Uint8Array(await object.arrayBuffer()));
      await env.BUCKET.put(`${jobId}/source.txt`, parsed.text, {
        httpMetadata: { contentType: "text/plain; charset=utf-8" },
      });
      const note = `pdf.js parsed ${parsed.pageCount} pages from the uploaded manual.pdf. Default manual is S9550-AB-MMA-010_RevA_EDG_Maintenance.pdf.`;
      await env.DB.prepare("UPDATE jobs SET source_note = ?, updated_at = ? WHERE id = ?")
        .bind(note, new Date().toISOString(), jobId)
        .run();
      await recordStage(env, jobId, "ingest", Date.now() - started);
      return { pages: parsed.pageCount, chars: parsed.text.length };
    });

    const storyboard = await step.do("script", stepOptions, async () => {
      const started = Date.now();
      const sourceObject = await env.BUCKET.get(`${jobId}/source.txt`);
      if (!sourceObject) throw new Error("Parsed PDF text is missing.");
      const parsedText = await sourceObject.text();
      const result = await runModel(env, "@cf/zai-org/glm-5.3-flash", {
        messages: [
          {
            role: "system",
            content:
              "You write performance-support narration for a synthetic maintenance demo. Return JSON only.",
          },
          {
            role: "user",
            content: `${parsedText}

Return JSON with this shape:
{"scenes":[{"step":"","script":"","caption":"","duration_ms":36000,"figure":"Fig 5-1","page":"5","still_prompt":""}]}

Rules:
- Exactly 5 scenes, one per inspection point, in order: oil dipstick, coolant sight glass, fuel filter bowls, LCP, belts and belt tension.
- The 3 minute preset is 450 to 490 spoken words total.
- Say "Figure 5-1" when you cite the figure. Do not say "figure five one".
- Do not add a repeated closing line. Each sentence appears once.
- Every script line must stay traceable to PROC-EDG-001 Rev A and Figure 5-1.
- duration_ms for each scene is 36000.
- still_prompt describes a clear technical still of that inspection point on an EDG-450kW, with a short callout label.
- Do not invent a Rev B torque or coolant-mix change. Those belong to other procedures.`,
          },
        ],
        reasoning_effort: "low",
        max_completion_tokens: 4096,
        response_format: { type: "json_object" },
      });
      const board = parseStoryboard(extractJson(modelText(result)));
      const scenes = scaleScenes(board.scenes, TARGET_DURATION_MS).map((scene) => ({
        ...scene,
        script: cleanNarration(scene.script),
        caption: cleanNarration(scene.caption || scene.script),
      }));
      const script = scenes.map((scene) => scene.script).join("\n\n");
      await env.BUCKET.put(`${jobId}/storyboard.json`, JSON.stringify({ scenes }), {
        httpMetadata: { contentType: "application/json" },
      });
      await env.DB.prepare("UPDATE jobs SET script_text = ?, updated_at = ? WHERE id = ?")
        .bind(script, now(), jobId)
        .run();
      await replaceLineage(env, jobId, scenes);
      await recordStage(env, jobId, "script", Date.now() - started);
      return { sceneCount: scenes.length };
    });

    const stills = await step.do("stills", stepOptions, async () => {
      const started = Date.now();
      const board = await readStoryboard(env, jobId);
      const manual = await env.BUCKET.get(`${jobId}/manual.pdf`);
      const figure = manual ? await extractFullFigure51(new Uint8Array(await manual.arrayBuffer())) : null;
      const sources: string[] = [];
      const highlighted = [];
      for (const [index, scene] of board.scenes.entries()) {
        const key = `${jobId}/still-${index}.png`;
        const citesFigure = /5-1|5–1/i.test(`${scene.figure} ${scene.step} ${scene.script}`);
        let source = "lucid-origin";
        if (figure && citesFigure) {
          await env.BUCKET.put(key, figure, { httpMetadata: { contentType: "image/png" } });
          source = "pdf-figure";
        } else {
          try {
            const image = await readBytes(
              await runModel(env, "@cf/leonardo/lucid-origin", {
                prompt: scene.still_prompt,
                width: 512,
                height: 512,
                steps: 4,
                guidance: 4.5,
              }),
            );
            await env.BUCKET.put(key, image, { httpMetadata: { contentType: "image/png" } });
          } catch (error) {
            await env.BUCKET.put(key, fallbackPng(index), {
              httpMetadata: { contentType: "image/png" },
            });
            source = `fallback-png:${error instanceof Error ? error.message : "lucid failed"}`;
          }
        }
        sources.push(source);
        highlighted.push({
          ...scene,
          highlight: source === "pdf-figure" ? highlightFor(scene.step, scene.script) : null,
        });
        await env.DB.prepare(
          "UPDATE lineage SET asset_key = ?, stills_source = ? WHERE job_id = ? AND scene_index = ?",
        )
          .bind(key, source, jobId, index)
          .run();
      }
      const stillsSource = sources.every((source) => source === "pdf-figure")
        ? "pdf-figure"
        : sources.every((source) => source === "lucid-origin")
          ? "lucid-origin"
          : "mixed";
      await env.BUCKET.put(`${jobId}/storyboard.json`, JSON.stringify({ scenes: highlighted }), {
        httpMetadata: { contentType: "application/json" },
      });
      await touch(env, jobId, { stills_source: stillsSource });
      await recordStage(env, jobId, "stills", Date.now() - started);
      return { stillsSource, sceneCount: storyboard.sceneCount };
    });

    await step.do("voice", stepOptions, async () => {
      const started = Date.now();
      const board = await readStoryboard(env, jobId);
      let spoken = await speakScenes(env, jobId, board.scenes);
      for (let attempt = 0; attempt < 2 && (spoken.seconds < MIN_SECONDS || spoken.seconds > MAX_SECONDS); attempt += 1) {
        const factor = TARGET_SECONDS / spoken.seconds;
        const adjusted = spoken.scenes.map((scene) => ({
          ...scene,
          script:
            factor < 1
              ? limitWords(cleanNarration(scene.script), Math.max(40, Math.round(wordCount(scene.script) * factor)))
              : cleanNarration(scene.script),
        }));
        spoken = await speakScenes(env, jobId, adjusted);
      }
      if (spoken.seconds < MIN_SECONDS || spoken.seconds > MAX_SECONDS) {
        throw new Error(
          `Voiceover is ${spoken.seconds.toFixed(1)}s, outside the 3 minute preset of 2:45–3:15.`,
        );
      }
      const script = spoken.scenes.map((scene) => scene.script).join("\n\n");
      await env.BUCKET.put(`${jobId}/storyboard.json`, JSON.stringify({ scenes: spoken.scenes }), {
        httpMetadata: { contentType: "application/json" },
      });
      await env.DB.prepare("UPDATE jobs SET script_text = ?, updated_at = ? WHERE id = ?")
        .bind(script, now(), jobId)
        .run();
      for (const [index, scene] of spoken.scenes.entries()) {
        await env.DB.prepare(
          "UPDATE lineage SET script_line = ? WHERE job_id = ? AND scene_index = ?",
        )
          .bind(scene.script, jobId, index)
          .run();
      }
      await recordStage(env, jobId, "tts", Date.now() - started);
      return { seconds: Math.round(spoken.seconds), files: spoken.scenes.length };
    });

    const gate = await step.do("whisper gate", stepOptions, async () => {
      const started = Date.now();
      const board = await readStoryboard(env, jobId);
      const parts: string[] = [];
      for (const scene of board.scenes) {
        const files = scene.audio_files ?? [];
        for (const name of files) {
          const object = await env.BUCKET.get(`${jobId}/${name}`);
          if (!object) throw new Error(`Audio ${name} is missing.`);
          const audio = new Uint8Array(await object.arrayBuffer());
          const text = transcriptText(
            await runModel(env, "@cf/openai/whisper-large-v3-turbo", {
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
      await touch(env, jobId, {
        status: pass ? "gate_passed" : "blocked",
        whisper_score: score,
        error: pass
          ? null
          : `Whisper gate failed closed. Token recall ${score.toFixed(3)} is below ${WHISPER_THRESHOLD}. No MP4 published.`,
      });
      await recordStage(env, jobId, "whisper", Date.now() - started);
      return { pass, score, stillsSource: stills.stillsSource };
    });

    return gate;
  }
}

async function runModel(env: Env, model: string, input: Record<string, unknown>): Promise<unknown> {
  const ai = env.AI as unknown as {
    run: (model: string, input: Record<string, unknown>) => Promise<unknown>;
  };
  return ai.run(model, input);
}

function scaleScenes(scenes: Scene[], targetMs: number): Scene[] {
  const total = scenes.reduce((sum, scene) => sum + scene.duration_ms, 0);
  if (total === targetMs) return scenes;
  let assigned = 0;
  return scenes.map((scene, index) => {
    const duration =
      index === scenes.length - 1
        ? targetMs - assigned
        : Math.round((scene.duration_ms / total) * targetMs);
    assigned += duration;
    return { ...scene, duration_ms: duration };
  });
}

async function readStoryboard(env: Env, jobId: string): Promise<Storyboard> {
  const object = await env.BUCKET.get(`${jobId}/storyboard.json`);
  if (!object) throw new Error("Storyboard missing.");
  return parseStoryboard(await object.json());
}

async function replaceLineage(env: Env, jobId: string, scenes: Scene[]) {
  await env.DB.prepare("DELETE FROM lineage WHERE job_id = ?").bind(jobId).run();
  let cursor = 0;
  for (const [index, scene] of scenes.entries()) {
    const start = cursor;
    const end = cursor + scene.duration_ms;
    cursor = end;
    await env.DB.prepare(
      `INSERT INTO lineage (
        id, job_id, document_id, revision, procedure_id, step_label, script_line,
        scene_index, figure, page_ref, asset_key, t_start_ms, t_end_ms
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        crypto.randomUUID(),
        jobId,
        DOCUMENT_ID,
        REVISION,
        PROCEDURE_ID,
        scene.step,
        scene.script,
        index,
        scene.figure,
        scene.page,
        null,
        start,
        end,
      )
      .run();
  }
}

async function recordStage(env: Env, jobId: string, stage: string, durationMs: number) {
  await env.DB.prepare(
    `INSERT INTO stage_timings (job_id, stage, duration_ms, label)
     VALUES (?, ?, ?, 'ESTIMATED')
     ON CONFLICT(job_id, stage) DO UPDATE SET duration_ms = excluded.duration_ms, label = 'ESTIMATED'`,
  )
    .bind(jobId, stage, durationMs)
    .run();
}

async function touch(
  env: Env,
  jobId: string,
  patch: {
    status?: string;
    stills_source?: string;
    whisper_score?: number;
    error?: string | null;
  },
) {
  const job = await env.DB.prepare(
    "SELECT status, stills_source, whisper_score, error FROM jobs WHERE id = ?",
  )
    .bind(jobId)
    .first<{
      status: string;
      stills_source: string | null;
      whisper_score: number | null;
      error: string | null;
    }>();
  if (!job) throw new Error("Job row missing.");
  await env.DB.prepare(
    `UPDATE jobs
     SET status = ?, stills_source = ?, whisper_score = ?, error = ?, updated_at = ?
     WHERE id = ?`,
  )
    .bind(
      patch.status ?? job.status,
      patch.stills_source ?? job.stills_source,
      patch.whisper_score ?? job.whisper_score,
      patch.error === undefined ? job.error : patch.error,
      now(),
      jobId,
    )
    .run();
}

function now(): string {
  return new Date().toISOString();
}

async function speakScenes(env: Env, jobId: string, scenes: Scene[]) {
  let seconds = 0;
  const spoken: Scene[] = [];
  for (const [index, scene] of scenes.entries()) {
    const script = cleanNarration(scene.script);
    const chunks = chunkText(script, 1800);
    const audioFiles: string[] = [];
    for (const [part, chunk] of chunks.entries()) {
      const name = chunks.length === 1 ? `audio-${index}.mp3` : `audio-${index}-${part}.mp3`;
      const audio = await readBytes(
        await runModel(env, "@cf/deepgram/aura-2-en", {
          text: chunk,
          encoding: "mp3",
          speaker: "luna",
        }),
      );
      if (audio.byteLength < 500) throw new Error(`Aura-2 EN returned no audio for scene ${index + 1}.`);
      seconds += mp3DurationSeconds(audio);
      await env.BUCKET.put(`${jobId}/${name}`, audio, {
        httpMetadata: { contentType: "audio/mpeg" },
      });
      audioFiles.push(name);
    }
    spoken.push({ ...scene, script, audio_files: audioFiles });
  }
  return { scenes: spoken, seconds };
}

function wordCount(value: string): number {
  return value.split(/\s+/).filter(Boolean).length;
}

function cleanNarration(script: string): string {
  return script
    .replace(/check this figure(?: five one| 5-1)? point again and record it before you start the set\.?/gi, "")
    .replace(/figure five one/gi, "Figure 5-1")
    .replace(/\s+/g, " ")
    .trim();
}

export async function respeakJob(env: Env, jobId: string) {
  const started = Date.now();
  const board = await readStoryboard(env, jobId);
  const prepared = board.scenes.map((scene) => ({
    ...scene,
    script: limitWords(cleanNarration(scene.script), 90),
  }));
  let spoken = await speakScenes(env, jobId, prepared);
  if (spoken.seconds < MIN_SECONDS || spoken.seconds > MAX_SECONDS) {
    const factor = TARGET_SECONDS / spoken.seconds;
    spoken = await speakScenes(
      env,
      jobId,
      spoken.scenes.map((scene) => ({
        ...scene,
        script:
          factor < 1
            ? limitWords(cleanNarration(scene.script), Math.max(40, Math.round(wordCount(scene.script) * factor)))
            : cleanNarration(scene.script),
      })),
    );
  }
  if (spoken.seconds < MIN_SECONDS || spoken.seconds > MAX_SECONDS) {
    throw new Error(`Voiceover is ${spoken.seconds.toFixed(1)}s, outside the 3 minute preset of 2:45–3:15.`);
  }
  const script = spoken.scenes.map((scene) => scene.script).join("\n\n");
  await env.BUCKET.put(`${jobId}/storyboard.json`, JSON.stringify({ scenes: spoken.scenes }), {
    httpMetadata: { contentType: "application/json" },
  });
  await env.DB.prepare("UPDATE jobs SET script_text = ?, updated_at = ? WHERE id = ?")
    .bind(script, now(), jobId)
    .run();
  for (const [index, scene] of spoken.scenes.entries()) {
    await env.DB.prepare("UPDATE lineage SET script_line = ? WHERE job_id = ? AND scene_index = ?")
      .bind(scene.script, jobId, index)
      .run();
  }
  const parts: string[] = [];
  for (const scene of spoken.scenes) {
    for (const name of scene.audio_files ?? []) {
      const object = await env.BUCKET.get(`${jobId}/${name}`);
      if (!object) throw new Error(`Audio ${name} is missing.`);
      const audio = new Uint8Array(await object.arrayBuffer());
      parts.push(
        transcriptText(
          await runModel(env, "@cf/openai/whisper-large-v3-turbo", {
            audio: bytesToBase64(audio),
            language: "en",
            task: "transcribe",
          }),
        ),
      );
    }
  }
  const transcript = parts.join(" ").trim();
  const score = tokenRecall(script, transcript);
  const pass = transcript.length > 0 && passedGate(score);
  await env.BUCKET.put(`${jobId}/transcript.txt`, transcript, {
    httpMetadata: { contentType: "text/plain; charset=utf-8" },
  });
  await recordStage(env, jobId, "tts", Date.now() - started);
  await recordStage(env, jobId, "whisper", Date.now() - started);
  await touch(env, jobId, {
    status: pass ? "gate_passed" : "blocked",
    whisper_score: score,
    error: pass
      ? null
      : `Whisper gate failed closed. Token recall ${score.toFixed(3)} is below ${WHISPER_THRESHOLD}. No MP4 published.`,
  });
  return { pass, score, seconds: Math.round(spoken.seconds) };
}

function limitWords(value: string, maxWords: number): string {
  const words = value.split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return value.trim();
  const cut = words.slice(0, maxWords).join(" ");
  const stop = cut.lastIndexOf(".");
  return (stop > 40 ? cut.slice(0, stop + 1) : cut).trim();
}

function mp3DurationSeconds(bytes: Uint8Array): number {
  let offset = 0;
  if (bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33 && bytes.length > 10) {
    const size =
      ((bytes[6] & 0x7f) << 21) |
      ((bytes[7] & 0x7f) << 14) |
      ((bytes[8] & 0x7f) << 7) |
      (bytes[9] & 0x7f);
    offset = 10 + size;
  }
  const mpeg1Rates = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0];
  const mpeg2Rates = [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, 0];
  let duration = 0;
  while (offset + 4 < bytes.length) {
    if (bytes[offset] !== 0xff || (bytes[offset + 1] & 0xe0) !== 0xe0) {
      offset += 1;
      continue;
    }
    const version = (bytes[offset + 1] >> 3) & 3;
    const layer = (bytes[offset + 1] >> 1) & 3;
    const bitrateIndex = (bytes[offset + 2] >> 4) & 15;
    const sampleIndex = (bytes[offset + 2] >> 2) & 3;
    const padding = (bytes[offset + 2] >> 1) & 1;
    if (layer !== 1 || bitrateIndex === 0 || bitrateIndex === 15 || sampleIndex === 3) {
      offset += 1;
      continue;
    }
    const bitrate = (version === 3 ? mpeg1Rates : mpeg2Rates)[bitrateIndex] * 1000;
    const sampleRate =
      version === 3
        ? [44100, 48000, 32000][sampleIndex]
        : version === 2
          ? [22050, 24000, 16000][sampleIndex]
          : [11025, 12000, 8000][sampleIndex];
    const samples = version === 3 ? 1152 : 576;
    const frameLength = Math.floor((samples / 8) * (bitrate / sampleRate)) + padding;
    if (frameLength < 4) {
      offset += 1;
      continue;
    }
    duration += samples / sampleRate;
    offset += frameLength;
  }
  return duration;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const size = 0x8000;
  for (let index = 0; index < bytes.length; index += size) {
    binary += String.fromCharCode(...bytes.subarray(index, index + size));
  }
  return btoa(binary);
}

function chunkText(value: string, limit: number): string[] {
  if (value.length <= limit) return [value];
  const chunks: string[] = [];
  let rest = value.trim();
  while (rest.length > limit) {
    const slice = rest.slice(0, limit);
    const breakAt = Math.max(slice.lastIndexOf(". "), slice.lastIndexOf(" "));
    const cut = breakAt > 200 ? breakAt + 1 : limit;
    chunks.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }
  if (rest) chunks.push(rest);
  return chunks;
}
