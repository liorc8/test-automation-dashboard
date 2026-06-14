import { execute } from "../db";
import { EnvFilter, buildServerFilter } from "./envFilter";

export type HealthBucket = "healthy" | "medium" | "bad" | "dead";

export type HealthTestItem = {
  testName: string;
  passRate: number;
  successes: number;
  fails: number;
  lastRunDate: string;
  lastPassed: boolean;
  lastSuccess: string;
  lastFailure: string;
};

function bucketWhereClause(bucket: HealthBucket): string {
  switch (bucket) {
    case "healthy": return "PASS_RATE > 80";
    case "medium":  return "PASS_RATE > 20 AND PASS_RATE <= 80";
    case "bad":     return "PASS_RATE > 0  AND PASS_RATE <= 20";
    case "dead":    return "PASS_RATE = 0";
  }
}

function buildSQL(serverFilter: string, bucket: HealthBucket): string {
  // Same daysBack window as the dashboard so the per-area bucket counts shown on the
  // cards match the rows listed here exactly.
  const windowFilter = "AND TRUNC(TESTEDON) >= TRUNC(SYSDATE) - :daysBack + 1";
  return `
WITH latest_per_test AS (
  SELECT
    AREA,
    TESTNAME,
    UPPER(AREA)               AS AREA_KEY,
    UPPER(TESTNAME)           AS TESTNAME_KEY,
    PASSED,
    TESTEDON,
    ROW_NUMBER() OVER (
      PARTITION BY UPPER(AREA), UPPER(TESTNAME)
      ORDER BY TESTEDON DESC, NVL(ENDINGTIMEUNIX, 0) DESC
    ) AS RN
  FROM QA_AUTOMATION.TESTRESULTS
  WHERE UPPER(AREA) = UPPER(:area)
    ${windowFilter}
    ${serverFilter}
),
latest AS (
  SELECT AREA, TESTNAME, AREA_KEY, TESTNAME_KEY, PASSED, TESTEDON
  FROM latest_per_test
  WHERE RN = 1
),
pass_rate_per_test AS (
  SELECT
    UPPER(AREA)     AS AREA_KEY,
    UPPER(TESTNAME) AS TESTNAME_KEY,
    SUM(CASE WHEN LOWER(PASSED)='true'  THEN 1 ELSE 0 END) AS SUCCESSES,
    SUM(CASE WHEN LOWER(PASSED)='false' THEN 1 ELSE 0 END) AS FAILS,
    MAX(CASE WHEN LOWER(PASSED)='true'  THEN TESTEDON END) AS LAST_SUCCESS,
    MAX(CASE WHEN LOWER(PASSED)='false' THEN TESTEDON END) AS LAST_FAILURE
  FROM QA_AUTOMATION.TESTRESULTS
  WHERE UPPER(AREA) = UPPER(:area)
    ${windowFilter}
    ${serverFilter}
  GROUP BY UPPER(AREA), UPPER(TESTNAME)
),
test_health AS (
  SELECT
    l.TESTNAME,
    l.PASSED,
    TO_CHAR(l.TESTEDON, 'DD/MM/YYYY') AS LAST_RUN_DATE,
    TO_CHAR(p.LAST_SUCCESS, 'DD/MM/YYYY') AS LAST_SUCCESS,
    TO_CHAR(p.LAST_FAILURE, 'DD/MM/YYYY') AS LAST_FAILURE,
    NVL(p.SUCCESSES, 0) AS SUCCESSES,
    NVL(p.FAILS, 0)     AS FAILS,
    CASE
      WHEN NVL(p.SUCCESSES, 0) + NVL(p.FAILS, 0) = 0 THEN 0
      ELSE ROUND(NVL(p.SUCCESSES, 0) * 100 / (NVL(p.SUCCESSES, 0) + NVL(p.FAILS, 0)))
    END AS PASS_RATE
  FROM latest l
  LEFT JOIN pass_rate_per_test p ON p.AREA_KEY = l.AREA_KEY AND p.TESTNAME_KEY = l.TESTNAME_KEY
)
SELECT TESTNAME, PASSED, LAST_RUN_DATE, LAST_SUCCESS, LAST_FAILURE, SUCCESSES, FAILS, PASS_RATE
FROM test_health
WHERE ${bucketWhereClause(bucket)}
ORDER BY PASS_RATE ASC, TESTNAME ASC
`;
}

// Default window mirrors the dashboard (getAreasDashboard) so counts stay consistent.
const DEFAULT_DAYS_BACK = 8;

export async function getAreaHealthTests(
  areaName: string,
  bucket: HealthBucket,
  env: EnvFilter = "qa",
  daysBack: number = DEFAULT_DAYS_BACK
): Promise<HealthTestItem[]> {
  const serverFilter = buildServerFilter(env);
  const sql = buildSQL(serverFilter, bucket);

  const res = await execute(sql, { area: areaName, daysBack });
  const rows = (res.rows ?? []) as any[];

  return rows.map((r) => ({
    testName:    String(r.TESTNAME ?? ""),
    passRate:    Number(r.PASS_RATE ?? 0),
    successes:   Number(r.SUCCESSES ?? 0),
    fails:       Number(r.FAILS ?? 0),
    lastRunDate: String(r.LAST_RUN_DATE ?? ""),
    lastPassed:  String(r.PASSED ?? "").toLowerCase() === "true",
    lastSuccess: String(r.LAST_SUCCESS ?? ""),
    lastFailure: String(r.LAST_FAILURE ?? ""),
  }));
}
