import { execute } from "../db";
import { EnvFilter, buildServerFilter } from "./envFilter";

export type DailyTrendPoint = {
  date: string;
  passed: number;
  failed: number;
  total: number;
};

function buildSQL(serverFilter: string): string {
  return `
WITH day_series AS (
  SELECT TRUNC(SYSDATE) - (LEVEL - 1) AS DAY
  FROM dual
  CONNECT BY LEVEL <= :daysBack
),
latest_per_test_day AS (
  SELECT
    UPPER(AREA)       AS AREA,
    UPPER(TESTNAME)   AS TESTNAME,
    TRUNC(TESTEDON)   AS RUN_DAY,
    PASSED,
    ROW_NUMBER() OVER (
      PARTITION BY UPPER(AREA), UPPER(TESTNAME), TRUNC(TESTEDON)
      ORDER BY TESTEDON DESC, NVL(ENDINGTIMEUNIX, 0) DESC
    ) AS RN
  FROM QA_AUTOMATION.TESTRESULTS
  WHERE UPPER(AREA) = UPPER(:area)
    AND TRUNC(TESTEDON) >= TRUNC(SYSDATE) - :daysBack + 1
    ${serverFilter}
),
daily_counts AS (
  SELECT
    RUN_DAY,
    SUM(CASE WHEN LOWER(PASSED) = 'true'  THEN 1 ELSE 0 END) AS PASSED,
    SUM(CASE WHEN LOWER(PASSED) = 'false' THEN 1 ELSE 0 END) AS FAILED
  FROM latest_per_test_day
  WHERE RN = 1
  GROUP BY RUN_DAY
)
SELECT
  TO_CHAR(d.DAY, 'YYYY-MM-DD') AS DATE_STR,
  NVL(c.PASSED, 0)             AS PASSED,
  NVL(c.FAILED, 0)             AS FAILED
FROM day_series d
LEFT JOIN daily_counts c ON c.RUN_DAY = d.DAY
ORDER BY d.DAY ASC
`;
}

export async function getAreaDailyTrend(
  areaName: string,
  daysBack: number,
  env: EnvFilter = "qa"
): Promise<DailyTrendPoint[]> {
  const serverFilter = buildServerFilter(env);
  const sql = buildSQL(serverFilter);

  const res = await execute(sql, { area: areaName, daysBack });
  const rows = (res.rows ?? []) as any[];

  return rows.map((r) => {
    const passed = Number(r.PASSED ?? 0);
    const failed = Number(r.FAILED ?? 0);
    return {
      date:   String(r.DATE_STR ?? ""),
      passed,
      failed,
      total:  passed + failed,
    };
  });
}
