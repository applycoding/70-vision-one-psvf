import { WHISPER_THRESHOLD } from "./source";

export { WHISPER_THRESHOLD };

/** Locked metric: multiset token recall of the script against the transcript. */
export function tokenRecall(script: string, transcript: string): number {
  const expected = tokenize(script);
  if (expected.length === 0) return 0;
  const heard = new Map<string, number>();
  for (const token of tokenize(transcript)) {
    heard.set(token, (heard.get(token) ?? 0) + 1);
  }
  let hits = 0;
  for (const token of expected) {
    const count = heard.get(token) ?? 0;
    if (count > 0) {
      hits += 1;
      heard.set(token, count - 1);
    }
  }
  return hits / expected.length;
}

const NUMBER_WORDS: Record<string, string> = {
  zero: "0",
  one: "1",
  two: "2",
  three: "3",
  four: "4",
  five: "5",
  six: "6",
  seven: "7",
  eight: "8",
  nine: "9",
  ten: "10",
};

export function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 0)
    .map((token) => NUMBER_WORDS[token] ?? token);
}

export function passedGate(score: number): boolean {
  return score >= WHISPER_THRESHOLD;
}
