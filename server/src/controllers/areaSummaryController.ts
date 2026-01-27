import { Request, Response } from "express";
import { getAreaSummary } from "../services/areaSummaryService";

export const getAreaSummaryHandler = async (req: Request, res: Response) => {
  try {
    const areaName = req.params.areaName;
    const limit = parseInt(req.query.limit as string) || 10;
    const daysBack = parseInt(req.query.daysBack as string) || 7;

    const data = await getAreaSummary(areaName, limit);
    res.json(data);
  } catch (error) {
    console.error("Error fetching summary:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};