import { Request, Response } from "express";
import { AREAS } from "../config/areas";
import { getAreaRecentFailuresGrouped } from "../services/areaRecentFailuresGroupedService";

export const getAreaRecentFailuresGroupedHandler = async (req: Request, res: Response) => {
    try {
        const areaName = req.params.areaName;

        const isKnownArea = AREAS.some((a) => a.id === areaName);
        if (!isKnownArea) return res.status(404).json({ error: `Unknown areaId: ${areaName}` });

        const daysBackRaw = (req.query.windowDays ?? req.query.daysBack) as string | undefined;
        const daysBack = daysBackRaw ? Number(daysBackRaw) : 7;

        if (!Number.isFinite(daysBack) || daysBack <= 0) {
            return res.status(400).json({ error: "daysBack must be a positive number" });
        }

        const limitRaw = req.query.limit as string | undefined;
        const limit = limitRaw ? Number(limitRaw) : 50;
        if (!Number.isFinite(limit) || limit <= 0) {
            return res.status(400).json({ error: "limit must be a positive number" });
        }

        const safeDaysBack = Math.min(Math.floor(daysBack), 90);
        const safeLimit = Math.min(Math.floor(limit), 500);

        const data = await getAreaRecentFailuresGrouped(areaName, safeDaysBack, safeLimit);
        return res.json(data);
    } catch (error) {
        console.error("Error fetching grouped recent failures:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
};
