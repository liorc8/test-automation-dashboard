import React, { useEffect, useState } from "react";
import { Container, Typography, Box, Alert, CircularProgress } from "@mui/material";
import Grid from "@mui/material/Grid";

import AreaCard from "../components/AreaCard";
import EnvToggle from "../components/EnvToggle";
import { getAreas, getAreasDashboard, type EnvFilter } from "../services/apiService";
import type { AreaItem } from "../types/Area";
import type { AreasDashboardResponse } from "../types/Dashboard";

type AreaCardVM = {
  id: string;
  name: string;
  lastRunDay: string | null;
  passRate: number;
  total: number;
  passed: number;
  failed: number;
};

const DashboardPage: React.FC = () => {
  const [cards, setCards] = useState<AreaCardVM[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [env, setEnv] = useState<EnvFilter>(
    () => (localStorage.getItem("selectedEnv") as EnvFilter) ?? "qa"
  );

  const handleEnvChange = (e: EnvFilter) => {
    setEnv(e);
    localStorage.setItem("selectedEnv", e);
  };

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError("");

        const [areas, dashboard]: [AreaItem[], AreasDashboardResponse] = await Promise.all([
          getAreas(),
          getAreasDashboard(8, env),
        ]);

        const byArea = new Map<string, AreasDashboardResponse["items"][number]>();
        for (const item of dashboard.items) {
          byArea.set(item.area.toUpperCase(), item);
        }

        const vm: AreaCardVM[] = areas.map((a) => {
          const item = byArea.get(a.id.toUpperCase());
          const w = item?.window;

          return {
            id: a.id,
            name: a.name,
            lastRunDay: item?.lastRunDay ?? null,
            passRate: w?.passRate ?? 0,
            total: w?.total ?? 0,
            passed: w?.passed ?? 0,
            failed: w?.failed ?? 0,
          };
        });

        setCards(vm);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [env]);

  return (
    <Container maxWidth={false} disableGutters sx={{ px: 3, py: 3 }}>

      {/* Header row: title + QA/Release toggle */}
      <Box sx={{ mb: 3, display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight="bold">
            Automation Status Overview
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Real-time status of all Alma testing areas
          </Typography>
        </Box>
        <EnvToggle value={env} onChange={handleEnvChange} />
      </Box>

      {loading && (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <CircularProgress size={20} />
          <Typography variant="body2" color="text.secondary">
            Loading...
          </Typography>
        </Box>
      )}

      {!loading && error && <Alert severity="error">{error}</Alert>}

      {!loading && !error && (
        <Grid container spacing={3}>
          {cards.map((c) => (
            <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3, xl: 3 }} key={c.id}>
              <AreaCard
                areaName={c.id}
                displayName={c.name}
                passRate={c.passRate}
                total={c.total}
                passed={c.passed}
                failed={c.failed}
                lastRunDay={c.lastRunDay}
                env={env}
              />
            </Grid>
          ))}
        </Grid>
      )}
    </Container>
  );
};

export default DashboardPage;