import { Request, Response } from "express";
import { getAreaSummary } from "../services/areaSummaryService";
import { AREAS } from "../config/areas";

export const getAreaSummaryHandler = async (req: Request, res: Response) => {
  try {
    const areaName = req.params.areaName;

    const isKnownArea = AREAS.some((a) => a.id === areaName);
    if (!isKnownArea) {
      return res.status(404).json({ error: `Unknown areaId: ${areaName}` });
    }

    const limitRaw = req.query.limit as string | undefined;
    const limit = limitRaw ? Number(limitRaw) : 10;
    if (!Number.isFinite(limit) || limit <= 0) {
      return res.status(400).json({ error: "limit must be a positive number" });
    }

    const daysBackRaw = req.query.daysBack as string | undefined;
    const daysBack = daysBackRaw ? Number(daysBackRaw) : 7;
    if (!Number.isFinite(daysBack) || daysBack <= 0) {
      return res.status(400).json({ error: "daysBack must be a positive number" });
    }

    const data = await getAreaSummary(areaName, limit);
    return res.json(data);
  } catch (error) {
    console.error("Error fetching summary:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};