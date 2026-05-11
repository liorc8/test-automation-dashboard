import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import {
  Box, Typography, Button, TextField, Paper,
  Table, TableHead, TableBody, TableRow, TableCell,
  TableContainer, LinearProgress, Alert, Skeleton,
  InputAdornment,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import SearchIcon from "@mui/icons-material/Search";
import HistoryIcon from "@mui/icons-material/History";
import { getAreaHealthTests, type HealthBucket, type HealthTestItem } from "../services/apiService";

const BUCKET_COLOR: Record<HealthBucket, string> = {
  healthy: "#2e7d32",
  medium: "#ed6c02",
  bad: "#c62828",
  dead: "#757575",
};

const BUCKET_BG: Record<HealthBucket, string> = {
  healthy: "#f0fdf4",
  medium: "#fff7ed",
  bad: "#fef2f2",
  dead: "#f5f5f5",
};

const BUCKET_BORDER: Record<HealthBucket, string> = {
  healthy: "#bbf7d0",
  medium: "#fed7aa",
  bad: "#fecaca",
  dead: "#e0e0e0",
};

const isValidBucket = (b: string | undefined): b is HealthBucket =>
  b === "healthy" || b === "medium" || b === "bad" || b === "dead";

function buildTestHistoryPath(areaName: string, testName: string, env: string): string {
  return `/area/${encodeURIComponent(areaName)}/test/${encodeURIComponent(testName)}/history?env=${env}`;
}

const AreaHealthPage: React.FC = () => {
  const { areaName, bucket } = useParams<{ areaName: string; bucket: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const env = (searchParams.get("env") ?? "qa") as "qa" | "release" | "sandbox";

  const [tests, setTests] = useState<HealthTestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!areaName || !isValidBucket(bucket)) return;
    const load = async () => {
      try {
        setLoading(true);
        setError("");
        const result = await getAreaHealthTests(areaName, bucket, env);
        setTests(result.tests);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load tests");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [areaName, bucket, env]);

  if (!isValidBucket(bucket)) {
    return (
      <Box sx={{ p: 5 }}>
        <Alert severity="error">Invalid bucket: {bucket}</Alert>
      </Box>
    );
  }

  const color = BUCKET_COLOR[bucket];
  const bg = BUCKET_BG[bucket];
  const border = BUCKET_BORDER[bucket];
  const label = bucket.charAt(0).toUpperCase() + bucket.slice(1);
  const openTestHistory = (testName: string) => navigate(buildTestHistoryPath(areaName ?? "", testName, env));
  const filtered = search.trim()
    ? tests.filter(t => t.testName.toLowerCase().includes(search.toLowerCase()))
    : tests;

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#f8fafc" }}>

      {/* ── Sticky header ── */}
      <Box component="header" sx={{
        bgcolor: "#fff", borderBottom: "1px solid #e5e7eb",
        px: 4, py: 1.75,
        display: "flex", alignItems: "center", gap: 2,
        position: "sticky", top: 0, zIndex: 100,
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
      }}>
        <Button
          variant="outlined"
          size="small"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate("/")}
          sx={{ borderColor: "#e2e8f0", color: "#64748b", textTransform: "none", "&:hover": { borderColor: "#cbd5e1" } }}
        >
          Dashboard
        </Button>

        <Box sx={{ flex: 1 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
            <Typography sx={{ fontFamily: "'JetBrains Mono', 'Fira Code', monospace", fontSize: 18, fontWeight: 800, color: "#1e293b" }}>
              {areaName}
            </Typography>
            <Box component="span" sx={{ bgcolor: bg, border: `1px solid ${border}`, color, borderRadius: 20, px: 1.5, py: "2px", fontSize: 12, fontWeight: 700 }}>
              {label}
            </Box>
          </Box>
          <Typography variant="caption" sx={{ color: "#94a3b8" }}>
            Test health · {env.toUpperCase()}
          </Typography>
        </Box>

        {!loading && !error && (
          <Box sx={{ bgcolor: bg, border: `1px solid ${border}`, borderRadius: 2.5, px: 2.25, py: 0.75, textAlign: "center" }}>
            <Typography sx={{ fontSize: 20, fontWeight: 800, color }}>{tests.length}</Typography>
            <Typography sx={{ fontSize: 11, color }}>{label.toLowerCase()} tests</Typography>
          </Box>
        )}
      </Box>

      {/* ── Content ── */}
      <Box sx={{ p: "24px 40px" }}>

        {/* Loading */}
        {loading && (
          <Paper variant="outlined" sx={{ borderRadius: 3, overflow: "hidden" }}>
            {Array.from({ length: 8 }).map((_, i) => (
              <Box key={i} sx={{ px: 2.5, py: 1.5, borderBottom: i < 7 ? "1px solid #f3f4f6" : "none" }}>
                <Skeleton variant="text" height={32} />
              </Box>
            ))}
          </Paper>
        )}

        {/* Error */}
        {!loading && error && <Alert severity="error">{error}</Alert>}

        {/* Content */}
        {!loading && !error && (
          <>
            {/* Search bar */}
            <Box sx={{ display: "flex", gap: 1.5, mb: 2.5, alignItems: "center" }}>
              <TextField
                size="small"
                placeholder="Search by test name…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" sx={{ color: "text.disabled" }} />
                    </InputAdornment>
                  ),
                }}
                sx={{ maxWidth: 480, flex: 1, "& .MuiOutlinedInput-root": { bgcolor: "#fff" } }}
              />
              <Typography variant="body2" sx={{ color: "#94a3b8" }}>{filtered.length} results</Typography>
            </Box>

            {/* Table */}
            <TableContainer
              component={Paper}
              variant="outlined"
              sx={{ borderRadius: 3, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
            >
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: "#f8fafc" }}>
                    {["Test Name", "Pass Rate", "Successes", "Failures", "Last Run", "History"].map((h, i) => (
                      <TableCell
                        key={h}
                        align={i === 0 ? "left" : "center"}
                        sx={{ fontWeight: 700, fontSize: 11, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em" }}
                      >
                        {h}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 5, color: "#94a3b8" }}>
                        No tests found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map(t => (
                      <TableRow
                        key={t.testName}
                        sx={{ "&:hover": { bgcolor: "#f8fafc" }, "&:last-child td": { borderBottom: 0 } }}
                      >
                        <TableCell sx={{ fontFamily: "'JetBrains Mono', 'Fira Code', monospace", fontSize: 13, color: "#1e293b", wordBreak: "break-all" }}>
                          {t.testName}
                        </TableCell>
                        <TableCell align="center">
                          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0.5 }}>
                            <Typography sx={{ fontWeight: 700, color, fontSize: 14 }}>{t.passRate}%</Typography>
                            <LinearProgress
                              variant="determinate"
                              value={t.passRate}
                              sx={{
                                width: 80, height: 4, borderRadius: 1,
                                bgcolor: "#e5e7eb",
                                "& .MuiLinearProgress-bar": { bgcolor: color, borderRadius: 1 },
                              }}
                            />
                          </Box>
                        </TableCell>
                        <TableCell align="center" sx={{ color: "#2e7d32", fontWeight: 600, fontSize: 13 }}>
                          {t.successes}
                        </TableCell>
                        <TableCell align="center" sx={{ color: "#c62828", fontWeight: 600, fontSize: 13 }}>
                          {t.fails}
                        </TableCell>
                        <TableCell align="center" sx={{ fontSize: 12, color: "#94a3b8" }}>
                          {t.lastRunDate}
                        </TableCell>
                        <TableCell align="center">
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<HistoryIcon sx={{ fontSize: 14 }} />}
                            onClick={() => openTestHistory(t.testName)}
                            sx={{
                              borderColor: "#e2e8f0",
                              color: "#475569",
                              textTransform: "none",
                              fontSize: 11,
                              px: 1.25,
                              py: 0.5,
                              "&:hover": { borderColor: "#cbd5e1", bgcolor: "#f8fafc", color: "#0f172a" },
                            }}
                          >
                            History
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        )}
      </Box>
    </Box>
  );
};

export default AreaHealthPage;
