import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { getAreaRecentFailuresGrouped, getAreaLatestFailedTests } from "../services/apiService";
import type { EnvFilter } from "../services/apiService";
import type {
  AreaRecentFailuresGroupedResponse,
  RecentFailureGroupedItem,
  ReasonEntry,
} from "../types/RecentFailuresGrouped";
import type { LatestFailedTestsResponse, LatestFailedTestItem } from "../types/LatestFailed";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Collapse from "@mui/material/Collapse";
import TerminalIcon from "@mui/icons-material/Terminal";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import BrokenImageIcon from "@mui/icons-material/BrokenImage";
import ZoomInIcon from "@mui/icons-material/ZoomIn";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";

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
    if (lines[i].toUpperCase().includes("FATAL")) {
      fatalIdx = i;
      break;
    }
  }

  if (fatalIdx === -1) return lines.slice(Math.max(0, lines.length - 40));

  const nameLower = testName.toLowerCase();
  let startIdx = Math.max(0, fatalIdx - 60);
  for (let i = fatalIdx - 1; i >= Math.max(0, fatalIdx - 60); i--) {
    if (lines[i].toLowerCase().includes(nameLower)) {
      startIdx = i;
      break;
    }
  }
  return lines.slice(startIdx, fatalIdx + 1);
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

// Strips any time component from whatever the API returns (YYYY-MM-DD HH:MM or ISO).
// Guarantees only the date portion is ever shown in the UI.
function dateOnly(value: string | null | undefined): string | null {
  if (!value) return null;
  return value.split("T")[0].split(" ")[0];
}

// ─── Severity helpers ─────────────────────────────────────────────────────────

function severityColor(count: number): string {
  if (count >= 10) return "#dc2626";
  if (count >= 5)  return "#ea580c";
  if (count >= 3)  return "#f59e0b";
  return "#ef4444";
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
      <div style={{
        width: "100%", height: "100%",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        gap: 10, borderRight: "1px solid #2d3f55",
      }}>
        <BrokenImageIcon sx={{ fontSize: 42, color: "#475569" }} />
        <div style={{ fontSize: 12, fontWeight: 600, color: "#64748b", textAlign: "center", lineHeight: 1.4, padding: "0 20px" }}>
          Screenshot not captured
        </div>
        <div style={{ fontSize: 11, color: "#475569", textAlign: "center", maxWidth: 200, lineHeight: 1.5 }}>
          Failed to capture during test execution
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: "100%", height: "100%", cursor: "zoom-in", position: "relative" }}
      onClick={() => onClick(src)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <img
        src={src}
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
      <div style={{
        position: "absolute", inset: 0,
        background: "rgba(15,23,42,0.52)",
        display: "flex", alignItems: "center", justifyContent: "center",
        opacity: hovered ? 1 : 0,
        transition: "opacity 0.18s ease",
        pointerEvents: "none",
      }}>
        <ZoomInIcon sx={{ fontSize: 40, color: "#fff" }} />
      </div>
    </div>
  );
};

// ─── Image modal ──────────────────────────────────────────────────────────────

const ImageModal: React.FC<{ src: string; onClose: () => void }> = ({ src, onClose }) => (
  <div onClick={onClose} style={{
    position: "fixed", inset: 0, zIndex: 1300,
    background: "rgba(0,0,0,0.9)",
    display: "flex", alignItems: "center", justifyContent: "center",
    cursor: "zoom-out",
  }}>
    <div onClick={(e) => e.stopPropagation()} style={{ position: "relative" }}>
      <img src={src} alt="screenshot" style={{
        maxWidth: "92vw", maxHeight: "92vh",
        borderRadius: 8, boxShadow: "0 28px 64px rgba(0,0,0,0.7)",
      }} />
      <button onClick={onClose} style={{
        position: "absolute", top: -14, right: -14,
        background: "#ef4444", border: "none", borderRadius: "50%",
        width: 30, height: 30, color: "#fff", fontSize: 17,
        cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
      }}>×</button>
    </div>
  </div>
);

