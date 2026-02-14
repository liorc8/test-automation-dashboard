import { Request, Response } from "express";
import { AREAS } from "../config/areas";
import { getAreaHealthSeries } from "../services/areaHealthService";

export const getAreaHealthHandler = async (req: Request, res: Response) => {
  try {
    const areaName = req.params.areaName;

    const isKnownArea = AREAS.some((a) => a.id === areaName);
    if (!isKnownArea) {
      return res.status(404).json({ error: `Unknown areaId: ${areaName}` });
    }

    const daysBackRaw = req.query.daysBack as string | undefined;
    const daysBack = daysBackRaw ? Number(daysBackRaw) : 8;

    if (!Number.isFinite(daysBack) || daysBack <= 0) {
      return res.status(400).json({ error: "daysBack must be a positive number" });
    }

    const data = await getAreaHealthSeries(areaName, Math.floor(daysBack));
    return res.json(data);
  } catch (error) {
    console.error("Error fetching area health:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};
