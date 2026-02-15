import { Router } from "express";
import { getAreaSummaryHandler } from "../controllers/areaSummaryController";
import { getAreasHandler } from "../controllers/areasController";
import { getAreaHealthHandler } from "../controllers/areaHealthController";
import { getAreasDashboardHandler } from "../controllers/dashboardController";

const router = Router();

router.get("/", getAreasHandler);
router.get("/:areaName/summary", getAreaSummaryHandler);
router.get("/:areaName/health", getAreaHealthHandler);
router.get("/dashboard", getAreasDashboardHandler);

export default router;
