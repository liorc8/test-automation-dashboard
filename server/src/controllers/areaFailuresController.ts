import { Request, Response } from "express";
import { AREAS } from "../config/areas";
import { getAreaFailures } from "../services/areaFailuresService";

export const getAreaFailuresHandler = async (req: Request, res: Response) => {
  try {
    const areaName = req.params.areaName;

    const isKnownArea = AREAS.some((a) => a.id === areaName);
    if (!isKnownArea) return res.status(404).json({ error: `Unknown areaId: ${areaName}` });

    const daysBackRaw = req.query.daysBack as string | undefined;
    const daysBack = daysBackRaw ? Number(daysBackRaw) : 7;
    if (!Number.isFinite(daysBack) || daysBack <= 0) {
      return res.status(400).json({ error: "daysBack must be a positive number" });
    }

    const limitRaw = req.query.limit as string | undefined;
    const limit = limitRaw ? Number(limitRaw) : 50;
    if (!Number.isFinite(limit) || limit <= 0) {
      return res.status(400).json({ error: "limit must be a positive number" });
    }

    const latestPerTestRaw = req.query.latestPerTest as string | undefined;
    const latestPerTest =
      typeof latestPerTestRaw === "string"
        ? ["1", "true", "yes", "y", "on"].includes(latestPerTestRaw.toLowerCase())
        : false;

    const data = await getAreaFailures({
      areaName,
      daysBack: Math.floor(daysBack),
      limit: Math.floor(limit),
      latestPerTest,
    });

    return res.json(data);
  } catch (error) {
    console.error("Error fetching area failures:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};
