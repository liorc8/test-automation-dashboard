import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { getAreaRecentFailuresGrouped } from "../services/apiService";
import type { EnvFilter } from "../services/apiService";
import type {
  AreaRecentFailuresGroupedResponse,
  RecentFailureGroupedItem,
  ReasonEntry,
} from "../types/RecentFailuresGrouped";
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

/**
 * Truncates the log to only the scope of the failing test.
 * Lines are returned in natural chronological order (earliest first, FATAL last).
 * Scans backwards from the FATAL line to find where the test function was entered,
 * then slices [startIdx..fatalIdx] inclusive.
 */
function truncateLogToTestScope(logText: string, testName: string): string[] {
  const lines = logText.split(/\r?\n/).filter((l) => l.trim() !== "");

  let fatalIdx = -1;
  for (let i = lines.length - 1; i >= 0; i--) {
    if (lines[i].toUpperCase().includes("FATAL")) {
      fatalIdx = i;
      break;
    }
  }

  if (fatalIdx === -1) {
    return lines.slice(Math.max(0, lines.length - 40));
  }

  const JAVA_CALL_RE = /\.\w+\((\w+)\.java:\d+\)/;
  const FRAMEWORK_RE =
    /^(TestBase|BaseTest|AbstractTest|TestNGBase|BaseClass|TestRunner|RetryAnalyzer|TestListener|TestNGListener|AbstractTestNGSpringContextTests|SpringRunner|SuiteRunner|Suite|TestNG)$/i;
  const TEST_CLASS_RE = /(Test|Tests|IT|TestCase|TestSuite)$/;
  const nameLower = testName.toLowerCase();

  let startIdx = Math.max(0, fatalIdx - 50);

  for (let i = fatalIdx - 1; i >= 0; i--) {
    const line = lines[i];
    if (line.toLowerCase().includes(nameLower)) {
      startIdx = i;
      break;
    }
    const match = JAVA_CALL_RE.exec(line);
    if (match) {
      const className = match[1];
      if (!FRAMEWORK_RE.test(className) && TEST_CLASS_RE.test(className)) {
        startIdx = i;
        break;
      }
    }
  }

  return lines.slice(startIdx, fatalIdx + 1);
}

// ─── Severity helpers ─────────────────────────────────────────────────────────

