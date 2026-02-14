import { Request, Response } from "express";
import { getEnvHealthSeries } from "../services/envHealthService";

export const getEnvHealthHandler = async (req: Request, res: Response) => {
  try {
    const env = req.params.env;
    if (!/^[A-Za-z0-9_-]+$/.test(env)) {
      return res.status(400).json({ error: "env contains invalid characters" });
    }

    const raw = req.query.daysBack;
    const rawStr = Array.isArray(raw) ? raw[0] : raw;

    const daysBackValue =
      rawStr == null || String(rawStr).trim() === "" ? 8 : Number(rawStr);

    if (!Number.isFinite(daysBackValue) || daysBackValue <= 0) {
      return res.status(400).json({ error: "daysBack must be a positive number" });
    }

    const data = await getEnvHealthSeries(env, Math.floor(daysBackValue));
    return res.json(data);
  } catch (error) {
    console.error("Error fetching env health:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};
