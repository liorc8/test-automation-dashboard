import { describe, it, expect } from "vitest";
import { formatDuration, formatDateOnly, formatDateTime, extractFatalLine } from "../failureHelpers";

describe("formatDuration", () => {
  it("formats an explicit duration in seconds", () => {
    expect(formatDuration({ duration: 135 })).toBe("2m 15s");
  });

  it("formats sub-minute durations without minutes", () => {
    expect(formatDuration({ duration: 42 })).toBe("42s");
  });

  it("treats large explicit values as milliseconds", () => {
    expect(formatDuration({ duration: 135000 })).toBe("2m 15s");
  });

  it("reads alternate key names (totalRunTime-style via runTime)", () => {
    expect(formatDuration({ runTime: 90 })).toBe("1m 30s");
  });

  it("calculates the delta between start/end timestamps (unix seconds)", () => {
    expect(formatDuration({ startTime: 1_000, endTime: 1_135 })).toBe("2m 15s");
  });

  it("calculates the delta between start/end ISO timestamps", () => {
    expect(formatDuration({ startTime: "2026-06-22T10:00:00Z", endTime: "2026-06-22T10:01:05Z" })).toBe("1m 5s");
  });

  it("returns the graceful 'Timeout' fallback for impossible (> 2h) durations, never '1489m'", () => {
    const out = formatDuration({ duration: 1489 * 60 + 44 }); // the reported outlier
    expect(out).toBe("Timeout");
    expect(out).not.toContain("1489");
  });

  it("returns empty string when no usable duration data exists", () => {
    expect(formatDuration({ server: "QAC01" })).toBe("");
    expect(formatDuration(null)).toBe("");
  });
});

describe("formatDateOnly / formatDateTime", () => {
  it("formats date only as DD/MM/YYYY (no time)", () => {
    expect(formatDateOnly("2026-06-14T10:30:00")).toBe("14/06/2026");
  });

  it("appends HH:mm only when the source includes a time", () => {
    expect(formatDateTime("2026-06-14T10:30:00")).toBe("14/06/2026 10:30");
    expect(formatDateTime("2026-06-14")).toBe("14/06/2026");
  });
});

describe("extractFatalLine", () => {
  it("returns ONLY the line containing FATAL from a multi-line log", () => {
    const log = [
      "INFO starting test",
      "DEBUG clicking button",
      "FATAL element not found: #submit",
      "INFO teardown",
    ].join("\n");
    expect(extractFatalLine(log)).toBe("FATAL element not found: #submit");
  });

  it("falls back to the first non-empty line when no FATAL exists", () => {
    const log = ["", "  Timeout waiting for selector", "DEBUG more"].join("\n");
    expect(extractFatalLine(log)).toBe("Timeout waiting for selector");
  });

  it("returns empty string for empty/missing text", () => {
    expect(extractFatalLine("")).toBe("");
    expect(extractFatalLine(null)).toBe("");
  });
});
