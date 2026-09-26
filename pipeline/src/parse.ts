export type Scene = {
  step: string;
  script: string;
  caption: string;
  duration_ms: number;
  figure: string;
  page: string;
  still_prompt: string;
  audio_files?: string[];
  highlight?: { x: number; y: number } | null;
};

export type Storyboard = {
  scenes: Scene[];
};

const FALLBACK_PNGS = [
  "iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAIAAAAlC+aJAAAAeUlEQVR4nO3PUQkAIBTAwNdABPtnNYQfhzBYgNucvb5uuKABLWhACxrQgga0oAEtaEALGtCCBrSgAS1oQAsa0IIGtKABLWhACxrQgga0oAEtaEALGtCCBrSgAS1oQAsa0IIGtKABLWhACxrQgga0oAEtaEALGtCCBrSgAS1oQAsa0IIGtKABLWhACxrQgga0oAEtaEALGtCCxy4Yo0Au6ROH/AAAAABJRU5ErkJggg==",
  "iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAIAAAAlC+aJAAAAeUlEQVR4nO3PQQkAMAzAwL7m3+KcVMQexyAQAZe5Z77OCxrQgga0oAEtaEALGtCCBrSgAS1oQAsa0IIGtKABLWhACxrQgga0oAEtaEALGtCCBrSgAS1oQAsa0IIGtKABLWhACxrQgga0oAEtaEALGtCCBrSgAS1oQAsa0IIGtKABLWhACxrQgga0oAEtaEALGtCCBrSgAS14bAGq0HDTCJgtMgAAAABJRU5ErkJggg==",
  "iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAIAAAAlC+aJAAAAe0lEQVR4nO3PUQkAIBTAwNc/iCWMYClD+HEIgwW4zdnr64YLGtCCBrSgAS1oQAsa0IIGtKABLWhACxrQgga0oAEtaEALGtCCBrSgAS1oQAsa0IIGtKABLWhACxrQgga0oAEtaEALGtCCBrSgAS1oQAsa0IIGtKABLWhACxrQgga0oAEtaEALGtCCBrSgAS1oQAsa0IIGtKABLXjsAqJlwf9unJdHAAAAAElFTkSuQmCC",
  "iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAIAAAAlC+aJAAAAeklEQVR4nO3PsQkAIBDAwN/CxtL9Z3QIi0MIZIDLnL2+brigAS1oQAsa0IIGtKABLWhACxrQgga0oAEtaEALGtCCBrSgAS1oQAsa0IIGtKABLWhACxrQgga0oAEtaEALGtCCBrSgAS1oQAsa0IIGtKABLWhACxrQgga0oAEtaEALGtCCBrSgAS1oQAsa0IIGtKABLWhACxrQgscusGpwTBbq8yAAAAAASUVORK5CYII=",
  "iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAIAAAAlC+aJAAAAeklEQVR4nO3PsQkAIBDAwB/T2gHcv3QIi0MIZIDLnL2+brigAS1oQAsa0IIGtKABLWhACxrQgga0oAEtaEALGtCCBrSgAS1oQAsa0IIGtKABLWhACxrQgga0oAEtaEALGtCCBrSgAS1oQAsa0IIGtKABLWhACxrQgga0oAEtaEALGtCCBrSgAS1oQAsa0IIGtKABLWhACxrQgscuuIWBDy6ImKkAAAAASUVORK5CYII=",
];

export function fallbackPng(sceneIndex: number): Uint8Array {
  const encoded = FALLBACK_PNGS[sceneIndex % FALLBACK_PNGS.length] ?? FALLBACK_PNGS[0];
  const binary = atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

export function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced?.[1] ?? text;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end < start) {
    throw new Error("Model did not return JSON.");
  }
  return JSON.parse(raw.slice(start, end + 1));
}

export function modelText(result: unknown): string {
  if (!result || typeof result !== "object") {
    throw new Error("Empty model response.");
  }
  const record = result as {
    response?: unknown;
    choices?: { message?: { content?: unknown } }[];
  };
  const content = record.choices?.[0]?.message?.content;
  if (typeof content === "string" && content.trim()) return content;
  if (typeof record.response === "string" && record.response.trim()) return record.response;
  throw new Error("Model response had no text.");
}

export function parseStoryboard(value: unknown): Storyboard {
  if (!value || typeof value !== "object" || !("scenes" in value)) {
    throw new Error("Storyboard JSON has no scenes array.");
  }
  const scenesValue = (value as { scenes: unknown }).scenes;
  if (!Array.isArray(scenesValue) || scenesValue.length === 0) {
    throw new Error("Storyboard scenes array is empty.");
  }
  const scenes = scenesValue.map((scene, index) => {
    if (!scene || typeof scene !== "object") {
      throw new Error(`Scene ${index + 1} is not an object.`);
    }
    const row = scene as Record<string, unknown>;
    const script = requiredString(row.script, `scene ${index + 1} script`);
    return {
      step: requiredString(row.step, `scene ${index + 1} step`),
      script,
      caption: stringOr(row.caption, script),
      duration_ms: positiveInt(row.duration_ms, 36_000),
      figure: stringOr(row.figure, "Fig 5-1"),
      page: stringOr(row.page, "5"),
      still_prompt: stringOr(row.still_prompt, script),
      audio_files: Array.isArray(row.audio_files)
        ? row.audio_files.filter((name): name is string => typeof name === "string")
        : undefined,
      highlight: point(row.highlight),
    } satisfies Scene;
  });
  return { scenes };
}

function point(value: unknown): { x: number; y: number } | null {
  if (!value || typeof value !== "object") return null;
  const row = value as { x?: unknown; y?: unknown };
  const x = Number(row.x);
  const y = Number(row.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return { x, y };
}

function requiredString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Missing ${label}.`);
  }
  return value.trim();
}

function stringOr(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function positiveInt(value: unknown, fallback: number): number {
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number) || number <= 0) return fallback;
  return Math.round(number);
}

export async function readBytes(result: unknown): Promise<Uint8Array> {
  if (result instanceof ReadableStream) {
    return new Uint8Array(await new Response(result).arrayBuffer());
  }
  if (result instanceof Response) {
    return new Uint8Array(await result.arrayBuffer());
  }
  if (result && typeof result === "object" && "image" in result) {
    const image = (result as { image: unknown }).image;
    if (typeof image === "string") {
      const binary = atob(image);
      const bytes = new Uint8Array(binary.length);
      for (let index = 0; index < binary.length; index += 1) {
        bytes[index] = binary.charCodeAt(index);
      }
      return bytes;
    }
  }
  throw new Error("AI response was not audio or an image.");
}

export function transcriptText(result: unknown): string {
  if (!result || typeof result !== "object") return "";
  const text = (result as { text?: unknown }).text;
  return typeof text === "string" ? text.trim() : "";
}
