import { Request, Response } from "express";
import { AREAS } from "../config/areas";
import { getAreas } from "../services/areasService";

export async function getAreasHandler(_req: Request, res: Response) {
  try {
    const areas = await getAreas();
    res.json(areas);
  } catch (err) {
    console.error("Error fetching areas, falling back to static config:", err);
    res.json(AREAS);
  }
}
