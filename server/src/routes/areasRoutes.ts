import { Router } from "express";
import { getAreaSummaryHandler } from "../controllers/areaSummaryController";
import { getAreasHandler } from "../controllers/areasController";
import { getAreaHealthHandler } from "../controllers/areaHealthController";

const router = Router();

router.get("/", getAreasHandler);
router.get("/:areaName/summary", getAreaSummaryHandler);
router.get("/:areaName/health", getAreaHealthHandler);

export default router;
