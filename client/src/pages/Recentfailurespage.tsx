import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import {
  Box, Typography, Button, Select, MenuItem,
  Collapse, ToggleButtonGroup, ToggleButton, Paper, Skeleton, Alert,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import HistoryIcon from "@mui/icons-material/History";
import SearchInput from "../components/SearchInput";
import FailureCard, { latestFailedToGroupedItem } from "../components/FailureCard";
import ImageModal from "../components/ImageModal";
import LogModal from "../components/LogModal";
import { WINDOW_DAYS } from "../components/failureHelpers";
import { getAreaRecentFailuresGrouped, getAreaLatestFailedTests } from "../services/apiService";
import type { EnvFilter } from "../services/apiService";
import type { AreaRecentFailuresGroupedResponse } from "../types/RecentFailuresGrouped";
import type { LatestFailedTestsResponse } from "../types/LatestFailed";

const LIMIT = 200;

function buildTestHistoryPath(areaName: string, testName: string, env: EnvFilter): string {
  return `/area/${encodeURIComponent(areaName)}/test/${encodeURIComponent(testName)}/history?env=${env}`;
}

// ─── Latest Failed View ───────────────────────────────────────────────────────

interface LatestFailedViewProps {
  data: LatestFailedTestsResponse;
  search: string;
  onImageClick: (src: string) => void;
  onExpandLog: (lines: string[], testName: string, label: string) => void;
  onOpenHistory: (testName: string) => void;
}

const LatestFailedView: React.FC<LatestFailedViewProps> = ({ data, search, onImageClick, onExpandLog, onOpenHistory }) => {
  const [openTestName, setOpenTestName] = useState<string | null>(null);

  const handleRowClick = (testName: string) => {
    setOpenTestName(prev => (prev === testName ? null : testName));
  };

  const q = search.trim().toLowerCase();
  const filteredServers = q
    ? data.servers
      .map(sg => ({
        ...sg,
        tests: sg.tests.filter(t =>
          t.testName.toLowerCase().includes(q) || t.server.toLowerCase().includes(q)
        ),
      }))
      .filter(sg => sg.tests.length > 0)
    : data.servers;

  if (data.servers.length === 0) {
    return <Alert severity="success">No tests whose latest result is a failure.</Alert>;
  }

  if (filteredServers.length === 0) {
    return (
      <Alert severity="info">
        No tests match <strong>"{search}"</strong>
      </Alert>
    );
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3.5 }}>
      {filteredServers.map((serverGroup) => (
        <Box key={serverGroup.server}>
          {/* Server header */}
          <Box sx={{
            display: "flex", alignItems: "center", gap: 1.5,
            px: 2.25, py: 1.5,
            bgcolor: "#1e293b",
            borderRadius: "8px 8px 0 0",
            borderBottom: "3px solid #ef4444",
          }}>
            <Typography sx={{ fontSize: 18, lineHeight: 1 }}>🖥️</Typography>
            <Typography sx={{ fontFamily: "'JetBrains Mono', 'Fira Code', monospace", fontSize: 15, fontWeight: 800, color: "#f1f5f9", letterSpacing: "0.05em" }}>
              {serverGroup.server}
            </Typography>
            <Box component="span" sx={{ ml: "auto", bgcolor: "#ef4444", color: "#fff", borderRadius: 20, px: 1.5, py: "3px", fontSize: 12, fontWeight: 700 }}>
              {serverGroup.tests.length} {serverGroup.tests.length === 1 ? "test" : "tests"}
            </Box>
          </Box>

          {/* Test list */}
          <Paper variant="outlined" sx={{ borderTop: "none", borderRadius: "0 0 8px 8px", overflow: "hidden" }}>
            {serverGroup.tests.map((test, idx) => {
              const isOpen = openTestName === test.testName;
              const isLast = idx === serverGroup.tests.length - 1;

              return (
                <Box key={test.testName}>
                  <Box
                    onClick={() => handleRowClick(test.testName)}
                    sx={{
                      display: "flex", alignItems: "center", gap: 1.25,
                      px: 2, py: 1.375,
                      borderBottom: (!isLast || isOpen) ? "1px solid #f1f5f9" : "none",
                      cursor: "pointer",
                      bgcolor: isOpen ? "#fef2f2" : "transparent",
                      transition: "background 0.15s",
                      userSelect: "none",
                      "&:hover": { bgcolor: isOpen ? "#fef2f2" : "#f8fafc" },
                    }}
                  >
                    <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "#ef4444", flexShrink: 0 }} />
                    <Typography sx={{ fontFamily: "'JetBrains Mono', 'Fira Code', monospace", fontSize: 13, color: "#0f172a", flex: 1, minWidth: 0, wordBreak: "break-all" }}>
                      {test.testName}
                    </Typography>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<HistoryIcon sx={{ fontSize: "13px !important" }} />}
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenHistory(test.testName);
                      }}
                      sx={{
                        borderColor: "#cbd5e1",
                        color: "#475569",
                        textTransform: "none",
                        fontSize: 11,
                        py: "3px",
                        px: "10px",
                        minHeight: 0,
                        lineHeight: 1.4,
                        "&:hover": { borderColor: "#94a3b8", bgcolor: "#fff", color: "#0f172a" },
                      }}
                    >
                      History
                    </Button>
                    <KeyboardArrowDownIcon sx={{
                      fontSize: 18, color: isOpen ? "#dc2626" : "#94a3b8", flexShrink: 0,
                      transition: "transform 0.22s ease",
                      transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                    }} />
                  </Box>

                  <Collapse in={isOpen} unmountOnExit>
                    <Box sx={{
                      p: "16px 16px 20px",
                      bgcolor: "#f8fafc",
                      borderBottom: !isLast ? "1px solid #e2e8f0" : "none",
                    }}>
                      <FailureCard
                        item={latestFailedToGroupedItem(test)}
                        index={0}
                        onImageClick={onImageClick}
                        onExpandLog={onExpandLog}
                        onOpenHistory={() => onOpenHistory(test.testName)}
                      />
                    </Box>
                  </Collapse>
                </Box>
              );
            })}
          </Paper>
        </Box>
      ))}
    </Box>
  );
};

