// Shared helpers for failure cards, logs, and screenshots.

export const WINDOW_DAYS = 10;

export function renderLogLines(lines: string[]) {
  return lines.map((line, i) => {
    const isFatal = line.toUpperCase().includes("FATAL");
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
    if (lines[i].toUpperCase().includes("FATAL")) { fatalIdx = i; break; }
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
    if (lines[i].toUpperCase().includes("FATAL")) { fatalIdx = i; break; }
  }
  if (fatalIdx === -1) return lines.slice(Math.max(0, lines.length - 4)).filter(l => l.trim() !== "");
  return lines.slice(Math.max(0, fatalIdx - 3), fatalIdx + 1).filter(l => l.trim() !== "");
}
