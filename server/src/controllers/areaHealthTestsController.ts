import { Request, Response } from "express";
import { isKnownArea } from "../services/areasService";
import { getAreaHealthTests, HealthBucket } from "../services/areaHealthTestsService";
import { EnvFilter } from "../services/envFilter";

const VALID_BUCKETS: HealthBucket[] = ["healthy", "medium", "bad", "dead"];

export const getAreaHealthTestsHandler = async (req: Request, res: Response) => {
  try {
    const { areaName } = req.params;

    const known = await isKnownArea(areaName);
    if (!known) return res.status(404).json({ error: `Unknown areaId: ${areaName}` });

    const bucketRaw = (req.query.bucket as string | undefined)?.toLowerCase();
    if (!bucketRaw || !VALID_BUCKETS.includes(bucketRaw as HealthBucket)) {
      return res.status(400).json({ error: `bucket must be one of: ${VALID_BUCKETS.join(", ")}` });
    }
    const bucket = bucketRaw as HealthBucket;

    const envRaw = (req.query.env as string | undefined)?.toLowerCase();
    const env: EnvFilter = envRaw === "release" ? "release" : envRaw === "sandbox" ? "sandbox" : "qa";

    const daysBackRaw = req.query.daysBack as string | undefined;
    const daysBackValue = daysBackRaw == null || daysBackRaw.trim() === "" ? 8 : Number(daysBackRaw);
    const daysBack = Number.isFinite(daysBackValue) && daysBackValue > 0 ? Math.floor(daysBackValue) : 8;

    const tests = await getAreaHealthTests(areaName, bucket, env, daysBack);
    return res.json({ areaName, bucket, env, tests });
  } catch (error) {
    console.error("Error fetching area health tests:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};
