import { Router } from "express";
import { getAreaSummaryHandler } from "../controllers/areaSummaryController";
import { getAreasHandler } from "../controllers/areasController";

const router = Router();

router.get("/", getAreasHandler);
router.get("/:areaName/summary", getAreaSummaryHandler);

export default router;
