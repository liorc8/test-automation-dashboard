import { execute } from "../db";

const SQL_ENV_HEALTH_SERIES = `
WITH days AS (
  SELECT TRUNC(SYSDATE) - :daysBack + LEVEL AS RUN_DAY
  FROM dual
  CONNECT BY LEVEL <= :daysBack
),
agg AS (
  SELECT
    TRUNC(TESTEDON) AS RUN_DAY,
    SUM(CASE WHEN LOWER(PASSED) = 'true' THEN 1 ELSE 0 END) AS PASSED_COUNT,
    SUM(CASE WHEN LOWER(PASSED) = 'false'
              AND NVL(FAILURETEXT, '') LIKE '%@BeforeMethod%' THEN 1 ELSE 0 END) AS SKIPPED_COUNT,
    SUM(CASE WHEN LOWER(PASSED) = 'false'
              AND NVL(FAILURETEXT, '') NOT LIKE '%@BeforeMethod%' THEN 1 ELSE 0 END) AS FAILED_COUNT,
    COUNT(*) AS TOTAL_COUNT
  FROM QA_AUTOMATION.TESTRESULTS
  WHERE UPPER(SERVER) = :server
    AND TRUNC(TESTEDON) >= TRUNC(SYSDATE) - :daysBack + 1
  GROUP BY TRUNC(TESTEDON)
)
SELECT
  TO_CHAR(d.RUN_DAY, 'YYYY-MM-DD') AS RUN_DAY,
  NVL(a.PASSED_COUNT, 0) AS PASSED_COUNT,
  NVL(a.FAILED_COUNT, 0) AS FAILED_COUNT,
  NVL(a.SKIPPED_COUNT, 0) AS SKIPPED_COUNT,
  NVL(a.TOTAL_COUNT, 0) AS TOTAL_COUNT
FROM days d
LEFT JOIN agg a ON a.RUN_DAY = d.RUN_DAY
ORDER BY d.RUN_DAY
`;

function toNumber(x: unknown): number {
  if (typeof x === "number") return x;
  const n = Number(x);
  return Number.isFinite(n) ? n : 0;
}

export async function getEnvHealthSeries(env: string, daysBack: number) {
  // In DB the column is SERVER, but conceptually it's your Environment (QAC01, SQA03, etc.)
  const server = env.toUpperCase();

  const res = await execute(SQL_ENV_HEALTH_SERIES, { server, daysBack });
  const rows = res.rows ?? [];

  const series = rows.map((r: any) => {
    const passed = toNumber(r.PASSED_COUNT);
    const failed = toNumber(r.FAILED_COUNT);
    const skipped = toNumber(r.SKIPPED_COUNT);
    const total = toNumber(r.TOTAL_COUNT);

    const passRate = total > 0 ? Math.round((passed / total) * 10000) / 100 : 0;

    // Optional legacy-style stacking fields (same as Area)
    const failedChart = failed + skipped;
    const passedChart = total;

    return {
      runDay: r.RUN_DAY,
      passed,
      failed,
      skipped,
      total,
      passRate,
      passedChart,
      failedChart,
      skippedChart: skipped,
    };
  });

  return {
    env: server,
    windowDays: daysBack,
    series,
  };
}
