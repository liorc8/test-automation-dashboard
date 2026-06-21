import { Router } from "express";
import { getAlmaOopsHandler } from "../controllers/almaOopsController";

const router = Router();

router.get("/", getAlmaOopsHandler);

export default router;
