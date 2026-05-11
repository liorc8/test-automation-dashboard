import { execute } from "../db";
import { EnvFilter, buildServerFilter } from "./envFilter";

export type TestHistoryRow = {
    testedOn: string | null;
    endingTimeUnix: number | null;
    passed: boolean;
    server: string | null;
    buildNumber: number | null;
    almaVersion: string | null;
    failureText: string | null;
    logLink: string | null;
    screenshotLink: string | null;
};

export async function getTestHistory(
    areaName: string,
    testName: string,
    env: EnvFilter = "qa",
    daysBack: number = 30
): Promise<{ area: string; testName: string; env: EnvFilter; rows: TestHistoryRow[] }> {
    const area = areaName.toUpperCase();
    const serverFilter = buildServerFilter(env);

    const sql = `
SELECT
  TO_CHAR(TESTEDON, 'YYYY-MM-DD"T"HH24:MI:SS') AS TESTED_ON,
  ENDINGTIMEUNIX,
  LOWER(PASSED) AS PASSED,
  SERVER,
  BUILDNUMBER,
  ALMAVERSION,
  SUBSTR(FAILURETEXT, 1, 4000) AS FAILURETEXT,
  LOGLINK,
  SCREENSHOTLINK
FROM QA_AUTOMATION.TESTRESULTS
WHERE UPPER(AREA) = :area
  AND UPPER(TESTNAME) = :testname
  AND TRUNC(TESTEDON) >= TRUNC(SYSDATE) - :daysBack + 1
  ${serverFilter}
ORDER BY TESTEDON DESC, NVL(ENDINGTIMEUNIX, 0) DESC
`;

    const res = await execute(sql, { area, testname: testName.toUpperCase(), daysBack });
    const rows = (res.rows ?? []) as any[];

    const mapped = rows.map((r) => ({
        testedOn: r.TESTED_ON ?? null,
        endingTimeUnix: typeof r.ENDINGTIMEUNIX === "number" ? r.ENDINGTIMEUNIX : r.ENDINGTIMEUNIX ? Number(r.ENDINGTIMEUNIX) : null,
        passed: String(r.PASSED ?? "").toLowerCase() === "true",
        server: r.SERVER ?? null,
        buildNumber: typeof r.BUILDNUMBER === "number" ? r.BUILDNUMBER : r.BUILDNUMBER ? Number(r.BUILDNUMBER) : null,
        almaVersion: r.ALMAVERSION ?? null,
        failureText: r.FAILURETEXT ?? null,
        logLink: r.LOGLINK ?? null,
        screenshotLink: r.SCREENSHOTLINK ?? null,
    } as TestHistoryRow));

    return { area, testName, env, rows: mapped };
}

export default getTestHistory;
