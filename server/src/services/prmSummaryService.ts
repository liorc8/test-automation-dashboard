import { execute } from "../db";


const SQL_TOTALS = `
  SELECT
    SUM(CASE WHEN LOWER(PASSED) = 'true'  THEN 1 ELSE 0 END) AS PASSED_COUNT,
    SUM(CASE WHEN LOWER(PASSED) = 'false' THEN 1 ELSE 0 END) AS FAILED_COUNT,
    COUNT(*) AS TOTAL_COUNT
  FROM QA_AUTOMATION.TESTRESULTS
  WHERE UPPER(AREA) = 'PRM'
    AND TESTEDON IS NOT NULL
    AND TESTEDON >= SYSDATE - :daysBack
`;

const SQL_LAST_RUN = `
  SELECT
    TO_CHAR(TESTEDON, 'DD/MM/YYYY HH24:MI') AS TESTEDON_IL,
    BUILDNUMBER,
    SERVER,
    ALMAVERSION
  FROM QA_AUTOMATION.TESTRESULTS
  WHERE UPPER(AREA) = 'PRM'
    AND TESTEDON IS NOT NULL
  ORDER BY TESTEDON DESC
  FETCH FIRST 1 ROWS ONLY
`;

const SQL_RECENT_FAILURES = `
  SELECT *
  FROM (
    SELECT
      TO_CHAR(TESTEDON, 'DD/MM/YYYY HH24:MI') AS TESTEDON_IL,
      TESTNAME,
      SERVER,
      ALMAVERSION,
      BUILDNUMBER,
      LOGLINK,
      SCREENSHOTLINK,
      FAILURETEXT
    FROM QA_AUTOMATION.TESTRESULTS
    WHERE UPPER(AREA) = 'PRM'
      AND TESTEDON IS NOT NULL
      AND TESTEDON >= SYSDATE - :daysBack
      AND LOWER(PASSED) = 'false'
    ORDER BY TESTEDON DESC
  )
  WHERE ROWNUM <= :limit
`;

function toNumber(x: unknown): number {
  if (typeof x === "number") return x;
  const n = Number(x);
  return Number.isFinite(n) ? n : 0;
}

function buildFailureTextPreview(
  text: unknown,
  linesBack = 25,
  fallbackLines = 20
): string | null {
  if (typeof text !== "string") return null;

  const lines = text.split(/\r?\n/);
  if (lines.length === 0) return null;

  let fatalIndex = -1;
  for (let i = lines.length - 1; i >= 0; i--) {
    if (lines[i].includes("FATAL")) {
      fatalIndex = i;
      break;
    }
  }

  if (fatalIndex >= 0) {
    const start = Math.max(0, fatalIndex - linesBack);
    const previewLines = lines.slice(start, fatalIndex + 1);
    return previewLines.join("\n").trim() || null;
  }

  const start = Math.max(0, lines.length - fallbackLines);
  const previewLines = lines.slice(start);
  return previewLines.join("\n").trim() || null;
}

export async function getPrmSummary(daysBack: number, limit: number) {
  const totalsRes = await execute(SQL_TOTALS, { daysBack });
  const totalsRow: any = totalsRes.rows?.[0] ?? {};

  const passed = toNumber(totalsRow.PASSED_COUNT);
  const failed = toNumber(totalsRow.FAILED_COUNT);
  const total = toNumber(totalsRow.TOTAL_COUNT);
  const passRate = total > 0 ? Math.round((passed / total) * 10000) / 100 : 0;

  const lastRes = await execute(SQL_LAST_RUN);
  const lastRow: any = lastRes.rows?.[0] ?? null;

  const failsRes = await execute(SQL_RECENT_FAILURES, { daysBack, limit });
  const recentFailures = (failsRes.rows ?? []).map((r: any) => ({
    testedOn: r.TESTEDON_IL ?? null,
    testName: r.TESTNAME ?? null,
    server: r.SERVER ?? null,
    almaVersion: r.ALMAVERSION ?? null,
    buildNumber: r.BUILDNUMBER ?? null,
    logLink: r.LOGLINK ?? null,
    screenshotLink: r.SCREENSHOTLINK ?? null,

    failureText: r.FAILURETEXT ?? null,

    failureTextPreview: buildFailureTextPreview(r.FAILURETEXT, 25, 20),
  }));

  return {
    area: "PRM",
    windowDays: daysBack,
    totals: { passed, failed, total, passRate },
    lastRun: lastRow
      ? {
          testedOn: lastRow.TESTEDON_IL ?? null,
          buildNumber: lastRow.BUILDNUMBER ?? null,
          server: lastRow.SERVER ?? null,
          almaVersion: lastRow.ALMAVERSION ?? null,
        }
      : { testedOn: null, buildNumber: null, server: null, almaVersion: null },
    recentFailures,
  };
}
