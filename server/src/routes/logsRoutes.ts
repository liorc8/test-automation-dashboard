import { Router } from "express";
import { expandLogHandler } from "../controllers/logController";

const router = Router();

router.get("/expand", expandLogHandler);

export default router;