// ─── Log modal ────────────────────────────────────────────────────────────────

interface LogModalProps {
  lines: string[];
  testName: string;
  reasonLabel: string;
  onClose: () => void;
}

const LogModal: React.FC<LogModalProps> = ({ lines, testName, reasonLabel, onClose }) => (
  <div onClick={onClose} style={{
    position: "fixed", inset: 0, zIndex: 1300,
    background: "rgba(0,0,0,0.85)",
    display: "flex", alignItems: "center", justifyContent: "center",
    padding: 32,
  }}>
    <div onClick={(e) => e.stopPropagation()} style={{
      width: "min(960px, 94vw)", maxHeight: "88vh",
      background: "#0f172a", borderRadius: 12,
      border: "1px solid #1e293b",
      boxShadow: "0 32px 80px rgba(0,0,0,0.65)",
      display: "flex", flexDirection: "column", overflow: "hidden",
    }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 20px", borderBottom: "1px solid #1e293b", flexShrink: 0,
      }}>
        <div>
          <div style={{ fontFamily: "'JetBrains Mono', 'Fira Code', monospace", fontSize: 13, fontWeight: 700, color: "#f1f5f9", marginBottom: 3 }}>
            {testName}
          </div>
          <div style={{ fontSize: 10, color: "#475569", letterSpacing: "0.06em", textTransform: "uppercase" }}>
            {reasonLabel}&nbsp;·&nbsp;Chronological&nbsp;·&nbsp;Truncated at test entry
          </div>
        </div>
        <button onClick={onClose} style={{
          background: "#1e293b", border: "1px solid #334155",
          borderRadius: 6, color: "#94a3b8", fontSize: 13,
          padding: "5px 14px", cursor: "pointer",
        }}>Close</button>
      </div>
      <div style={{ overflowY: "auto", flex: 1, padding: "10px 0" }}>
        <div style={{ fontFamily: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace", fontSize: 11 }}>
          {renderLogLines(lines)}
        </div>
      </div>
      <div style={{
        padding: "8px 20px", borderTop: "1px solid #1e293b",
        fontSize: 10, color: "#334155", flexShrink: 0, textAlign: "right",
      }}>
        {lines.length} lines shown · FATAL at bottom
      </div>
    </div>
  </div>
);

// ─── Fatal preview ────────────────────────────────────────────────────────────

function extractFatalPreview(text: string): string[] {
  const lines = text.split(/\r?\n/);
  let fatalIdx = -1;
  for (let i = lines.length - 1; i >= 0; i--) {
    if (lines[i].toUpperCase().includes("FATAL")) { fatalIdx = i; break; }
  }
  if (fatalIdx === -1) return lines.slice(Math.max(0, lines.length - 4)).filter(l => l.trim() !== "");
  return lines.slice(Math.max(0, fatalIdx - 3), fatalIdx + 1).filter(l => l.trim() !== "");
}

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
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ background: "#0f172a", borderRadius: 8, border: "1px solid #1e293b", overflow: "hidden" }}>
        <div style={{ maxHeight: 170, overflowY: "auto", padding: "6px 0" }}>
          <div style={{ fontFamily: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace", fontSize: 11 }}>
            {renderLogLines(previewLines)}
          </div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
        <Button size="small" variant="outlined"
          startIcon={<TerminalIcon sx={{ fontSize: "13px !important" }} />}
          onClick={() => onExpandLog(truncateLogToTestScope(reason.text, testName), label)}
          sx={{ borderColor: "#334155", color: "#94a3b8", fontSize: 11, textTransform: "none", py: "3px", px: "10px", minHeight: 0, lineHeight: 1.4,
            "&:hover": { borderColor: "#64748b", color: "#e2e8f0", bgcolor: "#1e293b" } }}
        >Expand Log</Button>
        {reason.logLink && (
          <Button size="small" variant="outlined"
            startIcon={<OpenInNewIcon sx={{ fontSize: "12px !important" }} />}
            href={reason.logLink} target="_blank" rel="noopener noreferrer"
            sx={{ borderColor: "#e2e8f0", color: "#64748b", fontSize: 11, textTransform: "none", py: "3px", px: "10px", minHeight: 0, lineHeight: 1.4,
              "&:hover": { borderColor: "#94a3b8", color: "#1e293b", bgcolor: "#f8fafc" } }}
          >Full Log</Button>
        )}
      </div>
    </div>
  );
};

