import { Router } from "express";
import { getAreaSummaryHandler } from "../controllers/areaSummaryController";
import { getAreasHandler } from "../controllers/areasController";
import { getAreaHealthHandler } from "../controllers/areaHealthController";
import { getAreasDashboardHandler } from "../controllers/dashboardController";
import { getAreaFailuresHandler } from "../controllers/areaFailuresController";
import { getAreaRecentFailuresGroupedHandler } from "../controllers/areaRecentFailuresGroupedController";
import { getAreaHealthTestsHandler } from "../controllers/areaHealthTestsController";
import { getAreaDailyTrendHandler } from "../controllers/areaDailyTrendController";

const router = Router();

router.get("/", getAreasHandler);
router.get("/:areaName/summary", getAreaSummaryHandler);
router.get("/:areaName/health", getAreaHealthHandler);
router.get("/dashboard", getAreasDashboardHandler);
router.get("/:areaName/failures", getAreaFailuresHandler);
router.get("/:areaName/recent-failures-grouped", getAreaRecentFailuresGroupedHandler);
router.get("/:areaName/health-tests", getAreaHealthTestsHandler);
router.get("/:areaName/daily-trend", getAreaDailyTrendHandler);

export default router;
