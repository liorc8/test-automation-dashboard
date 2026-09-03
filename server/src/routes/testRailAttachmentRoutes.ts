import { Router } from "express";
import { getTestRailScreenshotHandler } from "../controllers/testRailAttachmentController";

const router = Router();

router.get("/screenshot/:testRailId/:targetUnixTime", getTestRailScreenshotHandler);

export default router;