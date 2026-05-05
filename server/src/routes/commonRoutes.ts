import { Router } from "express";
import { getCommonFailuresHandler } from "../controllers/commonFailuresController";

const router = Router();

router.get("/", getCommonFailuresHandler);

export default router;
