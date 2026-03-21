import { execute } from "../db";
import { cleanReason } from "../utils/failureText";
import { EnvFilter, buildServerFilter } from "./envFilter";

export type { EnvFilter };

function buildSQL(serverFilter: string): string {
  return `
WITH failures AS (
  SELECT
    TESTNAME,
    TESTEDON,
    ENDINGTIMEUNIX,
    SERVER,
    ALMAVERSION,
    BUILDNUMBER,
    LOGLINK,
    SCREENSHOTLINK,
    FAILURETEXT,
    -- REASON_KEY: full failure text (up to 4000 chars) used for grouping.
    CASE
      WHEN FAILURETEXT IS NULL THEN NULL
      ELSE SUBSTR(FAILURETEXT, 1, 4000)
    END AS REASON_KEY
  FROM QA_AUTOMATION.TESTRESULTS
  WHERE UPPER(AREA) = :area
    AND LOWER(PASSED) = 'false'
    AND NVL(FAILURETEXT, '') NOT LIKE '%@BeforeMethod%'
    AND TRUNC(TESTEDON) >= TRUNC(SYSDATE) - :daysBack + 1
    ${serverFilter}
),
test_stats AS (
  SELECT
    TESTNAME,
    COUNT(*) AS FAIL_COUNT,
    MAX(ENDINGTIMEUNIX) AS LAST_ENDING_UNIX
  FROM failures
  GROUP BY TESTNAME
),
reason_counts AS (
  -- Outer query applies ROW_NUMBER using already-aggregated LAST_SCREENSHOT.
  -- Primary reason (RN=1) = most recent failure that has a screenshot,
  -- falling back to most recent without screenshot.
  SELECT
    TESTNAME,
    REASON_KEY,
    CNT,
    LAST_SEEN_UNIX,
    LAST_TESTEDON,
    LAST_SCREENSHOT,
    LAST_LOGLINK,
    ROW_NUMBER() OVER (
      PARTITION BY TESTNAME
      ORDER BY
        CASE WHEN LAST_SCREENSHOT IS NOT NULL THEN 0 ELSE 1 END ASC,
        LAST_SEEN_UNIX DESC
    ) AS RN
  FROM (
    SELECT
      TESTNAME,
      REASON_KEY,
      COUNT(*) AS CNT,
      MAX(ENDINGTIMEUNIX) AS LAST_SEEN_UNIX,
      MAX(TESTEDON) AS LAST_TESTEDON,
      MAX(SCREENSHOTLINK) KEEP (DENSE_RANK LAST ORDER BY ENDINGTIMEUNIX) AS LAST_SCREENSHOT,
      MAX(LOGLINK)        KEEP (DENSE_RANK LAST ORDER BY ENDINGTIMEUNIX) AS LAST_LOGLINK
    FROM failures
    WHERE REASON_KEY IS NOT NULL
    GROUP BY TESTNAME, REASON_KEY
  )
),
top_reasons AS (
  SELECT
    TESTNAME,
    MAX(CASE WHEN RN = 1 THEN REASON_KEY END)      AS REASON1,
    MAX(CASE WHEN RN = 1 THEN LAST_TESTEDON END)   AS REASON1_DATE,
    MAX(CASE WHEN RN = 1 THEN LAST_SCREENSHOT END) AS REASON1_SCREENSHOT,
    MAX(CASE WHEN RN = 1 THEN LAST_LOGLINK END)    AS REASON1_LOGLINK,
    MAX(CASE WHEN RN = 2 THEN REASON_KEY END)      AS REASON2,
    MAX(CASE WHEN RN = 2 THEN LAST_TESTEDON END)   AS REASON2_DATE,
    MAX(CASE WHEN RN = 2 THEN LAST_SCREENSHOT END) AS REASON2_SCREENSHOT,
    MAX(CASE WHEN RN = 2 THEN LAST_LOGLINK END)    AS REASON2_LOGLINK,
    MAX(CASE WHEN RN = 3 THEN REASON_KEY END)      AS REASON3,
    MAX(CASE WHEN RN = 3 THEN LAST_TESTEDON END)   AS REASON3_DATE,
    MAX(CASE WHEN RN = 3 THEN LAST_SCREENSHOT END) AS REASON3_SCREENSHOT,
    MAX(CASE WHEN RN = 3 THEN LAST_LOGLINK END)    AS REASON3_LOGLINK,
    MAX(CASE WHEN RN = 4 THEN REASON_KEY END)      AS REASON4,
    MAX(CASE WHEN RN = 4 THEN LAST_TESTEDON END)   AS REASON4_DATE,
    MAX(CASE WHEN RN = 4 THEN LAST_SCREENSHOT END) AS REASON4_SCREENSHOT,
    MAX(CASE WHEN RN = 4 THEN LAST_LOGLINK END)    AS REASON4_LOGLINK
  FROM reason_counts
  WHERE RN <= 4
  GROUP BY TESTNAME
),
last_failure AS (
  SELECT *
  FROM (
    SELECT
      f.*,
      ROW_NUMBER() OVER (
        PARTITION BY TESTNAME
        ORDER BY TESTEDON DESC, NVL(ENDINGTIMEUNIX, 0) DESC
      ) AS RN
    FROM failures f
  )
  WHERE RN = 1
)
SELECT *
FROM (
  SELECT
    s.TESTNAME,
    s.FAIL_COUNT,
    -- Raw unix ms – date formatting is done in Node.js to avoid Oracle timezone issues.
    s.LAST_ENDING_UNIX AS LAST_ENDING_UNIX,
    tr.REASON1,
    tr.REASON1_DATE,
    tr.REASON1_SCREENSHOT,
    tr.REASON1_LOGLINK,
    tr.REASON2,
    tr.REASON2_DATE,
    tr.REASON2_SCREENSHOT,
    tr.REASON2_LOGLINK,
    tr.REASON3,
    tr.REASON3_DATE,
    tr.REASON3_SCREENSHOT,
    tr.REASON3_LOGLINK,
    tr.REASON4,
    tr.REASON4_DATE,
    tr.REASON4_SCREENSHOT,
    tr.REASON4_LOGLINK,
    lf.SERVER,
    lf.ALMAVERSION,
    lf.BUILDNUMBER,
    lf.LOGLINK,
    lf.SCREENSHOTLINK
  FROM test_stats s
  LEFT JOIN top_reasons tr ON tr.TESTNAME = s.TESTNAME
  LEFT JOIN last_failure lf ON lf.TESTNAME = s.TESTNAME
  ORDER BY s.FAIL_COUNT DESC, s.LAST_ENDING_UNIX DESC NULLS LAST
)
WHERE ROWNUM <= :limit
`;
}

