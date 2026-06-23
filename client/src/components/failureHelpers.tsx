// Shared helpers for failure cards, logs, and screenshots.

export const WINDOW_DAYS = 10;

// Error markers we highlight / anchor on — includes JVM OOM crashes.
const ERROR_MARKERS = ["FATAL", "OUTOFMEMORYERROR", "JAVA HEAP SPACE"];
function isErrorLine(line: string): boolean {
  const u = line.toUpperCase();
  return ERROR_MARKERS.some((m) => u.includes(m));
}

export function renderLogLines(lines: string[]) {
  return lines.map((line, i) => {
    const isFatal = isErrorLine(line);
    return (
      <div
        key={i}
        style={{
          display: "block",
          background: isFatal ? "rgba(239,68,68,0.15)" : "transparent",
          color: isFatal ? "#fca5a5" : "#ffffff",
          fontWeight: isFatal ? 700 : "normal",
          borderLeft: isFatal ? "3px solid #ef4444" : "3px solid transparent",
          padding: "1px 8px",
          lineHeight: 1.55,
        }}
      >
        {line || " "}
      </div>
    );
  });
}

export function truncateLogToTestScope(logText: string, testName: string): string[] {
  const lines = logText.split(/\r?\n/).filter(l => l.trim() !== "");
  let fatalIdx = -1;
  for (let i = lines.length - 1; i >= 0; i--) {
    if (isErrorLine(lines[i])) { fatalIdx = i; break; }
  }
  if (fatalIdx === -1) return lines.slice(Math.max(0, lines.length - 40));
  const nameLower = testName.toLowerCase();
  let startIdx = Math.max(0, fatalIdx - 60);
  for (let i = fatalIdx - 1; i >= Math.max(0, fatalIdx - 60); i--) {
    if (lines[i].toLowerCase().includes(nameLower)) { startIdx = i; break; }
  }
  return lines.slice(startIdx, fatalIdx + 1);
}

export function dateOnly(value: string | null | undefined): string | null {
  if (!value) return null;
  return value.split("T")[0].split(" ")[0];
}

export function severityColor(count: number): string {
  if (count >= 10) return "#dc2626";
  if (count >= 5) return "#ea580c";
  if (count >= 3) return "#f59e0b";
  return "#ef4444";
}

export function extractFatalPreview(text: string): string[] {
  const lines = text.split(/\r?\n/);
  let fatalIdx = -1;
  for (let i = lines.length - 1; i >= 0; i--) {
    if (isErrorLine(lines[i])) { fatalIdx = i; break; }
  }
  if (fatalIdx === -1) return lines.slice(Math.max(0, lines.length - 4)).filter(l => l.trim() !== "");
  return lines.slice(Math.max(0, fatalIdx - 3), fatalIdx + 1).filter(l => l.trim() !== "");
}

/** Returns only the line containing FATAL; falls back to the first non-empty line. */
export function extractFatalLine(text: string | null | undefined): string {
  if (!text) return "";
  const lines = text.split(/\r?\n/);
  const fatal = lines.find((l) => l.includes("FATAL"));
  if (fatal) return fatal.trim();
  const firstNonEmpty = lines.find((l) => l.trim() !== "");
  return (firstNonEmpty ?? "").trim();
}

// ─── Date / time / duration formatting ────────────────────────────────────────

function hasTimeComponent(value: string): boolean {
  return /[T ]\d{2}:\d{2}/.test(value);
}

/** Formats a date string as DD/MM/YYYY, appending HH:mm when the source has a time. */
export function formatDateTime(value: string | null | undefined): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  if (!hasTimeComponent(value)) return `${dd}/${mm}/${yyyy}`;
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
}

/** Formats a date string as DD/MM/YYYY only (never a time component). */
export function formatDateOnly(value: string | null | undefined): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
}

function toMs(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === "number" && isFinite(value)) return value < 1e12 ? value * 1000 : value; // seconds vs ms
  const d = new Date(value as string);
  return isNaN(d.getTime()) ? null : d.getTime();
}

// A single real test run shouldn't exceed ~2h; anything beyond is a corrupt/frozen
// row or a fallback-math artifact (e.g. a null timestamp read as the Unix epoch).
const MAX_RUNTIME_SECONDS = 120 * 60;

/**
 * Computes a runtime label like `2m 15s` / `15s`. Prefers an explicit duration
 * (`duration`/`runTime`/`runtime`, seconds or ms when large); otherwise derives it
 * from start/end timestamps under any common key variant.
 * Returns "" when nothing usable is available, or "Timeout" for impossible
 * (> 2h) values so an outlier never renders a distorted number.
 */
export function formatDuration(input: Record<string, any> | null | undefined): string {
  if (!input || typeof input !== "object") return "";

  let seconds: number | null = null;
  const explicit = input.duration ?? input.runTime ?? input.runtime ?? input.durationMs ?? input.elapsed;
  if (typeof explicit === "number" && isFinite(explicit) && explicit >= 0) {
    seconds = explicit > 100000 ? Math.round(explicit / 1000) : Math.round(explicit);
  } else {
    const start = toMs(input.startTime ?? input.startedAt ?? input.start_time ?? input.startTimeUnix ?? input.startingTimeUnix);
    const end = toMs(input.endTime ?? input.endedAt ?? input.end_time ?? input.endTimeUnix ?? input.endingTimeUnix);
    if (start != null && end != null && end >= start) seconds = Math.round((end - start) / 1000);
  }
  if (seconds == null) return "";
  // Sanity guard: clamp impossible runtimes instead of rendering e.g. "1489m 44s".
  if (seconds > MAX_RUNTIME_SECONDS) return "Timeout";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}
