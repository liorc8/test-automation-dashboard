import { Router } from "express";
import { getPrmSummaryHandler } from "../controllers/prmSummaryController";

const router = Router();

// (PRM only for now)
router.get("/PRM/summary", getPrmSummaryHandler);

export default router;
