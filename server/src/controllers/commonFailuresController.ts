import { Request, Response } from "express";
import { getCommonFailures, EnvFilter } from "../services/commonFailuresService";

export const getCommonFailuresHandler = async (req: Request, res: Response) => {
  try {
    const envRaw = (req.query.env as string | undefined)?.toLowerCase();
    const env: EnvFilter =
      envRaw === "release" ? "release" : envRaw === "sandbox" ? "sandbox" : "qa";

    const data = await getCommonFailures(env);
    return res.json(data);
  } catch (error) {
    console.error("Error fetching common failures:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};
