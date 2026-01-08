import { Router } from "express";
import { getAreaSummaryHandler } from "../controllers/areaSummaryController";

const router = Router();

router.get("/:areaName/summary", getAreaSummaryHandler);

export default router;