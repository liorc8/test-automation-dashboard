import { Router } from "express";
import { getEnvHealthHandler } from "../controllers/envHealthController";

const router = Router();

router.get("/:env/health", getEnvHealthHandler);

export default router;
