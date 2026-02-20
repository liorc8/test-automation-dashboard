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
    CASE
      WHEN FAILURETEXT IS NULL THEN NULL
      WHEN INSTR(FAILURETEXT, 'FATAL') > 0 THEN REGEXP_SUBSTR(FAILURETEXT, 'FATAL[^\\r\\n]*')
      ELSE SUBSTR(REPLACE(REPLACE(FAILURETEXT, CHR(13), ' '), CHR(10), ' '), 1, 200)
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
    MAX(TESTEDON) AS LAST_FAILED_ON
  FROM failures
  GROUP BY TESTNAME
),
reason_counts AS (
  SELECT
    TESTNAME,
    REASON_KEY,
    COUNT(*) AS CNT,
    MAX(TESTEDON) AS LAST_SEEN,
    ROW_NUMBER() OVER (
      PARTITION BY TESTNAME
      ORDER BY COUNT(*) DESC, MAX(TESTEDON) DESC
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
    TO_CHAR(s.LAST_FAILED_ON, 'DD/MM/YYYY HH24:MI') AS LAST_FAILED_ON_IL,
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
  ORDER BY s.FAIL_COUNT DESC, s.LAST_FAILED_ON DESC
)
WHERE ROWNUM <= :limit
`;

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
      lastFailedOn: (r.LAST_FAILED_ON_IL ?? null) as string | null,
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
