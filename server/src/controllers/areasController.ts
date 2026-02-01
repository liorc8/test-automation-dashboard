import { Request, Response } from "express";
import { AREAS } from "../config/areas";

export function getAreasHandler(req: Request, res: Response) {
  res.json(AREAS);
}
