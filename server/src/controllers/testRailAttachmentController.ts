import { Request, Response } from "express";
import { getScreenshotForRun } from "../services/testRailAttachmentService";

export const getTestRailScreenshotHandler = async (req: Request, res: Response) => {
  try {
    const { testRailId, targetUnixTime } = req.params;

    if (!testRailId || !/^\d+$/.test(testRailId)) {
      return res.status(400).json({ error: "Missing or invalid testRailId" });
    }
    if (!targetUnixTime || !/^\d+$/.test(targetUnixTime)) {
      return res.status(400).json({ error: "Missing or invalid targetUnixTime" });
    }

    const attachment = await getScreenshotForRun(testRailId, Number(targetUnixTime));

    if (!attachment) {
      return res.status(404).json({ error: "No matching screenshot found in TestRail for this failure." });
    }

    res.setHeader("Content-Type", attachment.contentType);
    // A past failure's screenshot never changes — safe to cache in the browser for a full day.
    res.setHeader("Cache-Control", "private, max-age=86400");
    return res.send(attachment.buffer);
  } catch (error) {
    console.error("Error fetching TestRail screenshot:", error);
    return res.status(500).json({ error: "Failed to fetch screenshot from TestRail." });
  }
};