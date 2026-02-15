import { Request, Response } from "express";
import { getAreasDashboard } from "../services/dashboardService";

export const getAreasDashboardHandler = async (req: Request, res: Response) => {
  try {
    const raw = req.query.daysBack;
    const rawStr = Array.isArray(raw) ? raw[0] : raw;
    const daysBackValue =
      rawStr == null || String(rawStr).trim() === "" ? 8 : Number(rawStr);

    if (!Number.isFinite(daysBackValue) || daysBackValue <= 0) {
      return res.status(400).json({ error: "daysBack must be a positive number" });
    }

    const data = await getAreasDashboard(Math.floor(daysBackValue));
    return res.json(data);
  } catch (error) {
    console.error("Error fetching dashboard:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};
