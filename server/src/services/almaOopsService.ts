import { execute } from "../db";
import { cleanReason } from "../utils/failureText";
import { jobNameFromLinks } from "../utils/jobName";
import { EnvFilter, buildServerFilter } from "./envFilter";

export type { EnvFilter };

// Fixed 10-day window for Alma Oops (legacy "Alma oops").
const WINDOW_DAYS = 10;

// Strict legacy "Alma oops" logic (from old dashboard's getresult/getTestFailure):
//  - take only each test's LATEST run (ORDER BY testedon DESC, endingTimeUnix DESC),
//  - that latest run's FAILURETEXT must contain "FATAL" AND "Message appear"
//    (case-sensitive, exactly as the legacy String.contains checks),
//  - server scoped by the env filter (legacy filterServer).
// On top of that legacy set we add: the 10-day window and a COUNT(*) occurrences
// aggregation (how many matching runs each test had) to avoid duplicate rows.
function buildSQL(serverFilter: string): string {
  return `
WITH base AS (
  SELECT
    AREA,
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
  WHERE TESTEDON >= SYSDATE - 10
    ${serverFilter}
),
ranked AS (
  SELECT base.*, ROW_NUMBER() OVER (
    PARTITION BY TKEY ORDER BY TESTEDON DESC, NVL(ENDINGTIMEUNIX, 0) DESC
  ) AS RN
  FROM base
),
oops_latest AS (
  -- Legacy membership: a test is an "Alma oops" iff its LATEST run matches.
  SELECT TKEY
  FROM ranked
  WHERE RN = 1
    AND FAILURETEXT LIKE '%FATAL%'
    AND FAILURETEXT LIKE '%Message appear%'
),
matching AS (
  SELECT b.*
  FROM base b
  JOIN oops_latest o ON o.TKEY = b.TKEY
  WHERE b.FAILURETEXT LIKE '%FATAL%'
    AND b.FAILURETEXT LIKE '%Message appear%'
)
SELECT
  AREA,
  TESTNAME,
  COUNT(*)                                                                  AS OCCURRENCES,
  MAX(ENDINGTIMEUNIX)                                                       AS LAST_ENDING_UNIX,
  MAX(TESTEDON)                                                             AS LAST_TESTEDON,
  MAX(SERVER)         KEEP (DENSE_RANK LAST ORDER BY ENDINGTIMEUNIX)        AS SERVER,
  MAX(ALMAVERSION)    KEEP (DENSE_RANK LAST ORDER BY ENDINGTIMEUNIX)        AS ALMAVERSION,
  MAX(BUILDNUMBER)    KEEP (DENSE_RANK LAST ORDER BY ENDINGTIMEUNIX)        AS BUILDNUMBER,
  MAX(LOGLINK)        KEEP (DENSE_RANK LAST ORDER BY ENDINGTIMEUNIX)        AS LOGLINK,
  MAX(SCREENSHOTLINK) KEEP (DENSE_RANK LAST ORDER BY ENDINGTIMEUNIX)        AS SCREENSHOTLINK,
  MAX(FAILURETEXT)    KEEP (DENSE_RANK LAST ORDER BY ENDINGTIMEUNIX)        AS FAILURETEXT
FROM matching
GROUP BY AREA, TESTNAME
ORDER BY OCCURRENCES DESC, LAST_ENDING_UNIX DESC NULLS LAST
`;
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

export async function getAlmaOops(env: EnvFilter = "qa") {
  const serverFilter = buildServerFilter(env);
  const sql = buildSQL(serverFilter);

  const res = await execute(sql, {});
  const rows = (res.rows ?? []) as any[];

  const items = rows.map((r) => {
    const logLink = (r.LOGLINK ?? null) as string | null;
    const screenshotLink = (r.SCREENSHOTLINK ?? null) as string | null;
    const occurrences = Number(r.OCCURRENCES ?? 0);
    const fullReason = cleanReason(r.FAILURETEXT);

    return {
      area: String(r.AREA ?? ""),
      testName: String(r.TESTNAME ?? ""),
      occurrences,
      // failCount mirrors occurrences so the shared FailureCard badge reads correctly.
      failCount: occurrences,
      lastFailedOn: formatUnixMs(r.LAST_ENDING_UNIX),
      jobName: jobNameFromLinks(logLink, screenshotLink),
      reasons: fullReason
        ? [{ text: fullReason, lastDate: formatDate(r.LAST_TESTEDON), screenshotLink, logLink }]
        : [],
      lastFailure: {
        server: (r.SERVER ?? null) as string | null,
        almaVersion: (r.ALMAVERSION ?? null) as string | null,
        buildNumber: toNumber(r.BUILDNUMBER),
        logLink,
        screenshotLink,
      },
    };
  });

  return { env, windowDays: WINDOW_DAYS, items };
}
