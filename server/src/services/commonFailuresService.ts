import { execute } from "../db";
import { cleanReason } from "../utils/failureText";
import { EnvFilter, buildServerFilter } from "./envFilter";

export type { EnvFilter };

export type CommonFailureExample = {
  area: string;
  testName: string;
  logLink: string | null;
  screenshotLink: string | null;
};

export type CommonFailureCluster = {
  failureText: string;
  occurrenceCount: number;
  affectedAreas: string[];
  examples: CommonFailureExample[];
};

export type CommonFailuresResult = {
  env: EnvFilter;
  clusters: CommonFailureCluster[];
};

function buildSQL(serverFilter: string): string {
  return `
WITH threshold AS (
  SELECT (SYSDATE - :hoursBack/24 - TO_DATE('1970-01-01','YYYY-MM-DD')) * 86400 * 1000 AS MIN_UNIX
  FROM DUAL
),
failures AS (
  SELECT
    UPPER(AREA) AS AREA,
    TESTNAME,
    ENDINGTIMEUNIX,
    LOGLINK,
    SCREENSHOTLINK,
    SUBSTR(FAILURETEXT, 1, 4000) AS REASON_KEY
  FROM QA_AUTOMATION.TESTRESULTS, threshold
  WHERE LOWER(PASSED) = 'false'
    AND FAILURETEXT IS NOT NULL
    AND NVL(FAILURETEXT, '') NOT LIKE '%@BeforeMethod%'
    AND ENDINGTIMEUNIX > threshold.MIN_UNIX
    ${serverFilter}
),
distinct_areas AS (
  SELECT REASON_KEY, AREA
  FROM failures
  WHERE REASON_KEY IS NOT NULL
  GROUP BY REASON_KEY, AREA
),
cluster_areas AS (
  SELECT
    REASON_KEY,
    LISTAGG(AREA, ',') WITHIN GROUP (ORDER BY AREA) AS AFFECTED_AREAS
  FROM distinct_areas
  GROUP BY REASON_KEY
),
clusters AS (
  SELECT
    f.REASON_KEY,
    COUNT(*) AS OCCURRENCE_COUNT,
    ca.AFFECTED_AREAS
  FROM failures f
  JOIN cluster_areas ca ON ca.REASON_KEY = f.REASON_KEY
  WHERE f.REASON_KEY IS NOT NULL
  GROUP BY f.REASON_KEY, ca.AFFECTED_AREAS
  HAVING COUNT(*) >= :minCount
),
ranked_examples AS (
  SELECT
    f.REASON_KEY,
    f.AREA,
    f.TESTNAME,
    f.LOGLINK,
    f.SCREENSHOTLINK,
    ROW_NUMBER() OVER (
      PARTITION BY f.REASON_KEY
      ORDER BY
        CASE WHEN f.SCREENSHOTLINK IS NOT NULL THEN 0 ELSE 1 END,
        f.ENDINGTIMEUNIX DESC
    ) AS RN
  FROM failures f
  JOIN clusters c ON c.REASON_KEY = f.REASON_KEY
)
SELECT
  c.REASON_KEY,
  c.OCCURRENCE_COUNT,
  c.AFFECTED_AREAS,
  e.AREA       AS EX_AREA,
  e.TESTNAME   AS EX_TESTNAME,
  e.LOGLINK    AS EX_LOGLINK,
  e.SCREENSHOTLINK AS EX_SCREENSHOT,
  e.RN         AS EX_RN
FROM clusters c
JOIN ranked_examples e ON e.REASON_KEY = c.REASON_KEY AND e.RN <= 5
ORDER BY c.OCCURRENCE_COUNT DESC, c.REASON_KEY, e.RN
`;
}

const HOURS_BACK = 24;
const MIN_COUNT = 5; // matches legacy Java: count > 4

export async function getCommonFailures(
  env: EnvFilter = "qa"
): Promise<CommonFailuresResult> {
  const serverFilter = buildServerFilter(env);
  const sql = buildSQL(serverFilter);

  const res = await execute(sql, { hoursBack: HOURS_BACK, minCount: MIN_COUNT });
  const rows = (res.rows ?? []) as any[];

  const clusterMap = new Map<string, CommonFailureCluster>();

  for (const r of rows) {
    const key = r.REASON_KEY as string;
    if (!key) continue;

    if (!clusterMap.has(key)) {
      const text = cleanReason(key);
      if (!text) continue;

      const areasRaw = (r.AFFECTED_AREAS as string) ?? "";
      const affectedAreas = areasRaw
        .split(",")
        .map((a: string) => a.trim())
        .filter(Boolean);

      clusterMap.set(key, {
        failureText: text,
        occurrenceCount: Number(r.OCCURRENCE_COUNT ?? 0),
        affectedAreas,
        examples: [],
      });
    }

    const cluster = clusterMap.get(key)!;
    const testName = r.EX_TESTNAME as string | null;
    if (testName) {
      cluster.examples.push({
        area: (r.EX_AREA as string) ?? "",
        testName,
        logLink: (r.EX_LOGLINK as string | null) ?? null,
        screenshotLink: (r.EX_SCREENSHOT as string | null) ?? null,
      });
    }
  }

  const clusters = Array.from(clusterMap.values()).sort(
    (a, b) => b.occurrenceCount - a.occurrenceCount
  );

  return { env, clusters };
}
