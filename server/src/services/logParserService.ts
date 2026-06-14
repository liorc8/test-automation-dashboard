import { redactSensitive } from "../utils/failureText";

const EXPIRED_MSG =
  "Log file is no longer available on Jenkins. Please use the Full Log link.";

export type ExpandLogResult =
  | { available: true; lines: string[]; source: "parsed" | "fallback" }
  | { available: false; error: string };

// In-memory cache keyed by logUrl (per spec).
const cache = new Map<string, ExpandLogResult>();

function lastN(lines: string[], n: number): string[] {
  return lines.slice(Math.max(0, lines.length - n));
}

// Extract the block from the testName line down to the FATAL line (inclusive).
function parseBlock(rawText: string, testName: string): { lines: string[]; source: "parsed" | "fallback" } {
  const lines = rawText.split(/\r?\n/);

  let fatalIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("FATAL")) { fatalIdx = i; break; }
  }
  if (fatalIdx === -1) return { lines: lastN(lines, 100), source: "fallback" };

  let startIdx = -1;
  if (testName) {
    for (let i = fatalIdx; i >= 0; i--) {
      if (lines[i].includes(testName)) { startIdx = i; break; }
    }
  }
  if (startIdx === -1) return { lines: lastN(lines, 100), source: "fallback" };

  return { lines: lines.slice(startIdx, fatalIdx + 1), source: "parsed" };
}

export async function expandLog(logUrl: string, testName: string): Promise<ExpandLogResult> {
  const cached = cache.get(logUrl);
  if (cached) return cached;

  let rawText: string;
  try {
    const resp = await fetch(logUrl);
    if (!resp.ok) {
      return { available: false, error: EXPIRED_MSG };
    }
    rawText = await resp.text();
  } catch {
    return { available: false, error: EXPIRED_MSG };
  }

  const { lines, source } = parseBlock(rawText, testName);
  const redacted = lines.map((l) => redactSensitive(l));
  const result: ExpandLogResult = { available: true, lines: redacted, source };

  cache.set(logUrl, result);
  return result;
}
