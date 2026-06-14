import { Request, Response } from "express";
import { isKnownArea } from "../services/areasService";
import { getAreaFailuresByReason } from "../services/areaFailuresByReasonService";
import { EnvFilter } from "../services/envFilter";

export const getAreaFailuresByReasonHandler = async (req: Request, res: Response) => {
  try {
    const { areaName } = req.params;

    const known = await isKnownArea(areaName);
    if (!known) return res.status(404).json({ error: `Unknown areaId: ${areaName}` });

    const daysBackRaw = (req.query.windowDays ?? req.query.daysBack) as string | undefined;
    const daysBackValue = daysBackRaw == null || daysBackRaw.trim() === "" ? 10 : Number(daysBackRaw);
    if (!Number.isFinite(daysBackValue) || daysBackValue <= 0) {
      return res.status(400).json({ error: "daysBack must be a positive number" });
    }

    const envRaw = (req.query.env as string | undefined)?.toLowerCase();
    const env: EnvFilter = envRaw === "release" ? "release" : envRaw === "sandbox" ? "sandbox" : "qa";

    const safeDaysBack = Math.min(Math.floor(daysBackValue), 90);
    const data = await getAreaFailuresByReason(areaName, safeDaysBack, env);
    return res.json(data);
  } catch (error) {
    console.error("Error fetching failures by reason:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};
