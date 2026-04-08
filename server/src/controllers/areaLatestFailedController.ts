import { Request, Response } from "express";
import { AREAS } from "../config/areas";
import { getAreaLatestFailed, EnvFilter } from "../services/areaLatestFailedService";

export const getAreaLatestFailedHandler = async (req: Request, res: Response) => {
  try {
    const areaName = req.params.areaName;

    const isKnownArea = AREAS.some((a) => a.id === areaName);
    if (!isKnownArea) {
      return res.status(404).json({ error: `Unknown areaId: ${areaName}` });
    }

    const envRaw = (req.query.env as string | undefined)?.toLowerCase();
    const env: EnvFilter =
      envRaw === "release" ? "release" : envRaw === "sandbox" ? "sandbox" : "qa";

    const data = await getAreaLatestFailed(areaName, env);
    return res.json(data);
  } catch (error) {
    console.error("Error fetching latest failed tests:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};
