import { getResolvedPDFJS } from "unpdf";
import { deflateSync } from "node:zlib";

type Callout = {
  id: string;
  test: RegExp;
  highlight: { x: number; y: number };
};

/** Active-callout centers in the full 1280×720 Figure 5-1, as fractions. */
const CALLOUTS: Callout[] = [
  { id: "dipstick", test: /dipstick/i, highlight: { x: 480 / 1280, y: 252 / 720 } },
  { id: "coolant", test: /coolant|sight glass/i, highlight: { x: 640 / 1280, y: 215 / 720 } },
  { id: "fuel", test: /fuel|filter bowl/i, highlight: { x: 590 / 1280, y: 478 / 720 } },
  { id: "lcp", test: /\blcp\b|control panel|battery/i, highlight: { x: 870 / 1280, y: 195 / 720 } },
  { id: "belts", test: /belt/i, highlight: { x: 800 / 1280, y: 480 / 720 } },
];

export type FigureStill = {
  id: string;
  png: Uint8Array;
  source: "pdf-figure";
};

export function matchCallout(step: string, script: string): Callout | null {
  for (const callout of CALLOUTS) {
    if (callout.test.test(step)) return callout;
  }
  for (const callout of CALLOUTS) {
    if (callout.test.test(script)) return callout;
  }
  return null;
}

export function highlightFor(step: string, script: string): { x: number; y: number } | null {
  return matchCallout(step, script)?.highlight ?? null;
}

export async function extractFullFigure51(pdfBytes: Uint8Array): Promise<Uint8Array | null> {
  const pdfjs = await getResolvedPDFJS();
  const document = await pdfjs.getDocument({ data: pdfBytes }).promise;
  let image: { width: number; height: number; data: Uint8Array; kind?: number } | null = null;
  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const text = await page.getTextContent();
    const hasFigure = text.items.some((item) => {
      const value = "str" in item ? String(item.str) : "";
      return /figure\s*5-1/i.test(value);
    });
    if (!hasFigure) continue;
    const ops = await page.getOperatorList();
    for (let index = 0; index < ops.fnArray.length; index += 1) {
      if (ops.fnArray[index] !== pdfjs.OPS.paintImageXObject) continue;
      const name = ops.argsArray[index]?.[0];
      if (typeof name !== "string") continue;
      const object = await new Promise<{
        width: number;
        height: number;
        data: Uint8Array;
        kind?: number;
      }>((resolve) => page.objs.get(name, resolve));
      if (!image || object.width * object.height > image.width * image.height) image = object;
    }
    if (image) break;
  }
  if (!image) return null;
  const rgb = new Uint8Array(image.width * image.height * 3);
  const stride = channels(image);
  for (let index = 0; index < image.width * image.height; index += 1) {
    const pixel = readPixel(image.data, index * stride, image.kind);
    rgb[index * 3] = pixel[0];
    rgb[index * 3 + 1] = pixel[1];
    rgb[index * 3 + 2] = pixel[2];
  }
  return encodePng(image.width, image.height, rgb);
}

function channels(image: { width: number; height: number; data: Uint8Array; kind?: number }): number {
  if (image.kind === 3 || image.data.length === image.width * image.height * 4) return 4;
  if (image.kind === 1 || image.data.length === image.width * image.height) return 1;
  return 3;
}

function readPixel(data: Uint8Array, offset: number, kind?: number): [number, number, number] {
  if (kind === 1) {
    const value = data[offset] ?? 0;
    return [value, value, value];
  }
  return [data[offset] ?? 0, data[offset + 1] ?? 0, data[offset + 2] ?? 0];
}

function encodePng(width: number, height: number, rgb: Uint8Array): Uint8Array {
  const signature = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const header = new Uint8Array(13);
  const view = new DataView(header.buffer);
  view.setUint32(0, width);
  view.setUint32(4, height);
  header[8] = 8;
  header[9] = 2;
  const raw = new Uint8Array(height * (1 + width * 3));
  for (let row = 0; row < height; row += 1) {
    const start = row * (1 + width * 3);
    raw[start] = 0;
    raw.set(rgb.subarray(row * width * 3, (row + 1) * width * 3), start + 1);
  }
  const compressed = deflateSync(raw);
  return concat([signature, chunk("IHDR", header), chunk("IDAT", compressed), chunk("IEND", new Uint8Array())]);
}

function chunk(type: string, data: Uint8Array): Uint8Array {
  const name = new TextEncoder().encode(type);
  const length = new Uint8Array(4);
  new DataView(length.buffer).setUint32(0, data.length);
  const body = concat([name, data]);
  const crc = new Uint8Array(4);
  new DataView(crc.buffer).setUint32(0, crc32(body));
  return concat([length, body, crc]);
}

function concat(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

function crc32(data: Uint8Array): number {
  let crc = ~0;
  for (const byte of data) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return ~crc >>> 0;
}
