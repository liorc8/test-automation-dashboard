import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import {
  Box, Typography, Button, TextField, Select, MenuItem,
  InputAdornment, Card, CardContent, Chip, Collapse,
  Dialog, DialogTitle, DialogContent, DialogActions,
  ToggleButtonGroup, ToggleButton, Paper, Skeleton, Alert,
  IconButton,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import SearchIcon from "@mui/icons-material/Search";
import CloseIcon from "@mui/icons-material/Close";
import TerminalIcon from "@mui/icons-material/Terminal";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import BrokenImageIcon from "@mui/icons-material/BrokenImage";
import ZoomInIcon from "@mui/icons-material/ZoomIn";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import HistoryIcon from "@mui/icons-material/History";
import { getAreaRecentFailuresGrouped, getAreaLatestFailedTests } from "../services/apiService";
import type { EnvFilter } from "../services/apiService";
import type {
  AreaRecentFailuresGroupedResponse,
  RecentFailureGroupedItem,
  ReasonEntry,
} from "../types/RecentFailuresGrouped";
import type { LatestFailedTestsResponse, LatestFailedTestItem } from "../types/LatestFailed";

const WINDOW_DAYS = 10;
const LIMIT = 200;

// ─── Log utilities ────────────────────────────────────────────────────────────

function renderLogLines(lines: string[]) {
  return lines.map((line, i) => {
    const isFatal = line.toUpperCase().includes("FATAL");
    return (
      <div
        key={i}
        style={{
          display: "block",
          background: isFatal ? "rgba(239,68,68,0.15)" : "transparent",
          color: isFatal ? "#fca5a5" : "#cbd5e1",
          fontWeight: isFatal ? 700 : "normal",
          borderLeft: isFatal ? "3px solid #ef4444" : "3px solid transparent",
          padding: "1px 8px",
          lineHeight: 1.55,
        }}
      >
        {line || "\u00A0"}
      </div>
    );
  });
}

function truncateLogToTestScope(logText: string, testName: string): string[] {
  const lines = logText.split(/\r?\n/).filter(l => l.trim() !== "");
  let fatalIdx = -1;
  for (let i = lines.length - 1; i >= 0; i--) {
    if (lines[i].toUpperCase().includes("FATAL")) { fatalIdx = i; break; }
  }
  if (fatalIdx === -1) return lines.slice(Math.max(0, lines.length - 40));
  const nameLower = testName.toLowerCase();
  let startIdx = Math.max(0, fatalIdx - 60);
  for (let i = fatalIdx - 1; i >= Math.max(0, fatalIdx - 60); i--) {
    if (lines[i].toLowerCase().includes(nameLower)) { startIdx = i; break; }
  }
  return lines.slice(startIdx, fatalIdx + 1);
}

function dateOnly(value: string | null | undefined): string | null {
  if (!value) return null;
  return value.split("T")[0].split(" ")[0];
}

function buildTestHistoryPath(areaName: string, testName: string, env: EnvFilter): string {
  return `/area/${encodeURIComponent(areaName)}/test/${encodeURIComponent(testName)}/history?env=${env}`;
}

function severityColor(count: number): string {
  if (count >= 10) return "#dc2626";
  if (count >= 5) return "#ea580c";
  if (count >= 3) return "#f59e0b";
  return "#ef4444";
}

function extractFatalPreview(text: string): string[] {
  const lines = text.split(/\r?\n/);
  let fatalIdx = -1;
  for (let i = lines.length - 1; i >= 0; i--) {
    if (lines[i].toUpperCase().includes("FATAL")) { fatalIdx = i; break; }
  }
  if (fatalIdx === -1) return lines.slice(Math.max(0, lines.length - 4)).filter(l => l.trim() !== "");
  return lines.slice(Math.max(0, fatalIdx - 3), fatalIdx + 1).filter(l => l.trim() !== "");
}

// ─── Screenshot panel ─────────────────────────────────────────────────────────

interface ScreenshotPanelProps {
  src: string | null;
  onClick: (src: string) => void;
}

const ScreenshotPanel: React.FC<ScreenshotPanelProps> = ({ src, onClick }) => {
  const [errored, setErrored] = useState(false);
  const [hovered, setHovered] = useState(false);
  const missing = !src || errored;

  if (missing) {
    return (
      <Box sx={{
        width: "100%", height: "100%",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        gap: 1.25, borderRight: "1px solid #2d3f55",
      }}>
        <BrokenImageIcon sx={{ fontSize: 42, color: "#475569" }} />
        <Typography variant="body2" sx={{ fontWeight: 600, color: "#64748b", textAlign: "center", lineHeight: 1.4, px: 2.5 }}>
          Screenshot not captured
        </Typography>
        <Typography variant="caption" sx={{ color: "#475569", textAlign: "center", maxWidth: 200, lineHeight: 1.5 }}>
          Failed to capture during test execution
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{ width: "100%", height: "100%", cursor: "zoom-in", position: "relative" }}
      onClick={() => onClick(src!)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <img
        src={src!}
        alt="failure screenshot"
        onError={() => setErrored(true)}
        style={{
          width: "100%", height: "100%",
          objectFit: "contain", objectPosition: "center",
          display: "block",
          transition: "transform 0.22s ease",
          transform: hovered ? "scale(1.04)" : "scale(1)",
        }}
      />
      <Box sx={{
        position: "absolute", inset: 0,
        background: "rgba(15,23,42,0.52)",
        display: "flex", alignItems: "center", justifyContent: "center",
        opacity: hovered ? 1 : 0,
        transition: "opacity 0.18s ease",
        pointerEvents: "none",
      }}>
        <ZoomInIcon sx={{ fontSize: 40, color: "#fff" }} />
      </Box>
    </Box>
  );
};

// ─── Image modal ──────────────────────────────────────────────────────────────

const ImageModal: React.FC<{ src: string; onClose: () => void }> = ({ src, onClose }) => (
  <Dialog
    open
    onClose={onClose}
    maxWidth={false}
    PaperProps={{ sx: { bgcolor: "transparent", boxShadow: "none", m: 0, overflow: "visible" } }}
    sx={{ "& .MuiBackdrop-root": { bgcolor: "rgba(0,0,0,0.9)" }, cursor: "zoom-out" }}
  >
    <Box sx={{ position: "relative" }}>
      <img
        src={src}
        alt="screenshot"
        style={{ maxWidth: "92vw", maxHeight: "92vh", borderRadius: 8, boxShadow: "0 28px 64px rgba(0,0,0,0.7)", display: "block" }}
      />
      <IconButton
        onClick={onClose}
        size="small"
        sx={{
          position: "absolute", top: -14, right: -14,
          bgcolor: "#ef4444", color: "#fff", width: 28, height: 28,
          "&:hover": { bgcolor: "#dc2626" },
          boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
        }}
      >
        <CloseIcon sx={{ fontSize: 14 }} />
      </IconButton>
    </Box>
  </Dialog>
);

// ─── Log modal ────────────────────────────────────────────────────────────────

interface LogModalProps {
  lines: string[];
  testName: string;
  reasonLabel: string;
  onClose: () => void;
}

const LogModal: React.FC<LogModalProps> = ({ lines, testName, reasonLabel, onClose }) => (
  <Dialog
    open
    onClose={onClose}
    maxWidth="md"
    fullWidth
    PaperProps={{ sx: { bgcolor: "#0f172a", border: "1px solid #1e293b", borderRadius: 3, boxShadow: "0 32px 80px rgba(0,0,0,0.65)" } }}
  >
    <DialogTitle sx={{ borderBottom: "1px solid #1e293b", pb: 1.5 }}>
      <Typography sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 700, color: "#f1f5f9", mb: 0.375 }}>
        {testName}
      </Typography>
      <Typography variant="caption" sx={{ color: "#475569", textTransform: "uppercase", letterSpacing: "0.06em" }}>
        {reasonLabel}&nbsp;·&nbsp;Chronological&nbsp;·&nbsp;Truncated at test entry
      </Typography>
    </DialogTitle>
    <DialogContent sx={{ p: 0, overflowY: "auto" }}>
      <Box sx={{ fontFamily: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace", fontSize: 11, py: 1.25 }}>
        {renderLogLines(lines)}
      </Box>
    </DialogContent>
    <DialogActions sx={{ borderTop: "1px solid #1e293b", justifyContent: "space-between", px: 2.5, py: 1 }}>
      <Typography variant="caption" sx={{ color: "#334155" }}>
        {lines.length} lines shown · FATAL at bottom
      </Typography>
      <Button size="small" onClick={onClose} sx={{ color: "#94a3b8", textTransform: "none" }}>
        Close
      </Button>
    </DialogActions>
  </Dialog>
);

// ─── Reason block ─────────────────────────────────────────────────────────────

interface ReasonBlockProps {
  reason: ReasonEntry;
  label: string;
  testName: string;
  onExpandLog: (lines: string[], label: string) => void;
}

const ReasonBlock: React.FC<ReasonBlockProps> = ({ reason, label, testName, onExpandLog }) => {
  const previewLines = extractFatalPreview(reason.text ?? "");
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
      <Paper sx={{ bgcolor: "#0f172a", borderRadius: 2, border: "1px solid #1e293b", overflow: "hidden" }}>
        <Box sx={{ maxHeight: 170, overflowY: "auto", py: 0.75 }}>
          <Box sx={{ fontFamily: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace", fontSize: 11 }}>
            {renderLogLines(previewLines)}
          </Box>
        </Box>
      </Paper>
      <Box sx={{ display: "flex", gap: 0.875, flexWrap: "wrap" }}>
        <Button
          size="small" variant="outlined"
          startIcon={<TerminalIcon sx={{ fontSize: "13px !important" }} />}
          onClick={() => onExpandLog(truncateLogToTestScope(reason.text, testName), label)}
          sx={{
            borderColor: "#334155", color: "#94a3b8", fontSize: 11, textTransform: "none", py: "3px", px: "10px", minHeight: 0, lineHeight: 1.4,
            "&:hover": { borderColor: "#64748b", color: "#e2e8f0", bgcolor: "#1e293b" }
          }}
        >
          Expand Log
        </Button>
        {reason.logLink && (
          <Button
            size="small" variant="outlined"
            startIcon={<OpenInNewIcon sx={{ fontSize: "12px !important" }} />}
            href={reason.logLink} target="_blank" rel="noopener noreferrer"
            sx={{
              borderColor: "#e2e8f0", color: "#64748b", fontSize: 11, textTransform: "none", py: "3px", px: "10px", minHeight: 0, lineHeight: 1.4,
              "&:hover": { borderColor: "#94a3b8", color: "#1e293b", bgcolor: "#f8fafc" }
            }}
          >
            Full Log
          </Button>
        )}
      </Box>
    </Box>
  );
};

// ─── Failure card ─────────────────────────────────────────────────────────────

interface FailureCardProps {
  item: RecentFailureGroupedItem;
  index: number;
  onImageClick: (src: string) => void;
  onExpandLog: (lines: string[], testName: string, label: string) => void;
  onOpenHistory: () => void;
}

const FailureCard: React.FC<FailureCardProps> = ({ item, index, onImageClick, onExpandLog, onOpenHistory }) => {
  const [moreOpen, setMoreOpen] = useState(false);
  const primary = item.reasons[0] ?? null;
  const extra = item.reasons.slice(1, 3);
  const screenshotSrc = item.reasons[0]?.screenshotLink ?? item.lastFailure.screenshotLink ?? null;
  const color = severityColor(item.failCount);

  return (
    <Card
      variant="outlined"
      sx={{
        display: "flex", flexDirection: "row", overflow: "hidden",
        borderRadius: 3, borderTop: `3px solid ${color}`,
        transition: "box-shadow 0.2s ease, transform 0.2s ease",
        "&:hover": {
          boxShadow: "0 8px 28px rgba(0,0,0,0.13)",
          transform: "translateY(-2px)",
        },
      }}
    >
      {/* Screenshot panel */}
      <Box sx={{ flex: "0 0 38%", minWidth: 380, alignSelf: "stretch", bgcolor: "#fff", borderRadius: "10px 0 0 10px", overflow: "hidden", position: "relative" }}>
        <ScreenshotPanel src={screenshotSrc} onClick={onImageClick} />
      </Box>

      {/* Data panel */}
      <CardContent sx={{
        flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 1.75,
        py: 2.5, px: 3.5, borderLeft: "1px solid #e2e8f0",
        "&:last-child": { pb: 2.5 },
      }}>
        {/* Header row */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, flexWrap: "wrap" }}>
          <Typography component="span" sx={{ bgcolor: "#f1f5f9", color: "#64748b", borderRadius: "6px", px: 1, py: "2px", fontSize: 11, fontWeight: 700, flexShrink: 0, lineHeight: 1.5 }}>
            #{index + 1}
          </Typography>
          <Typography sx={{ fontFamily: "'JetBrains Mono', 'Fira Code', monospace", fontSize: 13, fontWeight: 600, color: "#0f172a", flex: 1, minWidth: 0, wordBreak: "break-all", lineHeight: 1.5 }}>
            {item.testName}
          </Typography>
          {item.lastFailure.server && (
            <Chip label={`🖥️ ${item.lastFailure.server}`} size="small" variant="outlined" sx={{ fontSize: 11, color: "#475569", borderColor: "#e2e8f0", flexShrink: 0 }} />
          )}
          {item.lastFailure.almaVersion && (
            <Chip label={`📦 ${item.lastFailure.almaVersion}`} size="small" variant="outlined" sx={{ fontSize: 11, color: "#475569", borderColor: "#e2e8f0", flexShrink: 0 }} />
          )}
          <Box component="span" sx={{ bgcolor: color, color: "#fff", borderRadius: 20, px: 1.5, py: "3px", fontSize: 12, fontWeight: 700, flexShrink: 0, whiteSpace: "nowrap", lineHeight: 1.6 }}>
            Failed {item.failCount} {item.failCount === 1 ? "time" : "times"} in {WINDOW_DAYS} days
          </Box>
        </Box>

        {/* Primary reason */}
        {primary && (
          <Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.875 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.07em" }}>
                Primary Reason
              </Typography>
              {primary.lastDate && (
                <Typography variant="caption" sx={{ fontWeight: 600, color: "#64748b", bgcolor: "#f1f5f9", borderRadius: "4px", px: 0.875, py: "1px", border: "1px solid #e2e8f0" }}>
                  📅 {dateOnly(primary.lastDate)}
                </Typography>
              )}
            </Box>
            <ReasonBlock reason={primary} label="Primary Reason" testName={item.testName}
              onExpandLog={(lines, label) => onExpandLog(lines, item.testName, label)} />
          </Box>
        )}

        {/* Action button group */}
        <Box sx={{ display: "flex", gap: 0.875, flexWrap: "wrap", pt: 0.5 }}>
          <Button
            size="small"
            variant="outlined"
            startIcon={<HistoryIcon sx={{ fontSize: "13px !important" }} />}
            onClick={onOpenHistory}
            sx={{
              borderColor: "#cbd5e1",
              color: "#475569",
              fontSize: 11,
              textTransform: "none",
              py: "3px",
              px: "10px",
              minHeight: 0,
              lineHeight: 1.4,
              "&:hover": { borderColor: "#94a3b8", bgcolor: "#fff", color: "#0f172a" },
            }}
          >
            History
          </Button>
        </Box>

        {/* Additional reasons */}
        {extra.length > 0 && (
          <Box>
            <Button
              size="small" variant="outlined"
              onClick={() => setMoreOpen(o => !o)}
              endIcon={<KeyboardArrowDownIcon sx={{ fontSize: "16px !important", transition: "transform 0.25s ease", transform: moreOpen ? "rotate(180deg)" : "rotate(0deg)" }} />}
              sx={{
                borderColor: "#e2e8f0", color: "#64748b", fontSize: 12, textTransform: "none", py: "4px", px: 1.5, minHeight: 0,
                "&:hover": { borderColor: "#cbd5e1", bgcolor: "#f8fafc", color: "#475569" }
              }}
            >
              {moreOpen ? "Hide additional reasons" : `${extra.length} more reason${extra.length > 1 ? "s" : ""}`}
            </Button>
            <Collapse in={moreOpen}>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1.75 }}>
                {extra.map((reason, i) => (
                  <Box key={i}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.875 }}>
                      <Typography variant="caption" sx={{ fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.07em" }}>
                        Reason {i + 2}
                      </Typography>
                      {reason.lastDate && (
                        <Typography variant="caption" sx={{ fontWeight: 600, color: "#64748b", bgcolor: "#f1f5f9", borderRadius: "4px", px: 0.875, py: "1px", border: "1px solid #e2e8f0" }}>
                          📅 {dateOnly(reason.lastDate)}
                        </Typography>
                      )}
                    </Box>
                    <ReasonBlock reason={reason} label={`Reason ${i + 2}`} testName={item.testName}
                      onExpandLog={(lines, label) => onExpandLog(lines, item.testName, label)} />
                  </Box>
                ))}
              </Box>
            </Collapse>
          </Box>
        )}

        {/* Meta chips */}
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, mt: "auto", pt: 0.5, borderTop: "1px solid #f1f5f9" }}>
          {(item.lastFailure.buildNumber ?? 0) > 0 && (
            <Chip label={`🔨 Build ${item.lastFailure.buildNumber}`} size="small" variant="outlined"
              sx={{ fontSize: 11, color: "#475569", borderColor: "#e2e8f0" }} />
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

// ─── Adapter: LatestFailedTestItem → RecentFailureGroupedItem ─────────────────

function toGroupedItem(item: LatestFailedTestItem): RecentFailureGroupedItem {
  return {
    testName: item.testName,
    failCount: 1,
    lastFailedOn: item.testedOn,
    reasons: item.failureText
      ? [{ text: item.failureText, lastDate: item.testedOn, screenshotLink: item.screenshotLink, logLink: item.logLink }]
      : [],
    lastFailure: {
      server: item.server,
      almaVersion: item.almaVersion,
      buildNumber: item.buildNumber,
      logLink: item.logLink,
      screenshotLink: item.screenshotLink,
    },
  };
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
                        item={toGroupedItem(test)}
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
