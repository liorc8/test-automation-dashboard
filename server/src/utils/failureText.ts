export function redactSensitive(text: string): string {
  return text
    .replace(/(^|\n)(INFO\s+.*-\s*Username for login is:\s*).*/gi, "$1$2***REDACTED***")
    .replace(/(^|\n)(INFO\s+.*-\s*Password for login is:\s*).*/gi, "$1$2***REDACTED***")
    .replace(/(^|\n)(DEBUG\s+.*-\s*JSESSIONID:\s*).*/gi, "$1$2***REDACTED***")

    .replace(/(^|\n)(.*\bAuthorization\b.*:\s*).*/gi, "$1$2***REDACTED***")
    .replace(/(^|\n)(.*\bBearer\b\s+).*/gi, "$1$2***REDACTED***")

    .replace(/(^|\n)(.*\bpassword\b.*:\s*).*/gi, "$1$2***REDACTED***")
    .replace(/(^|\n)(.*\btoken\b.*:\s*).*/gi, "$1$2***REDACTED***")
    .replace(/(^|\n)(.*\bsecret\b.*:\s*).*/gi, "$1$2***REDACTED***")
    .replace(/(^|\n)(.*\bapi[_-]?key\b.*:\s*).*/gi, "$1$2***REDACTED***");
}

export function buildFailureTextPreview(
  text: unknown,
  linesBackFromFatal = 25,
  fallbackLastLines = 20,
  maxChars = 4000
): string | null {
  if (typeof text !== "string") return null;

  const lines = text.split(/\r?\n/);
  if (lines.length === 0) return null;

  let fatalIndex = -1;
  for (let i = lines.length - 1; i >= 0; i--) {
    if (lines[i].includes("FATAL")) {
      fatalIndex = i;
      break;
    }
  }

  let preview: string;
  if (fatalIndex >= 0) {
    const start = Math.max(0, fatalIndex - linesBackFromFatal);
    preview = lines.slice(start, fatalIndex + 1).join("\n").trim();
  } else {
    const start = Math.max(0, lines.length - fallbackLastLines);
    preview = lines.slice(start).join("\n").trim();
  }

  if (!preview) return null;

  if (preview.length > maxChars) {
    preview = preview.slice(0, maxChars).trimEnd();
  }

  return redactSensitive(preview);
}

export function cleanReason(x: unknown): string | null {
  if (typeof x !== "string") return null;
  const s = x.trim();
  if (!s) return null;
  return redactSensitive(s);
}
