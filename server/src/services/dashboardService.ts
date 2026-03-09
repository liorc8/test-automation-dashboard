import { execute } from "../db";
import { AREAS } from "../config/areas";
import { EnvFilter, buildServerFilter } from "./envFilter";

function toNumber(x: unknown): number {
  if (typeof x === "number") return x;
  const n = Number(x);
  return Number.isFinite(n) ? n : 0;
}

function buildSQL(serverFilter: string): string {
  return `
WITH latest_per_test AS (
  SELECT
    UPPER(AREA)               AS AREA,
    TESTNAME,
    PASSED,
    NVL(FAILURETEXT, '')      AS FAILURETEXT,
    TESTEDON,
    ROW_NUMBER() OVER (
      PARTITION BY UPPER(AREA), TESTNAME
      ORDER BY TESTEDON DESC, NVL(ENDINGTIMEUNIX, 0) DESC
    ) AS RN
  FROM QA_AUTOMATION.TESTRESULTS
  WHERE 1=1
    ${serverFilter}
),
latest AS (
  SELECT AREA, TESTNAME, PASSED, FAILURETEXT, TESTEDON
  FROM latest_per_test
  WHERE RN = 1
),
pass_rate_per_test AS (
  SELECT
    UPPER(AREA) AS AREA,
    TESTNAME,
    SUM(CASE WHEN LOWER(PASSED)='true'  THEN 1 ELSE 0 END) AS SUCCESSES,
    SUM(CASE WHEN LOWER(PASSED)='false' THEN 1 ELSE 0 END) AS FAILS
  FROM QA_AUTOMATION.TESTRESULTS
  WHERE 1=1
    ${serverFilter}
  GROUP BY UPPER(AREA), TESTNAME
),
test_health AS (
  SELECT
    l.AREA,
    l.TESTNAME,
    l.PASSED,
    l.FAILURETEXT,
    l.TESTEDON,
    NVL(p.SUCCESSES, 0) AS SUCCESSES,
    NVL(p.FAILS, 0)     AS FAILS,
    CASE
      WHEN NVL(p.SUCCESSES, 0) + NVL(p.FAILS, 0) = 0 THEN 'dead'
      WHEN ROUND(NVL(p.SUCCESSES, 0) * 100 / (NVL(p.SUCCESSES, 0) + NVL(p.FAILS, 0))) > 80 THEN 'healthy'
      WHEN ROUND(NVL(p.SUCCESSES, 0) * 100 / (NVL(p.SUCCESSES, 0) + NVL(p.FAILS, 0))) > 20 THEN 'medium'
      WHEN ROUND(NVL(p.SUCCESSES, 0) * 100 / (NVL(p.SUCCESSES, 0) + NVL(p.FAILS, 0))) > 0  THEN 'bad'
      ELSE 'dead'
    END AS HEALTH
  FROM latest l
  LEFT JOIN pass_rate_per_test p ON p.AREA = l.AREA AND p.TESTNAME = l.TESTNAME
),
area_agg AS (
  SELECT
    AREA,
    COUNT(*)                                                                                        AS TOTAL,
    TO_CHAR(MAX(TESTEDON), 'YYYY-MM-DD')                                                           AS LAST_RUN_DAY,
    SUM(CASE WHEN LOWER(PASSED)='true'  THEN 1 ELSE 0 END)                                        AS LAST_PASSED,
    SUM(CASE WHEN LOWER(PASSED)='false' AND FAILURETEXT NOT LIKE '%@BeforeMethod%' THEN 1 ELSE 0 END) AS LAST_FAILED,
    SUM(CASE WHEN HEALTH = 'healthy' THEN 1 ELSE 0 END)                                           AS HEALTHY_COUNT,
    SUM(CASE WHEN HEALTH = 'medium'  THEN 1 ELSE 0 END)                                           AS MEDIUM_COUNT,
    SUM(CASE WHEN HEALTH = 'bad'     THEN 1 ELSE 0 END)                                           AS BAD_COUNT,
    SUM(CASE WHEN HEALTH = 'dead'    THEN 1 ELSE 0 END)                                           AS DEAD_COUNT
  FROM test_health
  GROUP BY AREA
)
SELECT
  AREA,
  LAST_RUN_DAY,
  TOTAL,
  LAST_PASSED,
  LAST_FAILED,
  HEALTHY_COUNT,
  MEDIUM_COUNT,
  BAD_COUNT,
  DEAD_COUNT
FROM area_agg
ORDER BY AREA
`;
}

export async function getAreasDashboard(daysBack: number, env: EnvFilter = "qa") {
  const serverFilter = buildServerFilter(env);
  const sql = buildSQL(serverFilter);

  const res = await execute(sql, {});
  const rows = res.rows ?? [];

  const byArea = new Map<string, any>();
  for (const r of rows as any[]) {
    const area = String(r.AREA ?? "").toUpperCase();

    const passed  = toNumber(r.LAST_PASSED);
    const failed  = toNumber(r.LAST_FAILED);
    const total   = toNumber(r.TOTAL);
    const passRate = (passed + failed) > 0 ? Math.round((passed / (passed + failed)) * 10000) / 100 : 0;

    byArea.set(area, {
      area,
      lastRunDay: r.LAST_RUN_DAY ?? null,
      last: { passed, failed, total, passRate },
      health: {
        healthy: toNumber(r.HEALTHY_COUNT),
        medium:  toNumber(r.MEDIUM_COUNT),
        bad:     toNumber(r.BAD_COUNT),
        dead:    toNumber(r.DEAD_COUNT),
      },
    });
  }

  const items = AREAS.map((a) => {
    const area = a.id.toUpperCase();
    return (
      byArea.get(area) ?? {
        area,
        lastRunDay: null,
        last: { passed: 0, failed: 0, total: 0, passRate: 0 },
        health: { healthy: 0, medium: 0, bad: 0, dead: 0 },
      }
    );
  });

  return { daysBack, env, items };
}