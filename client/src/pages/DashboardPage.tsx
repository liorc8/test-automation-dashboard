import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Container,
  Typography,
  Box,
  Alert,
  CircularProgress,
  Divider,
  Button,
  Paper,
  TextField,
  InputAdornment,
  List,
  ListItemButton,
  ListItemText,
  Chip,
  Skeleton,
} from "@mui/material";
import Grid from "@mui/material/Grid";
import SearchIcon from "@mui/icons-material/Search";

import AreaCard from "../components/AreaCard";
import EnvToggle from "../components/EnvToggle";
import { useFavorites } from "../hooks/useFavorites";
import {
  getAreas,
  getAreasDashboard,
  getAllAreasDailyTrends,
  searchTests,
  type EnvFilter,
  type DailyTrendPoint,
} from "../services/apiService";
import type { AreaItem } from "../types/Area";
import type { AreasDashboardResponse, HealthBuckets } from "../types/Dashboard";
import type { TestSearchResult } from "../types/TestSearch";

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
  const [testQuery, setTestQuery] = useState("");
  const [testResults, setTestResults] = useState<TestSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");

  const handleEnvChange = (e: EnvFilter) => {
    setEnv(e);
    localStorage.setItem("selectedEnv", e);
  };

  const openTestHistory = (area: string, testName: string) => {
    navigate(`/area/${encodeURIComponent(area)}/test/${encodeURIComponent(testName)}/history?env=${env}`);
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

  useEffect(() => {
    const query = testQuery.trim();
    if (query.length < 2) {
      setTestResults([]);
      setSearchLoading(false);
      setSearchError("");
      return;
    }

    const timeout = window.setTimeout(async () => {
      try {
        setSearchLoading(true);
        setSearchError("");
        const results = await searchTests(query, env, 8);
        setTestResults(results);
      } catch (e) {
        setSearchError(e instanceof Error ? e.message : "Failed to search tests");
      } finally {
        setSearchLoading(false);
      }
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [testQuery, env]);

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

      <Paper
        variant="outlined"
        sx={{
          mb: 4,
          borderRadius: 3,
          overflow: "hidden",
          background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
        }}
      >
        <Box sx={{ p: 2.5, display: "flex", flexDirection: "column", gap: 1.75 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
            <Box sx={{ width: 42, height: 42, borderRadius: 2, display: "grid", placeItems: "center", bgcolor: "#eff6ff", color: "#1d4ed8" }}>
              <SearchIcon />
            </Box>
            <Box sx={{ flex: 1 }}>
              <TextField
                size="small"
                fullWidth
                value={testQuery}
                onChange={(e) => setTestQuery(e.target.value)}
                placeholder="Search tests across all areas…"
                sx={{
                  maxWidth: 420,
                  "& .MuiOutlinedInput-root": {
                    bgcolor: "#f8fafc",
                    borderRadius: 2,
                    "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "#cbd5e1" },
                    "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: "#3b82f6" },
                  },
                  "& .MuiOutlinedInput-input::placeholder": { opacity: 0.6 },
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ fontSize: 18, color: "#94a3b8" }} />
                    </InputAdornment>
                  ),
                }}
              />
            </Box>
          </Box>

          {testQuery.trim().length >= 2 && (
            <Box>
              {searchLoading && (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} variant="rounded" height={54} />
                  ))}
                </Box>
              )}

              {!searchLoading && searchError && <Alert severity="error">{searchError}</Alert>}

              {!searchLoading && !searchError && testResults.length === 0 && (
                <Alert severity="info">No matching tests found.</Alert>
              )}

              {!searchLoading && !searchError && testResults.length > 0 && (
                <List disablePadding sx={{ border: "1px solid #e2e8f0", borderRadius: 2.5, overflow: "hidden", bgcolor: "#fff" }}>
                  {testResults.map((result) => (
                    <ListItemButton
                      key={`${result.area}-${result.testName}`}
                      onClick={() => openTestHistory(result.area, result.testName)}
                      sx={{ py: 1.35, px: 2, borderBottom: "1px solid #f1f5f9", "&:last-child": { borderBottom: 0 } }}
                    >
                      <ListItemText
                        primary={result.testName}
                        primaryTypographyProps={{
                          sx: { fontFamily: "'JetBrains Mono', 'Fira Code', monospace", fontSize: 13.5, fontWeight: 700, color: "#0f172a" },
                        }}
                      />
                      <Chip label={result.area} size="small" variant="outlined" sx={{ borderColor: "#cbd5e1", color: "#475569", fontWeight: 700, ml: 1 }} />
                    </ListItemButton>
                  ))}
                </List>
              )}
            </Box>
          )}
        </Box>
      </Paper>

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