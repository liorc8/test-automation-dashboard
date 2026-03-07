import { Request, Response } from "express";
import { AREAS } from "../config/areas";
import { getAreaFailures } from "../services/areaFailuresService";

function parsePositiveInt(value: unknown, defaultValue: number): number {
  if (typeof value !== "string" || value.trim() === "") return defaultValue;
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return defaultValue;
  return Math.floor(n);
}

function parseBool(value: unknown, defaultValue = false): boolean {
  if (typeof value !== "string") return defaultValue;
  return ["1", "true", "yes", "y", "on"].includes(value.toLowerCase());
}

export const getAreaFailuresHandler = async (req: Request, res: Response) => {
  try {
    const areaName = req.params.areaName;

    const isKnownArea = AREAS.some((a) => a.id === areaName);
    if (!isKnownArea) {
      return res.status(404).json({ error: `Unknown areaId: ${areaName}` });
    }

    const daysBack = parsePositiveInt(req.query.daysBack, 7);
    const limit = parsePositiveInt(req.query.limit, 50);

    const safeDaysBack = Math.min(daysBack, 90);
    const safeLimit = Math.min(limit, 500);

    const latestPerTest = parseBool(req.query.latestPerTest, false);

    const data = await getAreaFailures({
      areaName,
      daysBack: safeDaysBack,
      limit: safeLimit,
      latestPerTest,
    });

    return res.json(data);
  } catch (error) {
    console.error("Error fetching area failures:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};
