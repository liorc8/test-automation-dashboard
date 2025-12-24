import { Request, Response } from "express";
import { execute } from "../db";

export const getTestResults = async (req: Request, res: Response) => {
  try {
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