// ─── Failure card ─────────────────────────────────────────────────────────────

interface FailureCardProps {
  item: RecentFailureGroupedItem;
  index: number;
  onImageClick: (src: string) => void;
  onExpandLog: (lines: string[], testName: string, label: string) => void;
}

const FailureCard: React.FC<FailureCardProps> = ({ item, index, onImageClick, onExpandLog }) => {
  const [moreOpen, setMoreOpen] = useState(false);
  const [cardHovered, setCardHovered] = useState(false);

  const primary = item.reasons[0] ?? null;
  const extra = item.reasons.slice(1, 3);
  const screenshotSrc = item.reasons[0]?.screenshotLink ?? item.lastFailure.screenshotLink ?? null;
  const color = severityColor(item.failCount);

  return (
    <div
      style={{
        background: "#fff", borderRadius: 12,
        border: "1px solid #e2e8f0", borderTop: `3px solid ${color}`,
        boxShadow: cardHovered ? "0 8px 28px rgba(0,0,0,0.13)" : "0 1px 4px rgba(0,0,0,0.07)",
        display: "flex", flexDirection: "row", overflow: "hidden",
        transition: "box-shadow 0.2s ease, transform 0.2s ease",
        transform: cardHovered ? "translateY(-2px)" : "translateY(0)",
      }}
      onMouseEnter={() => setCardHovered(true)}
      onMouseLeave={() => setCardHovered(false)}
    >
      {/* Screenshot panel */}
      <div style={{
        flex: "0 0 38%", minWidth: 380, alignSelf: "stretch",
        background: "#fff", borderRadius: "10px 0 0 10px",
        overflow: "hidden", position: "relative",
      }}>
        <ScreenshotPanel src={screenshotSrc} onClick={onImageClick} />
      </div>

      {/* Data panel */}
      <div style={{
        flex: 1, minWidth: 0,
        display: "flex", flexDirection: "column",
        padding: "20px 28px", gap: 14,
        borderLeft: "1px solid #e2e8f0",
      }}>
        {/* Header row */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span style={{
            background: "#f1f5f9", color: "#64748b", borderRadius: 6,
            padding: "2px 8px", fontSize: 11, fontWeight: 700,
            flexShrink: 0, lineHeight: 1.5, marginTop: 2,
          }}>#{index + 1}</span>

          <span style={{
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            fontSize: 13, fontWeight: 600, color: "#0f172a",
            flex: 1, minWidth: 0, wordBreak: "break-all", lineHeight: 1.5,
          }}>{item.testName}</span>

          {item.lastFailure.server && (
            <span style={{
              background: "#f1f5f9", color: "#475569", borderRadius: 4,
              padding: "2px 7px", fontSize: 11, fontWeight: 500,
              flexShrink: 0, letterSpacing: "0.02em", lineHeight: 1.5,
              border: "1px solid #e2e8f0",
            }}>🖥️ {item.lastFailure.server}</span>
          )}
          {item.lastFailure.almaVersion && (
            <span style={{
              background: "#f1f5f9", color: "#475569", borderRadius: 4,
              padding: "2px 7px", fontSize: 11, fontWeight: 500,
              flexShrink: 0, letterSpacing: "0.02em", lineHeight: 1.5,
              border: "1px solid #e2e8f0",
            }}>📦 {item.lastFailure.almaVersion}</span>
          )}
          <span style={{
            background: color, color: "#fff", borderRadius: 20,
            padding: "3px 12px", fontSize: 12, fontWeight: 700,
            flexShrink: 0, whiteSpace: "nowrap", lineHeight: 1.6,
          }}>
            Failed {item.failCount} {item.failCount === 1 ? "time" : "times"} in {WINDOW_DAYS} days
          </span>
        </div>

        {/* Primary reason */}
        {primary && (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.07em" }}>
                Primary Reason
              </span>
              {primary.lastDate && (
                <span style={{
                  fontSize: 11, fontWeight: 600, color: "#64748b",
                  background: "#f1f5f9", borderRadius: 4, padding: "1px 7px", border: "1px solid #e2e8f0",
                }}>📅 {dateOnly(primary.lastDate)}</span>
              )}
            </div>
            <ReasonBlock reason={primary} label="Primary Reason" testName={item.testName}
              onExpandLog={(lines, label) => onExpandLog(lines, item.testName, label)} />
          </div>
        )}

        {/* Additional reasons */}
        {extra.length > 0 && (
          <div>
            <Button size="small" variant="outlined"
              onClick={() => setMoreOpen(o => !o)}
              endIcon={<KeyboardArrowDownIcon sx={{ fontSize: "16px !important", transition: "transform 0.25s ease", transform: moreOpen ? "rotate(180deg)" : "rotate(0deg)" }} />}
              sx={{ borderColor: "#e2e8f0", color: "#64748b", fontSize: 12, textTransform: "none", py: "4px", px: "12px", minHeight: 0,
                "&:hover": { borderColor: "#cbd5e1", bgcolor: "#f8fafc", color: "#475569" } }}
            >
              {moreOpen ? "Hide additional reasons" : `${extra.length} more reason${extra.length > 1 ? "s" : ""}`}
            </Button>
            <Collapse in={moreOpen}>
              <div style={{ display: "flex", flexDirection: "column", gap: 16, paddingTop: 14 }}>
                {extra.map((reason, i) => (
                  <div key={i}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.07em" }}>
                        Reason {i + 2}
                      </span>
                      {reason.lastDate && (
                        <span style={{
                          fontSize: 11, fontWeight: 600, color: "#64748b",
                          background: "#f1f5f9", borderRadius: 4, padding: "1px 7px", border: "1px solid #e2e8f0",
                        }}>📅 {dateOnly(reason.lastDate)}</span>
                      )}
                    </div>
                    <ReasonBlock reason={reason} label={`Reason ${i + 2}`} testName={item.testName}
                      onExpandLog={(lines, label) => onExpandLog(lines, item.testName, label)} />
                  </div>
                ))}
              </div>
            </Collapse>
          </div>
        )}

        {/* Meta chips */}
        <div style={{
          display: "flex", flexWrap: "wrap", gap: 6,
          marginTop: "auto", paddingTop: 4, borderTop: "1px solid #f1f5f9",
        }}>
          {(item.lastFailure.buildNumber ?? 0) > 0 && (
            <Chip label={`🔨 Build ${item.lastFailure.buildNumber}`} size="small" variant="outlined"
              sx={{ fontSize: 11, color: "#475569", borderColor: "#e2e8f0" }} />
          )}
        </div>
      </div>
    </div>
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
}

const LatestFailedView: React.FC<LatestFailedViewProps> = ({ data, search, onImageClick, onExpandLog }) => {
  // Only one test can be open at a time — clicking another auto-closes the previous
  const [openTestName, setOpenTestName] = useState<string | null>(null);

  const handleRowClick = (testName: string) => {
    setOpenTestName(prev => (prev === testName ? null : testName));
  };

  // Apply shared search: match testName or server name; drop groups with no matches.
  const q = search.trim().toLowerCase();
  const filteredServers = q
    ? data.servers
        .map(sg => ({
          ...sg,
          tests: sg.tests.filter(t =>
            t.testName.toLowerCase().includes(q) ||
            t.server.toLowerCase().includes(q)
          ),
        }))
        .filter(sg => sg.tests.length > 0)
    : data.servers;

  if (data.servers.length === 0) {
    return (
      <div style={{
        background: "#f0fdf4", border: "1px solid #bbf7d0",
        borderRadius: 10, padding: 40, color: "#16a34a",
        textAlign: "center", fontSize: 16,
      }}>
        No tests whose latest result is a failure.
      </div>
    );
  }

  if (filteredServers.length === 0) {
    return (
      <div style={{
        background: "#f8fafc", border: "1px solid #e2e8f0",
        borderRadius: 10, padding: 40, color: "#94a3b8",
        textAlign: "center", fontSize: 15,
      }}>
        No tests match <strong style={{ color: "#475569" }}>"{search}"</strong>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      {filteredServers.map((serverGroup) => (
        <div key={serverGroup.server}>

          {/* ── Server header ── prominent dark bar */}
          <div style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "12px 18px",
            background: "#1e293b",
            borderRadius: "8px 8px 0 0",
            borderBottom: "3px solid #ef4444",
          }}>
            <span style={{ fontSize: 18, lineHeight: 1 }}>🖥️</span>
            <span style={{
              fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
              fontSize: 15, fontWeight: 800,
              color: "#f1f5f9", letterSpacing: "0.05em",
            }}>
              {serverGroup.server}
            </span>
            <span style={{
              marginLeft: "auto",
              background: "#ef4444", color: "#fff",
              borderRadius: 20, padding: "3px 12px",
              fontSize: 12, fontWeight: 700,
            }}>
              {serverGroup.tests.length} {serverGroup.tests.length === 1 ? "test" : "tests"}
            </span>
          </div>

          {/* ── Test list with inline accordion ── */}
          <div style={{
            background: "#fff",
            border: "1px solid #e2e8f0",
            borderTop: "none",
            borderRadius: "0 0 8px 8px",
            overflow: "hidden",
          }}>
            {serverGroup.tests.map((test, idx) => {
              const isOpen = openTestName === test.testName;
              const isLast = idx === serverGroup.tests.length - 1;

              return (
                <div key={test.testName}>
                  {/* Clickable row */}
                  <div
                    onClick={() => handleRowClick(test.testName)}
                    style={{
                      display: "flex", alignItems: "center",
                      padding: "11px 16px",
                      borderBottom: (!isLast || isOpen) ? "1px solid #f1f5f9" : "none",
                      cursor: "pointer",
                      background: isOpen ? "#fef2f2" : "transparent",
                      transition: "background 0.15s",
                      gap: 10,
                      userSelect: "none",
                    }}
                    onMouseEnter={(e) => {
                      if (!isOpen) e.currentTarget.style.background = "#f8fafc";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = isOpen ? "#fef2f2" : "transparent";
                    }}
                  >
                    {/* Status dot */}
                    <span style={{
                      width: 8, height: 8, borderRadius: "50%",
                      background: "#ef4444", flexShrink: 0,
                    }} />

                    {/* Test name */}
                    <span style={{
                      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                      fontSize: 13, color: "#0f172a",
                      flex: 1, minWidth: 0, wordBreak: "break-all",
                    }}>
                      {test.testName}
                    </span>

                    {/* Chevron */}
                    <KeyboardArrowDownIcon sx={{
                      fontSize: 18, color: isOpen ? "#dc2626" : "#94a3b8", flexShrink: 0,
                      transition: "transform 0.22s ease",
                      transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                    }} />
                  </div>

                  {/* Inline detail — MUI Collapse so it animates open/shut */}
                  <Collapse in={isOpen} unmountOnExit>
                    <div style={{
                      padding: "16px 16px 20px",
                      background: "#f8fafc",
                      borderBottom: !isLast ? "1px solid #e2e8f0" : "none",
                    }}>
                      <FailureCard
                        item={toGroupedItem(test)}
                        index={0}
                        onImageClick={onImageClick}
                        onExpandLog={onExpandLog}
                      />
                    </div>
                  </Collapse>
                </div>
              );
            })}
          </div>

        </div>
      ))}
    </div>
  );
};

// ─── View toggle ──────────────────────────────────────────────────────────────

interface ViewToggleProps {
  active: number;
  onChange: (v: number) => void;
}

// Shared typography token — both the toggle labels and the search input use this
// so they look like a single cohesive control.
const TOOLBAR_FONT: React.CSSProperties = {
  fontFamily: "inherit",
  fontSize: 14,
  letterSpacing: "0.01em",
};

const ViewToggle: React.FC<ViewToggleProps> = ({ active, onChange }) => {
  const btn = (idx: number, label: string) => (
    <button
      onClick={() => onChange(idx)}
      style={{
        ...TOOLBAR_FONT,
        padding: "9px 26px",
        borderRadius: 8,
        border: "none",
        cursor: "pointer",
        // Active: bold + red; inactive: normal weight + muted — the ONLY visual difference
        fontWeight: active === idx ? 700 : 400,
        background: active === idx ? "#fff" : "transparent",
        color: active === idx ? "#dc2626" : "#64748b",
        boxShadow: active === idx ? "0 2px 10px rgba(0,0,0,0.10)" : "none",
        transition: "all 0.18s ease",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </button>
  );

  return (
    <div style={{
      display: "inline-flex",
      background: "#e2e8f0",
      borderRadius: 10,
      padding: 4,
      gap: 2,
    }}>
      {btn(0, "Full View")}
      {btn(1, "List View")}
    </div>
  );
};

// ─── Main page ────────────────────────────────────────────────────────────────

const RecentFailuresPage: React.FC = () => {
  const { areaName } = useParams<{ areaName: string }>();
  const [searchParams] = useSearchParams();
  const env = (searchParams.get("env") ?? "qa") as EnvFilter;
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState(0);

  // Tab 0 state
  const [data, setData] = useState<AreaRecentFailuresGroupedResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"failCount" | "lastFailedOn">("failCount");

  // Tab 1 state
  const [latestData, setLatestData] = useState<LatestFailedTestsResponse | null>(null);
  const [latestLoading, setLatestLoading] = useState(false);
  const [latestError, setLatestError] = useState("");
  const [latestFetched, setLatestFetched] = useState(false);

  // Shared modal state
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [logModal, setLogModal] = useState<{ lines: string[]; testName: string; label: string } | null>(null);

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
    <div style={{ minHeight: "100vh", background: "#f8fafc" }}>
      {imageSrc && <ImageModal src={imageSrc} onClose={() => setImageSrc(null)} />}
      {logModal && (
        <LogModal lines={logModal.lines} testName={logModal.testName} reasonLabel={logModal.label}
          onClose={() => setLogModal(null)} />
      )}

      {/* ── Sticky header ── */}
      <div style={{
        background: "#fff", borderBottom: "1px solid #e5e7eb",
        padding: "14px 32px",
        display: "flex", alignItems: "center", gap: 16,
        position: "sticky", top: 0, zIndex: 100,
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
      }}>
        <button onClick={() => navigate("/")} style={{
          background: "none", border: "1px solid #e2e8f0",
          borderRadius: 8, padding: "6px 14px",
          cursor: "pointer", fontSize: 13, color: "#64748b",
        }}>← Dashboard</button>

        <div style={{ flex: 1 }}>
          {/* Main page title */}
          <div style={{
            fontSize: 26, fontWeight: 900, color: "#0f172a",
            fontFamily: "'JetBrains Mono', monospace",
            letterSpacing: "-0.02em",
            lineHeight: 1.15,
          }}>
            Recent Failures
          </div>
          {/* Subtitle: area name + context */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 3 }}>
            <span style={{
              fontSize: 13, fontWeight: 700, color: "#475569",
              fontFamily: "'JetBrains Mono', monospace",
            }}>{areaName}</span>
            <span style={{ fontSize: 11, color: "#cbd5e1" }}>·</span>
            <span style={{ fontSize: 12, color: "#94a3b8" }}>
              {activeTab === 0
                ? `last ${WINDOW_DAYS} days · ${env.toUpperCase()}`
                : `latest status · ${env.toUpperCase()}`}
            </span>
          </div>
        </div>

        {activeTab === 0 && data && (
          <div style={{
            background: "#fef2f2", border: "1px solid #fecaca",
            borderRadius: 10, padding: "6px 18px", textAlign: "center",
          }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#dc2626" }}>{data.items.length}</div>
            <div style={{ fontSize: 11, color: "#ef4444" }}>failed tests</div>
          </div>
        )}
        {activeTab === 1 && latestData && (
          <div style={{
            background: "#fef2f2", border: "1px solid #fecaca",
            borderRadius: 10, padding: "6px 18px", textAlign: "center",
          }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#dc2626" }}>{latestData.totalCount}</div>
            <div style={{ fontSize: 11, color: "#ef4444" }}>broken now</div>
          </div>
        )}
      </div>

      {/* ── Search + view toggle (shared, always visible) ── */}
      <div style={{
        background: "#fff", borderBottom: "1px solid #e5e7eb",
        padding: "12px 32px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        {/* Toggle aligned left */}
        <ViewToggle active={activeTab} onChange={setActiveTab} />

        {/* Search aligned right — same font token as the toggle labels */}
        <input
          type="text"
          placeholder="Search by test name…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            ...TOOLBAR_FONT,
            fontWeight: 400,
            width: 280,
            border: "1px solid #e2e8f0", borderRadius: 8,
            padding: "9px 14px", outline: "none",
            background: "#f8fafc", color: "#1e293b",
          }}
        />
      </div>

      {/* ── Content ── */}
      <div style={{ padding: "24px 40px" }}>

        {/* Tab 0: All Recent Failures */}
        {activeTab === 0 && (
          <>
            {loading && (
              <div style={{ textAlign: "center", padding: 60, color: "#94a3b8" }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>⏳</div>
                <div>Loading failures...</div>
              </div>
            )}
            {!loading && error && (
              <div style={{
                background: "#fef2f2", border: "1px solid #fecaca",
                borderRadius: 10, padding: 20, color: "#dc2626", textAlign: "center",
              }}>❌ {error}</div>
            )}
            {!loading && !error && data?.items.length === 0 && (
              <div style={{
                background: "#f0fdf4", border: "1px solid #bbf7d0",
                borderRadius: 10, padding: 40, color: "#16a34a",
                textAlign: "center", fontSize: 16,
              }}>🎉 No failures found in the last {WINDOW_DAYS} days!</div>
            )}
            {!loading && !error && data && data.items.length > 0 && (
              <>
                <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
                  <select value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)}
                    style={{
                      border: "1px solid #e2e8f0", borderRadius: 8,
                      padding: "8px 14px", fontSize: 13, outline: "none",
                      background: "#fff", color: "#475569", cursor: "pointer",
                    }}
                  >
                    <option value="failCount">Sort: failure count</option>
                    <option value="lastFailedOn">Sort: last failed</option>
                  </select>
                  <span style={{ fontSize: 13, color: "#94a3b8" }}>{items.length} results</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {items.map((item, i) => (
                    <FailureCard
                      key={item.testName}
                      item={item}
                      index={i}
                      onImageClick={setImageSrc}
                      onExpandLog={(lines, testName, label) => setLogModal({ lines, testName, label })}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {/* Tab 1: Currently Broken Tests */}
        {activeTab === 1 && (
          <>
            {latestLoading && (
              <div style={{ textAlign: "center", padding: 60, color: "#94a3b8" }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>⏳</div>
                <div>Loading currently broken tests...</div>
              </div>
            )}
            {!latestLoading && latestError && (
              <div style={{
                background: "#fef2f2", border: "1px solid #fecaca",
                borderRadius: 10, padding: 20, color: "#dc2626", textAlign: "center",
              }}>❌ {latestError}</div>
            )}
            {!latestLoading && !latestError && latestData && (
              <LatestFailedView
                data={latestData}
                search={search}
                onImageClick={setImageSrc}
                onExpandLog={(lines, testName, label) => setLogModal({ lines, testName, label })}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default RecentFailuresPage;
