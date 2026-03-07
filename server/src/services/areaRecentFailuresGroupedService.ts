import { execute } from "../db";
import { cleanReason } from "../utils/failureText";

const SQL_AREA_RECENT_FAILURES_GROUPED = `
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
    -- REASON_KEY: used for grouping similar failures together.
    -- We take the full FAILURETEXT (up to 4000 chars) so we can display it in full on the frontend.
    -- Newlines are kept as-is so the terminal box renders them correctly.
    CASE
      WHEN FAILURETEXT IS NULL THEN NULL
      ELSE SUBSTR(FAILURETEXT, 1, 4000)
    END AS REASON_KEY
  FROM QA_AUTOMATION.TESTRESULTS
  WHERE UPPER(AREA) = :area
    AND LOWER(PASSED) = 'false'
    AND NVL(FAILURETEXT, '') NOT LIKE '%@BeforeMethod%'
    AND TRUNC(TESTEDON) >= TRUNC(SYSDATE) - :daysBack + 1
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
  SELECT
    TESTNAME,
    REASON_KEY,
    COUNT(*) AS CNT,
    MAX(ENDINGTIMEUNIX) AS LAST_SEEN_UNIX,
    ROW_NUMBER() OVER (
      PARTITION BY TESTNAME
      ORDER BY COUNT(*) DESC, MAX(ENDINGTIMEUNIX) DESC
    ) AS RN
  FROM failures
  WHERE REASON_KEY IS NOT NULL
  GROUP BY TESTNAME, REASON_KEY
),
top_reasons AS (
  SELECT
    TESTNAME,
    MAX(CASE WHEN RN = 1 THEN REASON_KEY END) AS REASON1,
    MAX(CASE WHEN RN = 2 THEN REASON_KEY END) AS REASON2,
    MAX(CASE WHEN RN = 3 THEN REASON_KEY END) AS REASON3,
    MAX(CASE WHEN RN = 4 THEN REASON_KEY END) AS REASON4
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
    -- Return the raw unix ms value – date formatting is handled in Node.js
    -- to avoid Oracle timezone/arithmetic issues with large numbers.
    s.LAST_ENDING_UNIX AS LAST_ENDING_UNIX,
    tr.REASON1,
    tr.REASON2,
    tr.REASON3,
    tr.REASON4,
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

function toNumber(x: unknown): number | null {
  if (typeof x === "number") return x;
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
}

export async function getAreaRecentFailuresGrouped(areaName: string, daysBack: number, limit: number) {
  const area = areaName.toUpperCase();

  const res = await execute(SQL_AREA_RECENT_FAILURES_GROUPED, { area, daysBack, limit });
  const rows = (res.rows ?? []) as any[];

  const items = rows.map((r) => {
    const reasons = [r.REASON1, r.REASON2, r.REASON3, r.REASON4]
      .map(cleanReason)
      .filter(Boolean) as string[];

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
    reasonsMax: 4,
    items,
  };
}