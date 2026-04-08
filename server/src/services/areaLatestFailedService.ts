import { execute } from "../db";
import { cleanReason } from "../utils/failureText";
import { EnvFilter, buildServerFilter } from "./envFilter";

export type { EnvFilter };

export type LatestFailedTestItem = {
  testName: string;
  server: string;
  testedOn: string | null;
  failureText: string | null;
  logLink: string | null;
  screenshotLink: string | null;
  almaVersion: string | null;
  buildNumber: number | null;
};

export type LatestFailedByServer = {
  server: string;
  tests: LatestFailedTestItem[];
};

export type LatestFailedTestsResponse = {
  area: string;
  env: EnvFilter;
  totalCount: number;
  servers: LatestFailedByServer[];
};

function buildSQL(serverFilter: string): string {
  return `
WITH latest_run AS (
  SELECT
    TESTNAME,
    SERVER,
    ALMAVERSION,
    BUILDNUMBER,
    LOGLINK,
    SCREENSHOTLINK,
    FAILURETEXT,
    PASSED,
    TESTEDON,
    ENDINGTIMEUNIX,
    ROW_NUMBER() OVER (
      PARTITION BY TESTNAME
      ORDER BY TESTEDON DESC, NVL(ENDINGTIMEUNIX, 0) DESC
    ) AS RN
  FROM QA_AUTOMATION.TESTRESULTS
  WHERE UPPER(AREA) = :area
    ${serverFilter}
)
SELECT
  TESTNAME,
  SERVER,
  ALMAVERSION,
  BUILDNUMBER,
  LOGLINK,
  SCREENSHOTLINK,
  FAILURETEXT,
  TESTEDON,
  ENDINGTIMEUNIX
FROM latest_run
WHERE RN = 1
  AND LOWER(PASSED) = 'false'
  AND NVL(FAILURETEXT, '') NOT LIKE '%@BeforeMethod%'
ORDER BY SERVER ASC NULLS LAST, TESTNAME ASC
`;
}

function formatDate(x: unknown): string | null {
  if (!x) return null;
  const d = x instanceof Date ? x : new Date(x as any);
  if (isNaN(d.getTime())) return null;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${yyyy}-${mm}-${dd}`;
}

function toNumber(x: unknown): number | null {
  if (typeof x === "number") return x;
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
}

export async function getAreaLatestFailed(
  areaName: string,
  env: EnvFilter = "qa"
): Promise<LatestFailedTestsResponse> {
  const area = areaName.toUpperCase();
  const serverFilter = buildServerFilter(env);
  const sql = buildSQL(serverFilter);

  const res = await execute(sql, { area });
  const rows = (res.rows ?? []) as any[];

  // Group by server — pure array grouping, no filtering logic
  const serverMap = new Map<string, LatestFailedTestItem[]>();

  for (const r of rows) {
    const server: string = (r.SERVER ?? "Unknown") as string;
    const item: LatestFailedTestItem = {
      testName: String(r.TESTNAME),
      server,
      testedOn: formatDate(r.TESTEDON),
      failureText: cleanReason(r.FAILURETEXT),
      logLink: (r.LOGLINK ?? null) as string | null,
      screenshotLink: (r.SCREENSHOTLINK ?? null) as string | null,
      almaVersion: (r.ALMAVERSION ?? null) as string | null,
      buildNumber: toNumber(r.BUILDNUMBER),
    };

    if (!serverMap.has(server)) {
      serverMap.set(server, []);
    }
    serverMap.get(server)!.push(item);
  }

  const servers: LatestFailedByServer[] = Array.from(serverMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([server, tests]) => ({ server, tests }));

  return {
    area,
    env,
    totalCount: rows.length,
    servers,
  };
}
