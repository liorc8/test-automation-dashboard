import { Request, Response } from "express";
import { getAlmaOops } from "../services/almaOopsService";
import { EnvFilter } from "../services/envFilter";

export const getAlmaOopsHandler = async (req: Request, res: Response) => {
  try {
    const envRaw = (req.query.env as string | undefined)?.toLowerCase();
    const env: EnvFilter = envRaw === "release" ? "release" : envRaw === "sandbox" ? "sandbox" : "qa";

    const data = await getAlmaOops(env);
    return res.json(data);
  } catch (error) {
    console.error("Error fetching Alma OOPS:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};
