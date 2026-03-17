import { Request, Response } from "express";
import { AREAS } from "../config/areas";
import { getAreaDailyTrend } from "../services/areaDailyTrendService";
import { EnvFilter } from "../services/envFilter";

export const getAreaDailyTrendHandler = async (req: Request, res: Response) => {
  try {
    const { areaName } = req.params;

    const isKnownArea = AREAS.some((a) => a.id === areaName);
    if (!isKnownArea) return res.status(404).json({ error: `Unknown areaId: ${areaName}` });

    const daysBackRaw = req.query.daysBack as string | undefined;
    const daysBack = daysBackRaw ? Number(daysBackRaw) : 8;
    if (!Number.isFinite(daysBack) || daysBack <= 0) {
      return res.status(400).json({ error: "daysBack must be a positive number" });
    }

    const envRaw = (req.query.env as string | undefined)?.toLowerCase();
    const env: EnvFilter = envRaw === "release" ? "release" : envRaw === "sandbox" ? "sandbox" : "qa";

    const safeDaysBack = Math.min(Math.floor(daysBack), 30);
    const data = await getAreaDailyTrend(areaName, safeDaysBack, env);
    return res.json({ areaName, env, daysBack: safeDaysBack, points: data });
  } catch (error) {
    console.error("Error fetching area daily trend:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};