// ─── Main page ────────────────────────────────────────────────────────────────

const RecentFailuresPage: React.FC = () => {
  const { areaName } = useParams<{ areaName: string }>();
  const [searchParams] = useSearchParams();
  const env = (searchParams.get("env") ?? "qa") as EnvFilter;
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState(0);

  const [data, setData] = useState<AreaRecentFailuresGroupedResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"failCount" | "lastFailedOn">("failCount");

  const [latestData, setLatestData] = useState<LatestFailedTestsResponse | null>(null);
  const [latestLoading, setLatestLoading] = useState(false);
  const [latestError, setLatestError] = useState("");
  const [latestFetched, setLatestFetched] = useState(false);

  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [logModal, setLogModal] = useState<{ lines: string[]; testName: string; label: string } | null>(null);

  const openTestHistory = (testName: string) => {
    if (!areaName) return;
    sessionStorage.setItem('recentFailuresTab', 'from-recent-failures');
    sessionStorage.setItem('recentFailuresViewTab', String(activeTab));
    navigate(buildTestHistoryPath(areaName, testName, env));
  };

  // Restore tab state from URL query parameter
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === '0' || tabParam === '1') {
      setActiveTab(Number(tabParam) as 0 | 1);
    }
  }, []);

  useEffect(() => {
    if (!areaName) return;
    setLoading(true);
    setError("");
    getAreaRecentFailuresGrouped(areaName, WINDOW_DAYS, LIMIT, env)
      .then(setData)
      .catch(e => setError(e instanceof Error ? e.message : "Failed to load failures"))
      .finally(() => setLoading(false));
  }, [areaName, env]);

  useEffect(() => {
    setLatestFetched(false);
    setLatestData(null);
    setLatestError("");
  }, [areaName, env]);

  useEffect(() => {
    if (activeTab !== 1 || latestFetched || !areaName) return;
    setLatestLoading(true);
    setLatestError("");
    getAreaLatestFailedTests(areaName, env)
      .then(d => { setLatestData(d); setLatestFetched(true); })
      .catch(e => setLatestError(e instanceof Error ? e.message : "Failed to load latest failed tests"))
      .finally(() => setLatestLoading(false));
  }, [activeTab, latestFetched, areaName, env]);

  const items = useCallback(() => {
    if (!data) return [];
    let list = [...data.items];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(i => i.testName.toLowerCase().includes(q));
    }
    list.sort((a, b) =>
      sortBy === "failCount"
        ? b.failCount - a.failCount
        : (b.lastFailedOn ?? "").localeCompare(a.lastFailedOn ?? "")
    );
    return list;
  }, [data, search, sortBy])();

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#f8fafc" }}>
      {imageSrc && <ImageModal src={imageSrc} onClose={() => setImageSrc(null)} />}
      {logModal && (
        <LogModal lines={logModal.lines} testName={logModal.testName} reasonLabel={logModal.label}
          onClose={() => setLogModal(null)} />
      )}

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
          <Typography sx={{ fontSize: 26, fontWeight: 900, color: "#0f172a", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "-0.02em", lineHeight: 1.15 }}>
            Recent Failures
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: "3px" }}>
            <Typography sx={{ fontSize: 13, fontWeight: 700, color: "#475569", fontFamily: "'JetBrains Mono', monospace" }}>
              {areaName}
            </Typography>
            <Typography sx={{ fontSize: 11, color: "#cbd5e1" }}>·</Typography>
            <Typography variant="caption" sx={{ color: "#94a3b8" }}>
              {activeTab === 0 ? `last ${WINDOW_DAYS} days · ${env.toUpperCase()}` : `latest status · ${env.toUpperCase()}`}
            </Typography>
          </Box>
        </Box>

        {activeTab === 0 && data && (
          <Box sx={{ bgcolor: "#fef2f2", border: "1px solid #fecaca", borderRadius: 2.5, px: 2.25, py: 0.75, textAlign: "center" }}>
            <Typography sx={{ fontSize: 20, fontWeight: 800, color: "#dc2626" }}>{data.items.length}</Typography>
            <Typography sx={{ fontSize: 11, color: "#ef4444" }}>failed tests</Typography>
          </Box>
        )}
        {activeTab === 1 && latestData && (
          <Box sx={{ bgcolor: "#fef2f2", border: "1px solid #fecaca", borderRadius: 2.5, px: 2.25, py: 0.75, textAlign: "center" }}>
            <Typography sx={{ fontSize: 20, fontWeight: 800, color: "#dc2626" }}>{latestData.totalCount}</Typography>
            <Typography sx={{ fontSize: 11, color: "#ef4444" }}>broken now</Typography>
          </Box>
        )}
      </Box>

      {/* ── View toggle + search toolbar ── */}
      <Box sx={{
        bgcolor: "#fff", borderBottom: "1px solid #e5e7eb",
        px: 4, py: 1.5,
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <ToggleButtonGroup
          value={activeTab}
          exclusive
          onChange={(_, v) => { if (v !== null) setActiveTab(v); }}
          size="small"
          sx={{
            bgcolor: "#e2e8f0", borderRadius: 2.5, p: "4px", gap: "2px",
            "& .MuiToggleButton-root": {
              border: "none", borderRadius: 2, px: 3.25, py: 1.125,
              fontSize: 14, textTransform: "none", color: "#64748b",
              "&.Mui-selected": {
                bgcolor: "#fff", color: "#dc2626", fontWeight: 700,
                boxShadow: "0 2px 10px rgba(0,0,0,0.10)",
                "&:hover": { bgcolor: "#fff" },
              },
              "&:hover": { bgcolor: "transparent" },
            },
          }}
        >
          <ToggleButton value={0}>Full View</ToggleButton>
          <ToggleButton value={1}>List View</ToggleButton>
        </ToggleButtonGroup>

        <SearchInput
          value={search}
          onChange={setSearch}
          sx={{ width: 280, "& .MuiOutlinedInput-root": { bgcolor: "#f8fafc" } }}
        />
      </Box>

      {/* ── Content ── */}
      <Box sx={{ p: "24px 40px" }}>

        {/* Tab 0: All Recent Failures */}
        {activeTab === 0 && (
          <>
            {loading && (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {[1, 2, 3].map(i => <Skeleton key={i} variant="rounded" height={220} />)}
              </Box>
            )}
            {!loading && error && <Alert severity="error">{error}</Alert>}
            {!loading && !error && data?.items.length === 0 && (
              <Alert severity="success">🎉 No failures found in the last {WINDOW_DAYS} days!</Alert>
            )}
            {!loading && !error && data && data.items.length > 0 && (
              <>
                <Box sx={{ display: "flex", gap: 1.5, mb: 2.5, flexWrap: "wrap", alignItems: "center" }}>
                  <Select
                    size="small"
                    value={sortBy}
                    onChange={e => setSortBy(e.target.value as typeof sortBy)}
                    sx={{ fontSize: 13, minWidth: 190 }}
                  >
                    <MenuItem value="failCount">Sort: failure count</MenuItem>
                    <MenuItem value="lastFailedOn">Sort: last failed</MenuItem>
                  </Select>
                  <Typography variant="body2" sx={{ color: "#94a3b8" }}>{items.length} results</Typography>
                </Box>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1.75 }}>
                  {items.map((item, i) => (
                    <FailureCard
                      key={item.testName}
                      item={item}
                      index={i}
                      onImageClick={setImageSrc}
                      onExpandLog={(lines, testName, label) => setLogModal({ lines, testName, label })}
                      onOpenHistory={() => openTestHistory(item.testName)}
                    />
                  ))}
                </Box>
              </>
            )}
          </>
        )}

        {/* Tab 1: Currently Broken Tests */}
        {activeTab === 1 && (
          <>
            {latestLoading && (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {[1, 2, 3].map(i => <Skeleton key={i} variant="rounded" height={180} />)}
              </Box>
            )}
            {!latestLoading && latestError && <Alert severity="error">{latestError}</Alert>}
            {!latestLoading && !latestError && latestData && (
              <LatestFailedView
                data={latestData}
                search={search}
                onImageClick={setImageSrc}
                onExpandLog={(lines, testName, label) => setLogModal({ lines, testName, label })}
                onOpenHistory={openTestHistory}
              />
            )}
          </>
        )}
      </Box>
    </Box>
  );
};

export default RecentFailuresPage;
