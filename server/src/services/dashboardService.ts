import { execute } from "../db";
import { AREAS } from "../config/areas";

function toNumber(x: unknown): number {
  if (typeof x === "number") return x;
  const n = Number(x);
  return Number.isFinite(n) ? n : 0;
}

const SQL_AREAS_DASHBOARD = `
WITH params AS (
  SELECT :daysBack AS DAYS_BACK FROM dual
),
last_day AS (
  SELECT UPPER(AREA) AS AREA, MAX(TRUNC(TESTEDON)) AS LAST_DATE
  FROM QA_AUTOMATION.TESTRESULTS
  GROUP BY UPPER(AREA)
),
last_agg AS (
  SELECT
    UPPER(t.AREA) AS AREA,
    SUM(CASE WHEN LOWER(t.PASSED)='true' THEN 1 ELSE 0 END) AS LAST_PASSED,
    SUM(CASE WHEN LOWER(t.PASSED)='false' AND NVL(t.FAILURETEXT,'') NOT LIKE '%@BeforeMethod%' THEN 1 ELSE 0 END) AS LAST_FAILED
  FROM QA_AUTOMATION.TESTRESULTS t
  JOIN last_day d
    ON UPPER(t.AREA)=d.AREA AND TRUNC(t.TESTEDON)=d.LAST_DATE
  GROUP BY UPPER(t.AREA)
),
win_agg AS (
  SELECT
    UPPER(t.AREA) AS AREA,
    SUM(CASE WHEN LOWER(t.PASSED)='true' THEN 1 ELSE 0 END) AS WIN_PASSED,
    SUM(CASE WHEN LOWER(t.PASSED)='false' AND NVL(t.FAILURETEXT,'') NOT LIKE '%@BeforeMethod%' THEN 1 ELSE 0 END) AS WIN_FAILED
  FROM QA_AUTOMATION.TESTRESULTS t
  CROSS JOIN params p
  WHERE TRUNC(t.TESTEDON) >= TRUNC(SYSDATE) - p.DAYS_BACK + 1
  GROUP BY UPPER(t.AREA)
)
SELECT
  a.AREA,
  TO_CHAR(d.LAST_DATE, 'YYYY-MM-DD') AS LAST_RUN_DAY,
  NVL(l.LAST_PASSED, 0) AS LAST_PASSED,
  NVL(l.LAST_FAILED, 0) AS LAST_FAILED,
  NVL(w.WIN_PASSED, 0) AS WIN_PASSED,
  NVL(w.WIN_FAILED, 0) AS WIN_FAILED
FROM last_day d
LEFT JOIN last_agg l ON l.AREA = d.AREA
LEFT JOIN win_agg  w ON w.AREA = d.AREA
JOIN (
  SELECT DISTINCT UPPER(AREA) AS AREA FROM QA_AUTOMATION.TESTRESULTS
) a ON a.AREA = d.AREA
ORDER BY a.AREA
`;

export async function getAreasDashboard(daysBack: number) {
  const res = await execute(SQL_AREAS_DASHBOARD, { daysBack });
  const rows = res.rows ?? [];

  const byArea = new Map<string, any>();
  for (const r of rows as any[]) {
    const area = String(r.AREA ?? "").toUpperCase();

    const lastPassed = toNumber(r.LAST_PASSED);
    const lastFailed = toNumber(r.LAST_FAILED);
    const lastTotal = lastPassed + lastFailed;
    const lastPassRate = lastTotal > 0 ? Math.round((lastPassed / lastTotal) * 10000) / 100 : 0;

    const winPassed = toNumber(r.WIN_PASSED);
    const winFailed = toNumber(r.WIN_FAILED);
    const winTotal = winPassed + winFailed;
    const winPassRate = winTotal > 0 ? Math.round((winPassed / winTotal) * 10000) / 100 : 0;

    byArea.set(area, {
      area,
      lastRunDay: r.LAST_RUN_DAY ?? null,
      last: { passed: lastPassed, failed: lastFailed, total: lastTotal, passRate: lastPassRate },
      window: { daysBack, passed: winPassed, failed: winFailed, total: winTotal, passRate: winPassRate },
    });
  }

  const items = AREAS.map((a) => {
    const area = a.id.toUpperCase();
    return (
      byArea.get(area) ?? {
        area,
        lastRunDay: null,
        last: { passed: 0, failed: 0, total: 0, passRate: 0 },
        window: { daysBack, passed: 0, failed: 0, total: 0, passRate: 0 },
      }
    );
  });

  return { daysBack, items };
}
