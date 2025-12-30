import { Request, Response } from "express";
import { getPrmSummary } from "../services/prmSummaryService";

// Controller - English comments only
export const getPrmSummaryHandler = async (req: Request, res: Response) => {
  try {
    // Parse query params with defaults
    const daysBackRaw = Number(req.query.daysBack ?? 7);
    const limitRaw = Number(req.query.limit ?? 10);

    // Clamp values to keep DB safe and responses predictable
    const daysBack =
      Number.isFinite(daysBackRaw) ? Math.min(Math.max(daysBackRaw, 1), 90) : 7;

    const limit =
      Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 100) : 10;

    const data = await getPrmSummary(daysBack, limit);
    res.json(data);
  } catch (err) {
    console.error("❌ Error in getPrmSummaryHandler:", err);
    res.status(500).json({ error: "Failed to fetch PRM summary" });
  }
};
