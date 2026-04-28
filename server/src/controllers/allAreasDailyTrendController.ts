import { Request, Response } from "express";
import { getAllAreasDailyTrends } from "../services/allAreasDailyTrendService";
import { EnvFilter } from "../services/envFilter";

export const getAllAreasDailyTrendHandler = async (req: Request, res: Response) => {
  try {
    const raw = req.query.daysBack;
    const rawStr = Array.isArray(raw) ? raw[0] : raw;
    const daysBack = rawStr == null || String(rawStr).trim() === "" ? 8 : Number(rawStr);

    if (!Number.isFinite(daysBack) || daysBack <= 0) {
      return res.status(400).json({ error: "daysBack must be a positive number" });
    }
    if (daysBack > 90) {
      return res.status(400).json({ error: "daysBack must not exceed 90" });
    }

    const envRaw = (req.query.env as string | undefined)?.toLowerCase();
    const env: EnvFilter =
      envRaw === "release" ? "release" : envRaw === "sandbox" ? "sandbox" : "qa";

    const data = await getAllAreasDailyTrends(Math.floor(daysBack), env);
    return res.json(data);
  } catch (error) {
    console.error("Error fetching all-areas daily trends:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};
