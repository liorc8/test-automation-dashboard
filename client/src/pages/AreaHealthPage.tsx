import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import {
  Box, Typography, Button, Paper,
  Table, TableHead, TableBody, TableRow, TableCell,
  TableContainer, LinearProgress, Alert, Skeleton, Collapse, CircularProgress,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import HistoryIcon from "@mui/icons-material/History";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import SearchInput from "../components/SearchInput";
import FailureCard, { latestFailedToGroupedItem } from "../components/FailureCard";
import ImageModal from "../components/ImageModal";
import LogModal from "../components/LogModal";
import ThemeToggle from "../components/ThemeToggle";
import { useTestRailIds } from "../hooks/useTestRailIds";
import {
  getAreaHealthTests, getAreaLatestFailedTests,
  type HealthBucket, type HealthTestItem, type EnvFilter,
} from "../services/apiService";
import type { LatestFailedTestItem, LatestFailedTestsResponse } from "../types/LatestFailed";

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

const COLUMNS = ["Test Name", "Pass Rate", "Successes", "Failures", "Last Success", "Last Failure", "History"];

const isValidBucket = (b: string | undefined): b is HealthBucket =>
  b === "healthy" || b === "medium" || b === "bad" || b === "dead";

function buildTestHistoryPath(areaName: string, testName: string, env: string): string {
  return `/area/${encodeURIComponent(areaName)}/test/${encodeURIComponent(testName)}/history?env=${env}`;
}

const AreaHealthPage: React.FC = () => {
  const { areaName, bucket } = useParams<{ areaName: string; bucket: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const env = (searchParams.get("env") ?? "qa") as EnvFilter;

  const [tests, setTests] = useState<HealthTestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  // Row expansion + lazy-loaded failure details for the open row.
  const [openTestName, setOpenTestName] = useState<string | null>(null);
  const [latestData, setLatestData] = useState<LatestFailedTestsResponse | null>(null);
  const [latestLoading, setLatestLoading] = useState(false);

  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [logModal, setLogModal] = useState<{ lines: string[]; testName: string; label: string } | null>(null);

  const { urlFor: testRailUrlFor } = useTestRailIds(areaName, env);

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

  // Reset expansion + cached failure details when the area/bucket/env changes.
  useEffect(() => {
    setOpenTestName(null);
    setLatestData(null);
  }, [areaName, bucket, env]);

  const handleRowClick = async (testName: string) => {
    if (openTestName === testName) {
      setOpenTestName(null);
      return;
    }
    setOpenTestName(testName);
    if (!latestData && areaName && !latestLoading) {
      try {
        setLatestLoading(true);
        const d = await getAreaLatestFailedTests(areaName, env);
        setLatestData(d);
      } catch {
        setLatestData({ area: areaName ?? "", env, totalCount: 0, servers: [] });
      } finally {
        setLatestLoading(false);
      }
    }
  };

  const findLatestFailure = (testName: string): LatestFailedTestItem | null => {
    if (!latestData) return null;
    const key = testName.toLowerCase();
    for (const sg of latestData.servers) {
      const match = sg.tests.find(t => t.testName.toLowerCase() === key);
      if (match) return match;
    }
    return null;
  };

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
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      {imageSrc && <ImageModal src={imageSrc} onClose={() => setImageSrc(null)} />}
      {logModal && (
        <LogModal lines={logModal.lines} testName={logModal.testName} reasonLabel={logModal.label}
          onClose={() => setLogModal(null)} />
      )}

      {/* ── Sticky header ── */}
      <Box component="header" sx={{
        bgcolor: "background.paper", borderBottom: 1, borderColor: "divider",
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
          sx={{ borderColor: "#e2e8f0", color: "text.secondary", textTransform: "none", "&:hover": { borderColor: "#cbd5e1" } }}
        >
          Dashboard
        </Button>

        <Box sx={{ flex: 1 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
            <Typography sx={{ fontFamily: "'JetBrains Mono', 'Fira Code', monospace", fontSize: 18, fontWeight: 800, color: "text.primary" }}>
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
        <ThemeToggle />
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
              <SearchInput
                value={search}
                onChange={setSearch}
                sx={{ maxWidth: 480, flex: 1 }}
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
                  <TableRow sx={{ bgcolor: "background.default" }}>
                    {COLUMNS.map((h, i) => (
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
                      <TableCell colSpan={COLUMNS.length} align="center" sx={{ py: 5, color: "#94a3b8" }}>
                        No tests found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map(t => {
                      const isOpen = openTestName === t.testName;
                      const failure = isOpen ? findLatestFailure(t.testName) : null;
                      return (
                        <React.Fragment key={t.testName}>
                          <TableRow
                            onClick={() => handleRowClick(t.testName)}
                            sx={{
                              cursor: "pointer",
                              bgcolor: isOpen ? "action.hover" : "transparent",
                              "&:hover": { bgcolor: "action.hover" },
                              "& td": { borderBottom: isOpen ? "none" : undefined },
                            }}
                          >
                            <TableCell sx={{ fontFamily: "'JetBrains Mono', 'Fira Code', monospace", fontSize: 13, color: "text.primary", wordBreak: "break-all" }}>
                              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                <KeyboardArrowDownIcon sx={{
                                  fontSize: 18, color: isOpen ? "#475569" : "#cbd5e1", flexShrink: 0,
                                  transition: "transform 0.22s ease",
                                  transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                                }} />
                                {t.testName}
                              </Box>
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
                            <TableCell align="center" sx={{ fontSize: 12, color: "text.secondary" }}>
                              {t.lastSuccess || "—"}
                            </TableCell>
                            <TableCell align="center" sx={{ fontSize: 12, color: "text.secondary" }}>
                              {t.lastFailure || "—"}
                            </TableCell>
                            <TableCell align="center">
                              <Button
                                size="small"
                                variant="outlined"
                                startIcon={<HistoryIcon sx={{ fontSize: 14 }} />}
                                onClick={(e) => { e.stopPropagation(); openTestHistory(t.testName); }}
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
                          <TableRow>
                            <TableCell colSpan={COLUMNS.length} sx={{ p: 0, borderBottom: isOpen ? "1px solid #e2e8f0" : "none" }}>
                              <Collapse in={isOpen} unmountOnExit>
                                <Box sx={{ p: 2, bgcolor: "background.default" }}>
                                  {latestLoading && (
                                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, py: 2 }}>
                                      <CircularProgress size={18} />
                                      <Typography variant="body2" sx={{ color: "text.secondary" }}>Loading failure details…</Typography>
                                    </Box>
                                  )}
                                  {!latestLoading && failure && (
                                    <FailureCard
                                      item={latestFailedToGroupedItem(failure)}
                                      index={0}
                                      onImageClick={setImageSrc}
                                      onExpandLog={(lines, testName, lbl) => setLogModal({ lines, testName, label: lbl })}
                                      onOpenHistory={() => openTestHistory(t.testName)}
                                      testRailUrl={testRailUrlFor(t.testName)}
                                    />
                                  )}
                                  {!latestLoading && !failure && (
                                    <Alert severity="info" sx={{ m: 0 }}>
                                      No current failure details available for this test.
                                    </Alert>
                                  )}
                                </Box>
                              </Collapse>
                            </TableCell>
                          </TableRow>
                        </React.Fragment>
                      );
                    })
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
