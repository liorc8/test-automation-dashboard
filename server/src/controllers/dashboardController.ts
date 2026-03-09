import { Request, Response } from "express";
import { getAreasDashboard } from "../services/dashboardService";
import { EnvFilter } from "../services/envFilter";

export const getAreasDashboardHandler = async (req: Request, res: Response) => {
  try {
    const raw = req.query.daysBack;
    const rawStr = Array.isArray(raw) ? raw[0] : raw;
    const daysBackValue =
      rawStr == null || String(rawStr).trim() === "" ? 8 : Number(rawStr);

    if (!Number.isFinite(daysBackValue) || daysBackValue <= 0) {
      return res.status(400).json({ error: "daysBack must be a positive number" });
    }

    const envRaw = (req.query.env as string | undefined)?.toLowerCase();
    const env: EnvFilter = envRaw === "release" ? "release" : envRaw === "sandbox" ? "sandbox" : "qa";

    const data = await getAreasDashboard(Math.floor(daysBackValue), env);
    return res.json(data);
  } catch (error) {
    console.error("Error fetching dashboard:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};