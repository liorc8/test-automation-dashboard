import { execute } from "../db";
import { EnvFilter } from "./envFilter";

// Base URL for a TestRail case/test view. Append the testrail id.
export const TESTRAIL_BASE_URL =
  "http://testrail.pre.proquest.com/testrail/index.php?/tests/view/";

const PRODUCT = "Alma";

// Maps the dashboard env to the TestRail suite name used in the testrail_ids table.
function suiteForEnv(env: EnvFilter): string {
  if (env === "release") return "Release";
  if (env === "sandbox") return "Sandbox";
  return "QA";
}

/**
 * Returns a map of UPPER(testName) -> testrail id for the given area + env.
 * Only tests that exist in the area (TESTRESULTS) are included.
 *
 * Assumed schema: testrail_ids(TESTNAME, PRODUCT, SUITE, TESTRAIL_ID).
 */
export async function getAreaTestRailIds(
  areaName: string,
  env: EnvFilter = "qa"
): Promise<Record<string, string>> {
  const suite = suiteForEnv(env);
  const sql = `
    SELECT UPPER(tr.TESTNAME) AS TESTNAME, tr.TESTRAIL_ID AS TESTRAIL_ID
    FROM testrail_ids tr
    WHERE UPPER(tr.PRODUCT) = UPPER(:product)
      AND UPPER(tr.SUITE)   = UPPER(:suite)
      AND UPPER(tr.TESTNAME) IN (
        SELECT DISTINCT UPPER(TESTNAME)
        FROM QA_AUTOMATION.TESTRESULTS
        WHERE UPPER(AREA) = UPPER(:area)
      )
  `;

  const res = await execute(sql, { product: PRODUCT, suite, area: areaName });
  const rows = (res.rows ?? []) as any[];

  const map: Record<string, string> = {};
  for (const r of rows) {
    const name = String(r.TESTNAME ?? "");
    const id = r.TESTRAIL_ID != null ? String(r.TESTRAIL_ID) : "";
    if (name && id) map[name] = id;
  }
  return map;
}
