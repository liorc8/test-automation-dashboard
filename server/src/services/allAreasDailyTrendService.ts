import { execute } from "../db";
import { AREAS } from "../config/areas";
import { EnvFilter, buildServerFilter } from "./envFilter";

export type DailyTrendPoint = {
  date: string;
  passed: number;
  failed: number;
  total: number;
};

export type AllAreasDailyTrendResponse = {
  env: EnvFilter;
  daysBack: number;
  areas: Record<string, DailyTrendPoint[]>;
};

function buildSQL(serverFilter: string, areaInClause: string, areaUnionRows: string): string {
  return `
WITH area_list AS (
${areaUnionRows}
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
  WHERE UPPER(AREA) IN (${areaInClause})
    AND TRUNC(TESTEDON) >= TRUNC(SYSDATE) - :daysBack + 1
    ${serverFilter}
),
daily_counts AS (
  SELECT
    AREA,
    RUN_DAY,
    SUM(CASE WHEN LOWER(PASSED)='true'  THEN 1 ELSE 0 END) AS PASSED,
    SUM(CASE WHEN LOWER(PASSED)='false' THEN 1 ELSE 0 END) AS FAILED
  FROM latest_per_test_day
  WHERE RN = 1
  GROUP BY AREA, RUN_DAY
)
SELECT
  a.AREA_ID                     AS AREA,
  TO_CHAR(
    TRUNC(SYSDATE) - (n.N - 1),
    'YYYY-MM-DD'
  )                             AS DATE_STR,
  NVL(c.PASSED, 0)             AS PASSED,
  NVL(c.FAILED, 0)             AS FAILED
FROM area_list a
CROSS JOIN (
  SELECT LEVEL AS N
  FROM dual
  CONNECT BY LEVEL <= :daysBack
) n
LEFT JOIN daily_counts c
  ON  c.AREA    = a.AREA_ID
  AND c.RUN_DAY = TRUNC(SYSDATE) - (n.N - 1)
ORDER BY a.AREA_ID, n.N ASC
`;
}

export async function getAllAreasDailyTrends(
  daysBack: number,
  env: EnvFilter = "qa"
): Promise<AllAreasDailyTrendResponse> {
  const areaIds = AREAS.map(a => a.id.toUpperCase());
  const areaInClause = areaIds.map(id => `'${id}'`).join(", ");
  const areaUnionRows = areaIds
    .map((id, i) => `  ${i === 0 ? "" : "UNION ALL "}SELECT '${id}' AS AREA_ID FROM dual`)
    .join("\n");
  const serverFilter = buildServerFilter(env);
  const sql = buildSQL(serverFilter, areaInClause, areaUnionRows);

  const res = await execute(sql, { daysBack });
  const rows = (res.rows ?? []) as any[];

  const areas: Record<string, DailyTrendPoint[]> = {};
  for (const a of AREAS) {
    areas[a.id.toUpperCase()] = [];
  }

  for (const r of rows) {
    const area = String(r.AREA ?? "").toUpperCase();
    const passed = Number(r.PASSED ?? 0);
    const failed = Number(r.FAILED ?? 0);
    if (areas[area]) {
      areas[area].push({ date: String(r.DATE_STR ?? ""), passed, failed, total: passed + failed });
    }
  }

  return { env, daysBack, areas };
}
