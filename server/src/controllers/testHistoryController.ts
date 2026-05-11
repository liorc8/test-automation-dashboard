import { Request, Response } from "express";
import { AREAS } from "../config/areas";
import { getTestHistory } from "../services/testHistoryService";
import { EnvFilter } from "../services/envFilter";

export const getTestHistoryHandler = async (req: Request, res: Response) => {
    try {
        const areaName = req.params.areaName;
        const testName = req.params.testName;

        const isKnownArea = AREAS.some((a) => a.id === areaName.toUpperCase());
        if (!isKnownArea) return res.status(404).json({ error: `Unknown areaId: ${areaName}` });
        if (!testName) return res.status(400).json({ error: "Missing testName" });

        const daysBackRaw = (req.query.daysBack ?? req.query.windowDays) as string | undefined;
        const daysBack = daysBackRaw ? Number(daysBackRaw) : 30;
        if (!Number.isFinite(daysBack) || daysBack <= 0) {
            return res.status(400).json({ error: "daysBack must be a positive number" });
        }

        const envRaw = (req.query.env as string | undefined)?.toLowerCase();
        const env: EnvFilter = envRaw === "release" ? "release" : envRaw === "sandbox" ? "sandbox" : "qa";

        const safeDaysBack = Math.min(Math.floor(daysBack), 365);

        const data = await getTestHistory(areaName, testName, env, safeDaysBack);
        return res.json(data);
    } catch (error) {
        console.error("Error fetching test history:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
};
