import { execute } from "../db";

const SQL_AREA_FAILURES_RAW = `
  SELECT * FROM (
    SELECT
      TO_CHAR(TESTEDON, 'DD/MM/YYYY HH24:MI') AS TESTEDON_IL,
      TO_CHAR(TRUNC(TESTEDON), 'YYYY-MM-DD') AS RUN_DAY,
      TESTNAME,
      SERVER,
      ALMAVERSION,
      BUILDNUMBER,
      LOGLINK,
      SCREENSHOTLINK,
      FAILURETEXT
    FROM QA_AUTOMATION.TESTRESULTS
    WHERE UPPER(AREA) = :area
      AND LOWER(PASSED) = 'false'
      AND NVL(FAILURETEXT, '') NOT LIKE '%@BeforeMethod%'
      AND TRUNC(TESTEDON) >= TRUNC(SYSDATE) - :daysBack + 1
    ORDER BY TESTEDON DESC
  )
  WHERE ROWNUM <= :limit
`;

const SQL_AREA_FAILURES_LATEST_PER_TEST = `
  WITH latest_per_test AS (
    SELECT
      t.*,
      ROW_NUMBER() OVER (
        PARTITION BY TESTNAME
        ORDER BY TESTEDON DESC, NVL(ENDINGTIMEUNIX, 0) DESC
      ) AS rn
    FROM QA_AUTOMATION.TESTRESULTS t
    WHERE UPPER(AREA) = :area
      AND TRUNC(TESTEDON) >= TRUNC(SYSDATE) - :daysBack + 1
  )
  SELECT * FROM (
    SELECT
      TO_CHAR(TESTEDON, 'DD/MM/YYYY HH24:MI') AS TESTEDON_IL,
      TO_CHAR(TRUNC(TESTEDON), 'YYYY-MM-DD') AS RUN_DAY,
      TESTNAME,
      SERVER,
      ALMAVERSION,
      BUILDNUMBER,
      LOGLINK,
      SCREENSHOTLINK,
      FAILURETEXT
    FROM latest_per_test
    WHERE rn = 1
      AND LOWER(PASSED) = 'false'
      AND NVL(FAILURETEXT, '') NOT LIKE '%@BeforeMethod%'
    ORDER BY TESTEDON DESC
  )
  WHERE ROWNUM <= :limit
`;

function redactSensitive(text: string): string {
  return text
    .replace(/(^|\n)(INFO\s+.*-\s*Username for login is:\s*).*/gi, "$1$2***REDACTED***")
    .replace(/(^|\n)(INFO\s+.*-\s*Password for login is:\s*).*/gi, "$1$2***REDACTED***")
    .replace(/(^|\n)(DEBUG\s+.*-\s*JSESSIONID:\s*).*/gi, "$1$2***REDACTED***")

    .replace(/(^|\n)(.*\bAuthorization\b.*:\s*).*/gi, "$1$2***REDACTED***")
    .replace(/(^|\n)(.*\bBearer\b\s+).*/gi, "$1$2***REDACTED***")

    .replace(/(^|\n)(.*\bpassword\b.*:\s*).*/gi, "$1$2***REDACTED***")
    .replace(/(^|\n)(.*\btoken\b.*:\s*).*/gi, "$1$2***REDACTED***")
    .replace(/(^|\n)(.*\bsecret\b.*:\s*).*/gi, "$1$2***REDACTED***")
    .replace(/(^|\n)(.*\bapi[_-]?key\b.*:\s*).*/gi, "$1$2***REDACTED***");
}

function buildFailureTextPreview(
  text: unknown,
  linesBackFromFatal = 25,
  fallbackLastLines = 20,
  maxChars = 4000
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

  let preview: string;
  if (fatalIndex >= 0) {
    const start = Math.max(0, fatalIndex - linesBackFromFatal);
    preview = lines.slice(start, fatalIndex + 1).join("\n").trim();
  } else {
    const start = Math.max(0, lines.length - fallbackLastLines);
    preview = lines.slice(start).join("\n").trim();
  }

  if (!preview) return null;

  if (preview.length > maxChars) {
    preview = preview.slice(0, maxChars).trimEnd();
  }

  return redactSensitive(preview);
}

function toNumber(x: unknown): number | null {
  if (typeof x === "number") return x;
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
}

function parseBool(x: unknown): boolean {
  if (typeof x !== "string") return false;
  return ["1", "true", "yes", "y", "on"].includes(x.toLowerCase());
}

export type AreaFailureItem = {
  runDay: string | null;
  testedOn: string | null;
  testName: string | null;
  server: string | null;
  almaVersion: string | null;
  buildNumber: number | null;
  logLink: string | null;
  screenshotLink: string | null;
  failureTextPreview: string | null;
};

export async function getAreaFailures(params: {
  areaName: string;
  daysBack: number;
  limit: number;
  latestPerTest?: boolean;
}): Promise<{
  area: string;
  windowDays: number;
  mode: "raw" | "latestPerTest";
  items: AreaFailureItem[];
}> {
  const area = params.areaName.toUpperCase();
  const daysBack = params.daysBack;
  const limit = params.limit;

  const latest = Boolean(params.latestPerTest);
  const sql = latest ? SQL_AREA_FAILURES_LATEST_PER_TEST : SQL_AREA_FAILURES_RAW;

  const res = await execute(sql, { area, daysBack, limit });
  const rows = (res.rows ?? []) as any[];

  const items: AreaFailureItem[] = rows.map((r) => ({
    runDay: (r.RUN_DAY ?? null) as string | null,
    testedOn: (r.TESTEDON_IL ?? null) as string | null,
    testName: (r.TESTNAME ?? null) as string | null,
    server: (r.SERVER ?? null) as string | null,
    almaVersion: (r.ALMAVERSION ?? null) as string | null,
    buildNumber: toNumber(r.BUILDNUMBER),
    logLink: (r.LOGLINK ?? null) as string | null,
    screenshotLink: (r.SCREENSHOTLINK ?? null) as string | null,
    failureTextPreview: buildFailureTextPreview(r.FAILURETEXT, 25, 20, 4000),
  }));

  return {
    area,
    windowDays: daysBack,
    mode: latest ? "latestPerTest" : "raw",
    items,
  };
}
