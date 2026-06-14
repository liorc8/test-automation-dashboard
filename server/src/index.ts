import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import testResultsRoutes from "./routes/testResultsRoutes";
import areasRoutes from "./routes/areasRoutes";
import envsRoutes from "./routes/envsRoutes";
import commonRoutes from "./routes/commonRoutes";
import logsRoutes from "./routes/logsRoutes";
import { checkConnection, closePool } from "./db";

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use("/api/test-results", testResultsRoutes);
app.use("/api/areas", areasRoutes);
app.use("/api/envs", envsRoutes);
app.use("/api/common-failures", commonRoutes);
app.use("/api/logs", logsRoutes);

app.get("/health", (req: Request, res: Response) => {
  res.json({ status: "OK", system: "Automation Dashboard Backend" });
});

// Serve built client (client/dist) and SPA fallback for non-API routes.
const clientDist = path.resolve(__dirname, "../../client/dist");
app.use(express.static(clientDist));
app.get(/^(?!\/api|\/health).*/, (_req: Request, res: Response) => {
  res.sendFile(path.join(clientDist, "index.html"));
});

async function bootstrap() {
  const ok = await checkConnection();
  if (!ok) {
    console.error("❌ Server will not start because DB is unavailable.");
    process.exit(1);
  }

  const server = app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });

  const shutdown = async () => {
    console.log("Shutting down...");
    server.close(async () => {
      await closePool();
      process.exit(0);
    });
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

bootstrap().catch((err) => {
  console.error("❌ Bootstrap failed:", err);
  process.exit(1);
});
