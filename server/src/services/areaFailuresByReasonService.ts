import { execute } from "../db";
import { cleanReason, redactSensitive } from "../utils/failureText";
import { jobNameFromLinks } from "../utils/jobName";
import { EnvFilter, buildServerFilter } from "./envFilter";

export type { EnvFilter };

// Evaluate ONLY the single latest run per test. Keep that row only when it is a
// failure; tests whose latest run passed are discarded. Older historical failures
// never contribute — grouping uses each test's latest active reason only.
function buildSQL(serverFilter: string): string {
  return `
WITH base AS (
  SELECT
    TESTNAME,
    UPPER(TESTNAME) AS TKEY,
    PASSED,
    TESTEDON,
    ENDINGTIMEUNIX,
    SERVER,
    ALMAVERSION,
    BUILDNUMBER,
    LOGLINK,
    SCREENSHOTLINK,
    FAILURETEXT
  FROM QA_AUTOMATION.TESTRESULTS
  WHERE UPPER(AREA) = :area
    AND NVL(FAILURETEXT, '') NOT LIKE '%@BeforeMethod%'
    AND TRUNC(TESTEDON) >= TRUNC(SYSDATE) - :daysBack + 1
    ${serverFilter}
),
ranked AS (
  SELECT
    base.*,
    ROW_NUMBER() OVER (
      PARTITION BY TKEY
      ORDER BY TESTEDON DESC, NVL(ENDINGTIMEUNIX, 0) DESC
    ) AS RN
  FROM base
)
SELECT
  TESTNAME,
  TESTEDON,
  ENDINGTIMEUNIX,
  SERVER,
  ALMAVERSION,
  BUILDNUMBER,
  LOGLINK,
  SCREENSHOTLINK,
  FAILURETEXT
FROM ranked
WHERE RN = 1
  AND LOWER(PASSED) = 'false'
  AND FAILURETEXT IS NOT NULL
ORDER BY NVL(ENDINGTIMEUNIX, 0) DESC
`;
}

// Extracts the concise core reason: the FATAL line (from "FATAL" onward), or the
// last non-empty line as a fallback. Redacted and length-capped for a clean header.
function extractFatalReason(text: unknown): string | null {
  if (typeof text !== "string" || !text.trim()) return null;
  const lines = text.split(/\r?\n/);

  let fatal: string | null = null;
  for (let i = lines.length - 1; i >= 0; i--) {
    if (lines[i].toUpperCase().includes("FATAL")) { fatal = lines[i]; break; }
  }

  let line = (fatal ?? [...lines].reverse().find(l => l.trim() !== "") ?? "").trim();
  const idx = line.toUpperCase().indexOf("FATAL");
  if (idx >= 0) line = line.slice(idx).trim();

  line = redactSensitive(line).trim();
  if (line.length > 300) line = `${line.slice(0, 300).trimEnd()}…`;
  return line || null;
}

function formatUnixMs(x: unknown): string | null {
  const n = typeof x === "number" ? x : Number(x);
  if (!Number.isFinite(n) || n <= 0) return null;
  const d = new Date(n);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function formatDate(x: unknown): string | null {
  if (!x) return null;
  const d = x instanceof Date ? x : new Date(x as any);
  if (isNaN(d.getTime())) return null;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function toNumber(x: unknown): number | null {
  if (typeof x === "number") return x;
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
}

export async function getAreaFailuresByReason(
  areaName: string,
  daysBack: number,
  env: EnvFilter = "qa"
) {
  const area = areaName.toUpperCase();
  const serverFilter = buildServerFilter(env);
  const sql = buildSQL(serverFilter);

  const res = await execute(sql, { area, daysBack });
  const rows = (res.rows ?? []) as any[];

  // One row per test (its single latest run, which is a failure). Group by the
  // cleaned latest reason; each test appears in exactly one group.
  type ReasonAcc = { reasonText: string; tests: Map<string, any> };
  const byReason = new Map<string, ReasonAcc>();

  for (const r of rows) {
    const reasonText = extractFatalReason(r.FAILURETEXT) ?? "(no failure text)";
    if (!byReason.has(reasonText)) byReason.set(reasonText, { reasonText, tests: new Map() });
    const group = byReason.get(reasonText)!;
    const testKey = String(r.TESTNAME ?? "").toUpperCase();
    if (!group.tests.has(testKey)) group.tests.set(testKey, r);
  }

  const reasons = Array.from(byReason.values())
    .filter(g => g.tests.size >= 2) // only reasons affecting multiple tests
    .map(g => {
      const tests = Array.from(g.tests.values()).map((row) => {
        const logLink = (row.LOGLINK ?? null) as string | null;
        const screenshotLink = (row.SCREENSHOTLINK ?? null) as string | null;
        const fullReason = cleanReason(row.FAILURETEXT);
        return {
          testName: String(row.TESTNAME),
          failCount: 1,
          lastFailedOn: formatUnixMs(row.ENDINGTIMEUNIX),
          jobName: jobNameFromLinks(logLink, screenshotLink),
          reasons: fullReason
            ? [{ text: fullReason, lastDate: formatDate(row.TESTEDON), screenshotLink, logLink }]
            : [],
          lastFailure: {
            server: (row.SERVER ?? null) as string | null,
            almaVersion: (row.ALMAVERSION ?? null) as string | null,
            buildNumber: toNumber(row.BUILDNUMBER),
            logLink,
            screenshotLink,
          },
        };
      });
      return { reasonText: g.reasonText, failCount: g.tests.size, tests };
    })
    .sort((a, b) => b.failCount - a.failCount);

  return { area, windowDays: daysBack, env, reasons };
}
