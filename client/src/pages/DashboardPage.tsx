import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Container, Typography, Box, Alert, CircularProgress, Divider, Button } from "@mui/material";
import Grid from "@mui/material/Grid";

import AreaCard from "../components/AreaCard";
import EnvToggle from "../components/EnvToggle";
import { useFavorites } from "../hooks/useFavorites";
import { getAreas, getAreasDashboard, getAllAreasDailyTrends, type EnvFilter, type DailyTrendPoint } from "../services/apiService";
import type { AreaItem } from "../types/Area";
import type { AreasDashboardResponse, HealthBuckets } from "../types/Dashboard";

type AreaCardVM = {
  id: string;
  name: string;
  passRate: number;
  total: number;
  passed: number;
  failed: number;
  health: HealthBuckets;
  trendData: DailyTrendPoint[];
};

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [cards, setCards] = useState<AreaCardVM[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { toggleFavorite, isFavorite } = useFavorites();
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

        const [areas, dashboard, trendsResponse] = await Promise.all([
          getAreas(),
          getAreasDashboard(8, env),
          getAllAreasDailyTrends(8, env),
        ]);

        const byArea = new Map<string, AreasDashboardResponse["items"][number]>();
        for (const item of dashboard.items) {
          byArea.set(item.area.toUpperCase(), item);
        }

        const trendsByArea = new Map<string, DailyTrendPoint[]>();
        for (const [area, points] of Object.entries(trendsResponse.areas)) {
          trendsByArea.set(area.toUpperCase(), points);
        }

        const vm: AreaCardVM[] = areas.map((a) => {
          const item = byArea.get(a.id.toUpperCase());
          const l = item?.last;

          return {
            id: a.id,
            name: a.name,
            passRate: l?.passRate ?? 0,
            total: l?.total ?? 0,
            passed: l?.passed ?? 0,
            failed: l?.failed ?? 0,
            health: item?.health ?? { healthy: 0, medium: 0, bad: 0, dead: 0 },
            trendData: trendsByArea.get(a.id.toUpperCase()) ?? [],
          };
        });

        setCards([...vm].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })));
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

      {/* Header row: 3-column layout keeps the center content truly centered */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 4 }}>

        {/* Left: nav button, vertically aligned with the env toggle */}
        <Box sx={{ flex: 1, display: 'flex', justifyContent: 'flex-start', pt: '68px' }}>
          <Button
            variant="contained"
            onClick={() => navigate("/common-failures")}
            sx={{
              textTransform: "none",
              fontSize: 13,
              fontWeight: 600,
              borderRadius: 2,
              px: 2.5,
              py: 0.9,
              backgroundColor: "#1e293b",
              color: "#f1f5f9",
              boxShadow: "none",
              "&:hover": {
                backgroundColor: "#334155",
                boxShadow: "0 2px 8px rgba(0,0,0,0.18)",
              },
            }}
          >
            Common Failures
          </Button>
        </Box>

        {/* Center: title + live status + env toggle */}
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 2 }}>
          <Typography variant="h3" fontWeight="bold">
            Automation Dashboard
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
            <Box sx={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              backgroundColor: error ? 'error.main' : loading ? 'text.disabled' : 'success.main',
              ...((!error && !loading) && {
                animation: 'livePulse 2s ease-in-out infinite',
                '@keyframes livePulse': {
                  '0%, 100%': { boxShadow: '0 0 0 0 rgba(46, 125, 50, 0.5)' },
                  '50%': { boxShadow: '0 0 0 6px rgba(46, 125, 50, 0)' },
                },
              }),
            }} />
            <Typography variant="subtitle1" color="text.secondary">
              Live test results
            </Typography>
          </Box>
          <EnvToggle value={env} onChange={handleEnvChange} />
        </Box>

        {/* Right spacer — mirrors the left column width so center stays centered */}
        <Box sx={{ flex: 1 }} />

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
        <>
          {(() => {
            const favoriteCards = cards.filter(c => isFavorite(c.id));
            const otherCards = cards.filter(c => !isFavorite(c.id));
            return (
              <>
                {favoriteCards.length > 0 && (
                  <>
                    <Typography variant="h6" sx={{ mb: 2 }}>
                      ⭐ My Areas
                    </Typography>
                    <Grid container spacing={3}>
                      {favoriteCards.map((c) => (
                        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3, xl: 3 }} key={c.id}>
                          <AreaCard
                            areaName={c.id}
                            displayName={c.name}
                            passRate={c.passRate}
                            total={c.total}
                            passed={c.passed}
                            failed={c.failed}
                            env={env}
                            health={c.health}
                            isFavorite={true}
                            onToggleFavorite={() => toggleFavorite(c.id)}
                            trendData={c.trendData}
                          />
                        </Grid>
                      ))}
                    </Grid>
                    <Divider sx={{ my: 3 }} />
                  </>
                )}
                {favoriteCards.length > 0 && (
                  <Typography variant="h6" sx={{ mb: 2 }}>
                    All Areas
                  </Typography>
                )}
                <Grid container spacing={3}>
                  {otherCards.map((c) => (
                    <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3, xl: 3 }} key={c.id}>
                      <AreaCard
                        areaName={c.id}
                        displayName={c.name}
                        passRate={c.passRate}
                        total={c.total}
                        passed={c.passed}
                        failed={c.failed}
                        env={env}
                        health={c.health}
                        isFavorite={false}
                        onToggleFavorite={() => toggleFavorite(c.id)}
                        trendData={c.trendData}
                      />
                    </Grid>
                  ))}
                </Grid>
              </>
            );
          })()}
        </>
      )}
    </Container>
  );
};

export default DashboardPage;