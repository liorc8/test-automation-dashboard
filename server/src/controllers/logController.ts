import { Request, Response } from "express";
import { expandLog } from "../services/logParserService";

export const expandLogHandler = async (req: Request, res: Response) => {
  try {
    const logUrlRaw = req.query.logUrl;
    const testNameRaw = req.query.testName;

    const logUrl = Array.isArray(logUrlRaw) ? logUrlRaw[0] : logUrlRaw;
    const testName = Array.isArray(testNameRaw) ? testNameRaw[0] : testNameRaw;

    if (!logUrl || typeof logUrl !== "string") {
      return res.status(400).json({ available: false, error: "Missing logUrl" });
    }

    const result = await expandLog(logUrl, typeof testName === "string" ? testName : "");
    return res.json(result);
  } catch (error) {
    console.error("Error expanding log:", error);
    return res.status(500).json({ available: false, error: "Failed to parse log." });
  }
};