function severityColor(count: number): string {
  if (count >= 10) return "#dc2626";
  if (count >= 5) return "#ea580c";
  if (count >= 3) return "#f59e0b";
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

  // ScreenshotPanel is dimension-agnostic — sizing is fully controlled by the
  // parent wrapper in FailureCard (the left-panel div).
  if (missing) {
    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          borderRight: "1px solid #2d3f55",
        }}
      >
        <BrokenImageIcon sx={{ fontSize: 42, color: "#475569" }} />
        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: "#64748b",
            textAlign: "center",
            lineHeight: 1.4,
            padding: "0 20px",
          }}
        >
          Screenshot not captured
        </div>
        <div
          style={{
            fontSize: 11,
            color: "#475569",
            textAlign: "center",
            maxWidth: 200,
            lineHeight: 1.5,
          }}
        >
          Failed to capture during test execution
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        cursor: "zoom-in",
        position: "relative",
      }}
      onClick={() => onClick(src)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* contain: full screenshot always visible, dark bg fills letterbox gaps */}
      <img
        src={src}
        alt="failure screenshot"
        onError={() => setErrored(true)}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
          objectPosition: "center",
          display: "block",
          transition: "transform 0.22s ease",
          transform: hovered ? "scale(1.04)" : "scale(1)",
        }}
      />
      {/* Hover overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(15,23,42,0.52)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity: hovered ? 1 : 0,
          transition: "opacity 0.18s ease",
          pointerEvents: "none",
        }}
      >
        <ZoomInIcon sx={{ fontSize: 40, color: "#fff" }} />
      </div>
    </div>
  );
};

// ─── Image modal ──────────────────────────────────────────────────────────────

const ImageModal: React.FC<{ src: string; onClose: () => void }> = ({
  src,
  onClose,
}) => (
  <div
    onClick={onClose}
    style={{
      position: "fixed",
      inset: 0,
      zIndex: 1300,
      background: "rgba(0,0,0,0.9)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      cursor: "zoom-out",
    }}
  >
    <div onClick={(e) => e.stopPropagation()} style={{ position: "relative" }}>
      <img
        src={src}
        alt="screenshot"
        style={{
          maxWidth: "92vw",
          maxHeight: "92vh",
          borderRadius: 8,
          boxShadow: "0 28px 64px rgba(0,0,0,0.7)",
        }}
      />
      <button
        onClick={onClose}
        style={{
          position: "absolute",
          top: -14,
          right: -14,
          background: "#ef4444",
          border: "none",
          borderRadius: "50%",
          width: 30,
          height: 30,
          color: "#fff",
          fontSize: 17,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
        }}
      >
        ×
      </button>
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

const LogModal: React.FC<LogModalProps> = ({
  lines,
  testName,
  reasonLabel,
  onClose,
}) => (
  <div
    onClick={onClose}
    style={{
      position: "fixed",
      inset: 0,
      zIndex: 1300,
      background: "rgba(0,0,0,0.85)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 32,
    }}
  >
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        width: "min(960px, 94vw)",
        maxHeight: "88vh",
        background: "#0f172a",
        borderRadius: 12,
        border: "1px solid #1e293b",
        boxShadow: "0 32px 80px rgba(0,0,0,0.65)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 20px",
          borderBottom: "1px solid #1e293b",
          flexShrink: 0,
        }}
      >
        <div>
          <div
            style={{
              fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
              fontSize: 13,
              fontWeight: 700,
              color: "#f1f5f9",
              marginBottom: 3,
            }}
          >
            {testName}
          </div>
          <div
            style={{
              fontSize: 10,
              color: "#475569",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            {reasonLabel}&nbsp;·&nbsp;Chronological&nbsp;·&nbsp;Truncated at
            test entry
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            background: "#1e293b",
            border: "1px solid #334155",
            borderRadius: 6,
            color: "#94a3b8",
            fontSize: 13,
            padding: "5px 14px",
            cursor: "pointer",
          }}
        >
          Close
        </button>
      </div>

      <div style={{ overflowY: "auto", flex: 1, padding: "10px 0" }}>
        <div
          style={{
            fontFamily:
              "'JetBrains Mono', 'Fira Code', 'Courier New', monospace",
            fontSize: 11,
          }}
        >
          {renderLogLines(lines)}
        </div>
      </div>

      <div
        style={{
          padding: "8px 20px",
          borderTop: "1px solid #1e293b",
          fontSize: 10,
          color: "#334155",
          flexShrink: 0,
          textAlign: "right",
        }}
      >
        {lines.length} lines shown · FATAL at bottom
      </div>
    </div>
  </div>
);

// ─── Reason block ─────────────────────────────────────────────────────────────

interface ReasonBlockProps {
  reason: ReasonEntry;
  label: string;
  testName: string;
  onExpandLog: (lines: string[], label: string) => void;
}

const ReasonBlock: React.FC<ReasonBlockProps> = ({
  reason,
  label,
  testName,
  onExpandLog,
}) => {
  const previewLines = reason.text.split(/\r?\n/).slice(0, 12);
  const totalLines = reason.text
    .split(/\r?\n/)
    .filter((l) => l.trim()).length;
  const hasMore = totalLines > 12;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div
        style={{
          background: "#0f172a",
          borderRadius: 8,
          border: "1px solid #1e293b",
          overflow: "hidden",
        }}
      >
        <div style={{ maxHeight: 170, overflowY: "auto", padding: "6px 0" }}>
          <div
            style={{
              fontFamily:
                "'JetBrains Mono', 'Fira Code', 'Courier New', monospace",
              fontSize: 11,
            }}
          >
            {renderLogLines(previewLines)}
            {hasMore && (
              <div
                style={{
                  color: "#334155",
                  fontStyle: "italic",
                  padding: "3px 11px",
                  fontSize: 10,
                }}
              >
                … {totalLines - 12} more lines — expand to see all
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
        <Button
          size="small"
          variant="outlined"
          startIcon={<TerminalIcon sx={{ fontSize: "13px !important" }} />}
          onClick={() =>
            onExpandLog(truncateLogToTestScope(reason.text, testName), label)
          }
          sx={{
            borderColor: "#334155",
            color: "#94a3b8",
            fontSize: 11,
            textTransform: "none",
            py: "3px",
            px: "10px",
            minHeight: 0,
            lineHeight: 1.4,
            "&:hover": {
              borderColor: "#64748b",
              color: "#e2e8f0",
              bgcolor: "#1e293b",
            },
          }}
        >
          Expand Log
        </Button>

        {reason.logLink && (
          <Button
            size="small"
            variant="outlined"
            startIcon={<OpenInNewIcon sx={{ fontSize: "12px !important" }} />}
            href={reason.logLink}
            target="_blank"
            rel="noopener noreferrer"
            sx={{
              borderColor: "#e2e8f0",
              color: "#64748b",
              fontSize: 11,
              textTransform: "none",
              py: "3px",
              px: "10px",
              minHeight: 0,
              lineHeight: 1.4,
              "&:hover": {
                borderColor: "#94a3b8",
                color: "#1e293b",
                bgcolor: "#f8fafc",
              },
            }}
          >
            Full Log
          </Button>
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

const FailureCard: React.FC<FailureCardProps> = ({
  item,
  index,
  onImageClick,
  onExpandLog,
}) => {
  const [moreOpen, setMoreOpen] = useState(false);
  const [cardHovered, setCardHovered] = useState(false);

  const primary = item.reasons[0] ?? null;
  const extra = item.reasons.slice(1);
  const screenshotSrc =
    item.lastFailure.screenshotLink ??
    item.reasons[0]?.screenshotLink ??
    null;
  const color = severityColor(item.failCount);

  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 12,
        border: "1px solid #e2e8f0",
        borderTop: `3px solid ${color}`,
        boxShadow: cardHovered
          ? "0 8px 28px rgba(0,0,0,0.13)"
          : "0 1px 4px rgba(0,0,0,0.07)",
        display: "flex",
        flexDirection: "row",
        overflow: "hidden",
        transition: "box-shadow 0.2s ease, transform 0.2s ease",
        transform: cardHovered ? "translateY(-2px)" : "translateY(0)",
      }}
      onMouseEnter={() => setCardHovered(true)}
      onMouseLeave={() => setCardHovered(false)}
    >
      {/* ── Left: Screenshot — full-height panel, 38% width ── */}
      <div
        style={{
          flex: "0 0 38%",
          minWidth: 380,
          alignSelf: "stretch",
          background: "#fff",
          borderRadius: "10px 0 0 10px",
          overflow: "hidden",
          position: "relative",
        }}
      >
        <ScreenshotPanel src={screenshotSrc} onClick={onImageClick} />
      </div>

      {/* ── Right: Data ── */}
      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          padding: "20px 28px",
          gap: 14,
          borderLeft: "1px solid #e2e8f0",
        }}
      >
        {/* Header: rank + test name + fail badge */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span
            style={{
              background: "#f1f5f9",
              color: "#64748b",
              borderRadius: 6,
              padding: "2px 8px",
              fontSize: 11,
              fontWeight: 700,
              flexShrink: 0,
              lineHeight: 1.5,
              marginTop: 2,
            }}
          >
            #{index + 1}
          </span>

          <span
            style={{
              fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
              fontSize: 13,
              fontWeight: 600,
              color: "#0f172a",
              flex: 1,
              minWidth: 0,
              wordBreak: "break-all",
              lineHeight: 1.5,
            }}
          >
            {item.testName}
          </span>

          <span
            style={{
              background: color,
              color: "#fff",
              borderRadius: 20,
              padding: "3px 12px",
              fontSize: 12,
              fontWeight: 700,
              flexShrink: 0,
              whiteSpace: "nowrap",
              lineHeight: 1.6,
            }}
          >
            {item.failCount} {item.failCount === 1 ? "failure" : "failures"}
          </span>
        </div>

        {/* Primary reason */}
        {primary && (
          <div>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: "#94a3b8",
                textTransform: "uppercase",
                letterSpacing: "0.07em",
                marginBottom: 7,
              }}
            >
              Primary Reason
            </div>
            <ReasonBlock
              reason={primary}
              label="Primary Reason"
              testName={item.testName}
              onExpandLog={(lines, label) =>
                onExpandLog(lines, item.testName, label)
              }
            />
          </div>
        )}

        {/* Additional reasons — MUI Collapse for smooth animation */}
        {extra.length > 0 && (
          <div>
            <Button
              size="small"
              variant="outlined"
              onClick={() => setMoreOpen((o) => !o)}
              endIcon={
                <KeyboardArrowDownIcon
                  sx={{
                    fontSize: "16px !important",
                    transition: "transform 0.25s ease",
                    transform: moreOpen ? "rotate(180deg)" : "rotate(0deg)",
                  }}
                />
              }
              sx={{
                borderColor: "#e2e8f0",
                color: "#64748b",
                fontSize: 12,
                textTransform: "none",
                py: "4px",
                px: "12px",
                minHeight: 0,
                "&:hover": {
                  borderColor: "#cbd5e1",
                  bgcolor: "#f8fafc",
                  color: "#475569",
                },
              }}
            >
              {moreOpen
                ? "Hide additional reasons"
                : `${extra.length} more reason${extra.length > 1 ? "s" : ""}`}
            </Button>

            <Collapse in={moreOpen}>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 16,
                  paddingTop: 14,
                }}
              >
                {extra.map((reason, i) => (
                  <div key={i}>
                    <div
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: "#94a3b8",
                        textTransform: "uppercase",
                        letterSpacing: "0.07em",
                        marginBottom: 7,
                      }}
                    >
                      Reason {i + 2}
                    </div>
                    <ReasonBlock
                      reason={reason}
                      label={`Reason ${i + 2}`}
                      testName={item.testName}
                      onExpandLog={(lines, label) =>
                        onExpandLog(lines, item.testName, label)
                      }
                    />
                  </div>
                ))}
              </div>
            </Collapse>
          </div>
        )}

        {/* Meta chips — MUI Chip */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 6,
            marginTop: "auto",
            paddingTop: 4,
            borderTop: "1px solid #f1f5f9",
          }}
        >
          {item.lastFailedOn && (
            <Chip
              label={`🕐 ${item.lastFailedOn}`}
              size="small"
              variant="outlined"
              sx={{ fontSize: 11, color: "#475569", borderColor: "#e2e8f0" }}
            />
          )}
          {item.lastFailure.server && (
            <Chip
              label={`🖥️ ${item.lastFailure.server}`}
              size="small"
              variant="outlined"
              sx={{ fontSize: 11, color: "#475569", borderColor: "#e2e8f0" }}
            />
          )}
          {item.lastFailure.almaVersion && (
            <Chip
              label={`📦 ${item.lastFailure.almaVersion}`}
              size="small"
              variant="outlined"
              sx={{ fontSize: 11, color: "#475569", borderColor: "#e2e8f0" }}
            />
          )}
          {(item.lastFailure.buildNumber ?? 0) > 0 && (
            <Chip
              label={`🔨 Build ${item.lastFailure.buildNumber}`}
              size="small"
              variant="outlined"
              sx={{ fontSize: 11, color: "#475569", borderColor: "#e2e8f0" }}
            />
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Main page ────────────────────────────────────────────────────────────────

const RecentFailuresPage: React.FC = () => {
  const { areaName } = useParams<{ areaName: string }>();
  const [searchParams] = useSearchParams();
  const env = (searchParams.get("env") ?? "qa") as EnvFilter;
  const navigate = useNavigate();

  const [data, setData] =
    useState<AreaRecentFailuresGroupedResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"failCount" | "lastFailedOn">(
    "failCount"
  );
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [logModal, setLogModal] = useState<{
    lines: string[];
    testName: string;
    label: string;
  } | null>(null);

  useEffect(() => {
    if (!areaName) return;
    setLoading(true);
    setError("");
    getAreaRecentFailuresGrouped(areaName, WINDOW_DAYS, LIMIT, env)
      .then(setData)
      .catch((e) =>
        setError(e instanceof Error ? e.message : "Failed to load failures")
      )
      .finally(() => setLoading(false));
  }, [areaName, env]);

  const items = useCallback(() => {
    if (!data) return [];
    let list = [...data.items];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((i) => i.testName.toLowerCase().includes(q));
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
      {imageSrc && (
        <ImageModal src={imageSrc} onClose={() => setImageSrc(null)} />
      )}

      {logModal && (
        <LogModal
          lines={logModal.lines}
          testName={logModal.testName}
          reasonLabel={logModal.label}
          onClose={() => setLogModal(null)}
        />
      )}

      {/* Sticky header */}
      <div
        style={{
          background: "#fff",
          borderBottom: "1px solid #e5e7eb",
          padding: "14px 32px",
          display: "flex",
          alignItems: "center",
          gap: 16,
          position: "sticky",
          top: 0,
          zIndex: 100,
          boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
        }}
      >
        <button
          onClick={() => navigate("/")}
          style={{
            background: "none",
            border: "1px solid #e2e8f0",
            borderRadius: 8,
            padding: "6px 14px",
            cursor: "pointer",
            fontSize: 13,
            color: "#64748b",
          }}
        >
          ← Dashboard
        </button>

        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: 18,
              fontWeight: 800,
              color: "#1e293b",
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            {areaName}
          </div>
          <div style={{ fontSize: 11, color: "#94a3b8" }}>
            Recent failures · last {WINDOW_DAYS} days · {env.toUpperCase()}
          </div>
        </div>

        {data && (
          <div
            style={{
              background: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: 10,
              padding: "6px 18px",
              textAlign: "center",
            }}
          >
            <div
              style={{ fontSize: 20, fontWeight: 800, color: "#dc2626" }}
            >
              {data.items.length}
            </div>
            <div style={{ fontSize: 11, color: "#ef4444" }}>failed tests</div>
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{ padding: "24px 40px" }}>
        {loading && (
          <div
            style={{ textAlign: "center", padding: 60, color: "#94a3b8" }}
          >
            <div style={{ fontSize: 32, marginBottom: 8 }}>⏳</div>
            <div>Loading failures...</div>
          </div>
        )}

        {!loading && error && (
          <div
            style={{
              background: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: 10,
              padding: 20,
              color: "#dc2626",
              textAlign: "center",
            }}
          >
            ❌ {error}
          </div>
        )}

        {!loading && !error && data?.items.length === 0 && (
          <div
            style={{
              background: "#f0fdf4",
              border: "1px solid #bbf7d0",
              borderRadius: 10,
              padding: 40,
              color: "#16a34a",
              textAlign: "center",
              fontSize: 16,
            }}
          >
            🎉 No failures found in the last {WINDOW_DAYS} days!
          </div>
        )}

        {!loading && !error && data && data.items.length > 0 && (
          <>
            {/* Search + sort bar */}
            <div
              style={{
                display: "flex",
                gap: 12,
                marginBottom: 20,
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              <input
                type="text"
                placeholder="🔍  Search by test name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  flex: 1,
                  minWidth: 220,
                  border: "1px solid #e2e8f0",
                  borderRadius: 8,
                  padding: "8px 14px",
                  fontSize: 13,
                  outline: "none",
                  background: "#fff",
                  color: "#1e293b",
                }}
              />
              <select
                value={sortBy}
                onChange={(e) =>
                  setSortBy(e.target.value as typeof sortBy)
                }
                style={{
                  border: "1px solid #e2e8f0",
                  borderRadius: 8,
                  padding: "8px 14px",
                  fontSize: 13,
                  outline: "none",
                  background: "#fff",
                  color: "#475569",
                  cursor: "pointer",
                }}
              >
                <option value="failCount">Sort: failure count</option>
                <option value="lastFailedOn">Sort: last failed</option>
              </select>
              <span style={{ fontSize: 13, color: "#94a3b8" }}>
                {items.length} results
              </span>
            </div>

            {/* Card list */}
            <div
              style={{ display: "flex", flexDirection: "column", gap: 14 }}
            >
              {items.map((item, i) => (
                <FailureCard
                  key={item.testName}
                  item={item}
                  index={i}
                  onImageClick={setImageSrc}
                  onExpandLog={(lines, testName, label) =>
                    setLogModal({ lines, testName, label })
                  }
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default RecentFailuresPage;