// Converts a unix timestamp in milliseconds to DD/MM/YYYY HH:MM (local server time)
function formatUnixMs(x: unknown): string | null {
  const n = typeof x === "number" ? x : Number(x);
  if (!Number.isFinite(n) || n <= 0) return null;
  const d = new Date(n);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
}

// Formats an Oracle DATE value (returned as JS Date by oracledb) to DD/MM/YYYY HH:MM
function formatDate(x: unknown): string | null {
  if (!x) return null;
  const d = x instanceof Date ? x : new Date(x as any);
  if (isNaN(d.getTime())) return null;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
}

function toNumber(x: unknown): number | null {
  if (typeof x === "number") return x;
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
}

export async function getAreaRecentFailuresGrouped(
  areaName: string,
  daysBack: number,
  limit: number,
  env: EnvFilter = "qa"
) {
  const area = areaName.toUpperCase();
  const serverFilter = buildServerFilter(env);
  const sql = buildSQL(serverFilter);

  const res = await execute(sql, { area, daysBack, limit });
  const rows = (res.rows ?? []) as any[];

  const items = rows.map((r) => {
    const reasonSlots = [
      { key: r.REASON1, date: r.REASON1_DATE, screenshot: r.REASON1_SCREENSHOT, logLink: r.REASON1_LOGLINK },
      { key: r.REASON2, date: r.REASON2_DATE, screenshot: r.REASON2_SCREENSHOT, logLink: r.REASON2_LOGLINK },
      { key: r.REASON3, date: r.REASON3_DATE, screenshot: r.REASON3_SCREENSHOT, logLink: r.REASON3_LOGLINK },
      { key: r.REASON4, date: r.REASON4_DATE, screenshot: r.REASON4_SCREENSHOT, logLink: r.REASON4_LOGLINK },
    ];

    const reasons = reasonSlots
      .map((slot) => {
        const text = cleanReason(slot.key);
        if (!text) return null;
        return {
          text,
          lastDate: formatDate(slot.date),
          screenshotLink: (slot.screenshot ?? null) as string | null,
          logLink: (slot.logLink ?? null) as string | null,
        };
      })
      .filter(Boolean) as Array<{ text: string; lastDate: string | null; screenshotLink: string | null; logLink: string | null }>;

    return {
      testName: String(r.TESTNAME),
      failCount: Number(r.FAIL_COUNT ?? 0),
      lastFailedOn: formatUnixMs(r.LAST_ENDING_UNIX),
      reasons,
      lastFailure: {
        server: (r.SERVER ?? null) as string | null,
        almaVersion: (r.ALMAVERSION ?? null) as string | null,
        buildNumber: toNumber(r.BUILDNUMBER),
        logLink: (r.LOGLINK ?? null) as string | null,
        screenshotLink: (r.SCREENSHOTLINK ?? null) as string | null,
      },
    };
  });

  return {
    area,
    windowDays: daysBack,
    env,
    reasonsMax: 4,
    items,
  };
}
