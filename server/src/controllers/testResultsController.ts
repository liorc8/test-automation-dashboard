import { Request, Response } from "express";
import { execute } from "../db";
import { EnvFilter, buildServerFilter } from "../services/envFilter";

export const getTestResults = async (req: Request, res: Response) => {
  try {
    const q = (req.query.q as string | undefined)?.trim() ?? "";
    const limitRaw = req.query.limit as string | undefined;
    const limit = limitRaw ? Number(limitRaw) : 10;
    const envRaw = (req.query.env as string | undefined)?.toLowerCase();
    const env: EnvFilter = envRaw === "release" ? "release" : envRaw === "sandbox" ? "sandbox" : "qa";

    if (q) {
      const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.min(Math.floor(limit), 25) : 10;
      const serverFilter = buildServerFilter(env);
      const sql = `
        WITH latest_per_test AS (
          SELECT
            UPPER(AREA) AS AREA,
            UPPER(TESTNAME) AS TESTNAME,
            TESTEDON,
            ENDINGTIMEUNIX,
            ROW_NUMBER() OVER (
              PARTITION BY UPPER(AREA), UPPER(TESTNAME)
              ORDER BY TESTEDON DESC, NVL(ENDINGTIMEUNIX, 0) DESC
            ) AS RN
          FROM QA_AUTOMATION.TESTRESULTS
          WHERE UPPER(TESTNAME) LIKE UPPER(:pattern)
          ${serverFilter}
        )
        SELECT
          AREA,
          TESTNAME,
          TO_CHAR(TESTEDON, 'YYYY-MM-DD"T"HH24:MI:SS') AS TESTED_ON
        FROM latest_per_test
        WHERE RN = 1
        ORDER BY TESTEDON DESC, ENDINGTIMEUNIX DESC
        FETCH FIRST :limit ROWS ONLY
      `;

      const result = await execute(sql, { pattern: `%${q}%`, limit: safeLimit });
      const transformed = (result.rows ?? []).map((row: any) => ({
        area: row.AREA,
        testName: row.TESTNAME,
        testedOn: row.TESTED_ON,
      }));
      return res.json(transformed);
    }

    const sql = `
      SELECT * 
      FROM QA_AUTOMATION.TESTRESULTS
      FETCH FIRST 50 ROWS ONLY
    `;

    const result = await execute(sql);

    res.json(result.rows);
  } catch (err) {
    console.error("❌ Error in getTestResults:", err);
    res.status(500).json({ error: "Failed to fetch test results" });
  }
};
