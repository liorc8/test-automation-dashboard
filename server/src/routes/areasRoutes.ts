import { Router } from "express";
import { getAreaSummaryHandler } from "../controllers/areaSummaryController";
import { getAreasHandler } from "../controllers/areasController";
import { getAreaHealthHandler } from "../controllers/areaHealthController";
import { getAreasDashboardHandler } from "../controllers/dashboardController";
import { getAreaFailuresHandler } from "../controllers/areaFailuresController";
import { getAreaRecentFailuresGroupedHandler } from "../controllers/areaRecentFailuresGroupedController";
import { getAreaHealthTestsHandler } from "../controllers/areaHealthTestsController";
import { getAreaDailyTrendHandler } from "../controllers/areaDailyTrendController";
import { getAreaLatestFailedHandler } from "../controllers/areaLatestFailedController";
import { getAllAreasDailyTrendHandler } from "../controllers/allAreasDailyTrendController";

const router = Router();

router.get("/", getAreasHandler);
router.get("/dashboard", getAreasDashboardHandler);
router.get("/daily-trends", getAllAreasDailyTrendHandler);
router.get("/:areaName/summary", getAreaSummaryHandler);
router.get("/:areaName/health", getAreaHealthHandler);
router.get("/:areaName/failures", getAreaFailuresHandler);
router.get("/:areaName/recent-failures-grouped", getAreaRecentFailuresGroupedHandler);
router.get("/:areaName/health-tests", getAreaHealthTestsHandler);
router.get("/:areaName/daily-trend", getAreaDailyTrendHandler);
router.get("/:areaName/latest-failed-tests", getAreaLatestFailedHandler);

export default router;
