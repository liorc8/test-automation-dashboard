import { Request, Response } from "express";
import { AREAS } from "../config/areas";
import { getAreaTestRailIds, TESTRAIL_BASE_URL } from "../services/testRailService";
import { EnvFilter } from "../services/envFilter";

export const getAreaTestRailIdsHandler = async (req: Request, res: Response) => {
  try {
    const { areaName } = req.params;

    const isKnownArea = AREAS.some((a) => a.id === areaName);
    if (!isKnownArea) return res.status(404).json({ error: `Unknown areaId: ${areaName}` });

    const envRaw = (req.query.env as string | undefined)?.toLowerCase();
    const env: EnvFilter = envRaw === "release" ? "release" : envRaw === "sandbox" ? "sandbox" : "qa";

    const ids = await getAreaTestRailIds(areaName, env);
    return res.json({ areaName, env, baseUrl: TESTRAIL_BASE_URL, ids });
  } catch (error) {
    console.error("Error fetching TestRail ids:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};
