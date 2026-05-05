import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Chip from "@mui/material/Chip";
import Collapse from "@mui/material/Collapse";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import BrokenImageIcon from "@mui/icons-material/BrokenImage";
import ZoomInIcon from "@mui/icons-material/ZoomIn";

import EnvToggle from "../components/EnvToggle";
import { getCommonFailures, type EnvFilter } from "../services/apiService";
import type { CommonFailureCluster } from "../types/CommonFailures";

// ─── Severity helpers ─────────────────────────────────────────────────────────

function severityColor(count: number): string {
  if (count >= 30) return "#dc2626";
  if (count >= 15) return "#ea580c";
  if (count >= 8)  return "#f59e0b";
  return "#ef4444";
}

// ─── Failure text preview ─────────────────────────────────────────────────────

function extractPreviewLines(text: string): string[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim() !== "");
  let fatalIdx = -1;
  for (let i = lines.length - 1; i >= 0; i--) {
    if (lines[i].toUpperCase().includes("FATAL")) { fatalIdx = i; break; }
  }
  if (fatalIdx === -1) return lines.slice(Math.max(0, lines.length - 4));
  return lines.slice(Math.max(0, fatalIdx - 2), fatalIdx + 1);
}

function renderPreviewLines(lines: string[]) {
  return lines.map((line, i) => {
    const isFatal = line.toUpperCase().includes("FATAL");
    return (
      <div key={i} style={{
        display: "block",
        background: isFatal ? "rgba(239,68,68,0.15)" : "transparent",
        color: isFatal ? "#fca5a5" : "#cbd5e1",
        fontWeight: isFatal ? 700 : "normal",
        borderLeft: isFatal ? "3px solid #ef4444" : "3px solid transparent",
        padding: "1px 8px",
        lineHeight: 1.55,
      }}>
        {line || "\u00A0"}
      </div>
    );
  });
}

// ─── Image modal ──────────────────────────────────────────────────────────────

const ImageModal: React.FC<{ src: string; onClose: () => void }> = ({ src, onClose }) => (
  <div onClick={onClose} style={{
    position: "fixed", inset: 0, zIndex: 1300,
    background: "rgba(0,0,0,0.9)",
    display: "flex", alignItems: "center", justifyContent: "center",
    cursor: "zoom-out",
  }}>
    <div onClick={e => e.stopPropagation()} style={{ position: "relative" }}>
      <img src={src} alt="failure screenshot" style={{
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

// ─── Screenshot thumbnail ─────────────────────────────────────────────────────

interface ScreenshotThumbnailProps {
  src: string | null;
  onClick: (src: string) => void;
}

const ScreenshotThumbnail: React.FC<ScreenshotThumbnailProps> = ({ src, onClick }) => {
  const [errored, setErrored] = useState(false);
  const [hovered, setHovered] = useState(false);
  const missing = !src || errored;

  if (missing) {
    return (
      <div style={{
        width: 220, flexShrink: 0, alignSelf: "stretch",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: 8,
        background: "#f8fafc", borderRight: "1px solid #e2e8f0",
        borderRadius: "10px 0 0 0",
      }}>
        <BrokenImageIcon sx={{ fontSize: 32, color: "#cbd5e1" }} />
        <span style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", lineHeight: 1.4, padding: "0 12px" }}>
          No screenshot
        </span>
      </div>
    );
  }

  return (
    <div
      style={{
        width: 220, flexShrink: 0, alignSelf: "stretch",
        position: "relative", overflow: "hidden",
        background: "#0f172a",
        borderRight: "1px solid #1e293b",
        borderRadius: "10px 0 0 0",
        cursor: "zoom-in",
      }}
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
          objectFit: "cover", objectPosition: "top",
          display: "block",
          transition: "transform 0.22s ease",
          transform: hovered ? "scale(1.06)" : "scale(1)",
        }}
      />
      {/* Zoom overlay */}
      <div style={{
        position: "absolute", inset: 0,
        background: "rgba(15,23,42,0.52)",
        display: "flex", alignItems: "center", justifyContent: "center",
        opacity: hovered ? 1 : 0,
        transition: "opacity 0.18s ease",
        pointerEvents: "none",
      }}>
        <ZoomInIcon sx={{ fontSize: 32, color: "#fff" }} />
      </div>
      {/* "Click to zoom" label at bottom */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        background: "linear-gradient(transparent, rgba(15,23,42,0.85))",
        padding: "16px 8px 6px",
        fontSize: 10, color: "#94a3b8", textAlign: "center",
        opacity: hovered ? 0 : 1,
        transition: "opacity 0.18s ease",
        pointerEvents: "none",
      }}>
        Click to zoom
      </div>
    </div>
  );
};

// ─── Cluster card ─────────────────────────────────────────────────────────────

interface ClusterCardProps {
  cluster: CommonFailureCluster;
  index: number;
  onImageClick: (src: string) => void;
}

const ClusterCard: React.FC<ClusterCardProps> = ({ cluster, index, onImageClick }) => {
  const [expanded, setExpanded] = useState(false);
  const [cardHovered, setCardHovered] = useState(false);
  const color = severityColor(cluster.occurrenceCount);
  const previewLines = extractPreviewLines(cluster.failureText);

  // Pick the first screenshot available across examples
  const screenshotSrc =
    cluster.examples.find(ex => ex.screenshotLink)?.screenshotLink ?? null;

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
        transition: "box-shadow 0.2s ease, transform 0.2s ease",
        transform: cardHovered ? "translateY(-2px)" : "translateY(0)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "row",
      }}
      onMouseEnter={() => setCardHovered(true)}
      onMouseLeave={() => setCardHovered(false)}
    >
      {/* Screenshot panel — left column */}
      <ScreenshotThumbnail src={screenshotSrc} onClick={onImageClick} />

      {/* Right column: all existing card content */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>

      {/* Card header */}
      <div style={{ padding: "18px 24px 14px", display: "flex", flexDirection: "column", gap: 12 }}>

        {/* Top row: index + count badge + areas */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span style={{
            background: "#f1f5f9", color: "#64748b", borderRadius: 6,
            padding: "2px 8px", fontSize: 11, fontWeight: 700,
            flexShrink: 0, lineHeight: 1.5,
          }}>#{index + 1}</span>

          <span style={{
            background: color, color: "#fff", borderRadius: 20,
            padding: "3px 12px", fontSize: 12, fontWeight: 700,
            flexShrink: 0, whiteSpace: "nowrap", lineHeight: 1.6,
          }}>
            {cluster.occurrenceCount} occurrences
          </span>

          <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginLeft: 4 }}>
            {cluster.affectedAreas.map(area => (
              <Chip
                key={area}
                label={area}
                size="small"
                variant="outlined"
                sx={{ fontSize: 10, height: 20, borderColor: "#e2e8f0", color: "#475569" }}
              />
            ))}
          </div>
        </div>

        {/* Failure text preview */}
        <div style={{
          background: "#0f172a", borderRadius: 8,
          border: "1px solid #1e293b", overflow: "hidden",
        }}>
          <div style={{ maxHeight: 130, overflowY: "auto", padding: "6px 0" }}>
            <div style={{ fontFamily: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace", fontSize: 11 }}>
              {renderPreviewLines(previewLines)}
            </div>
          </div>
        </div>

        {/* Expand toggle */}
        <button
          onClick={() => setExpanded(o => !o)}
          style={{
            display: "flex", alignItems: "center", gap: 5,
            alignSelf: "flex-start",
            background: "none", border: "1px solid #e2e8f0",
            borderRadius: 8, padding: "5px 12px",
            cursor: "pointer", fontSize: 12, color: "#64748b",
            transition: "border-color 0.15s, color 0.15s",
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = "#cbd5e1";
            e.currentTarget.style.color = "#475569";
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = "#e2e8f0";
            e.currentTarget.style.color = "#64748b";
          }}
        >
          {expanded ? "Hide details" : `Show details · ${cluster.examples.length} example${cluster.examples.length !== 1 ? "s" : ""}`}
          <KeyboardArrowDownIcon sx={{
            fontSize: 16, color: "inherit",
            transition: "transform 0.22s ease",
            transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
          }} />
        </button>
      </div>

      {/* Expanded section */}
      <Collapse in={expanded} unmountOnExit>
        <div style={{
          borderTop: "1px solid #f1f5f9",
          padding: "16px 24px 20px",
          background: "#f8fafc",
          display: "flex", flexDirection: "column", gap: 16,
        }}>
          {/* Example tests */}
          <div>
            <div style={{
              fontSize: 10, fontWeight: 700, color: "#94a3b8",
              textTransform: "uppercase", letterSpacing: "0.07em",
              marginBottom: 7,
            }}>
              Example Tests
            </div>
            <div style={{
              background: "#fff", border: "1px solid #e2e8f0",
              borderRadius: 8, overflow: "hidden",
            }}>
              {cluster.examples.map((ex, i) => (
                <div key={i} style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "10px 16px",
                  borderBottom: i < cluster.examples.length - 1 ? "1px solid #f1f5f9" : "none",
                }}>
                  <span style={{
                    background: "#f1f5f9", color: "#475569",
                    borderRadius: 4, padding: "2px 7px",
                    fontSize: 10, fontWeight: 700,
                    flexShrink: 0, letterSpacing: "0.04em",
                    border: "1px solid #e2e8f0",
                  }}>{ex.area}</span>

                  <span style={{
                    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                    fontSize: 12, color: "#0f172a",
                    flex: 1, minWidth: 0, wordBreak: "break-all",
                  }}>
                    {ex.testName}
                  </span>

                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    {ex.logLink && (
                      <a
                        href={ex.logLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 11, color: "#64748b", textDecoration: "none" }}
                        onMouseEnter={e => (e.currentTarget.style.color = "#0f172a")}
                        onMouseLeave={e => (e.currentTarget.style.color = "#64748b")}
                      >
                        <OpenInNewIcon sx={{ fontSize: 12 }} /> Log
                      </a>
                    )}
                    {ex.screenshotLink && (
                      <a
                        href={ex.screenshotLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 11, color: "#64748b", textDecoration: "none" }}
                        onMouseEnter={e => (e.currentTarget.style.color = "#0f172a")}
                        onMouseLeave={e => (e.currentTarget.style.color = "#64748b")}
                      >
                        <OpenInNewIcon sx={{ fontSize: 12 }} /> Screenshot
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Collapse>
      </div>{/* end right column */}
    </div>
  );
};

// ─── Main page ────────────────────────────────────────────────────────────────

const CommonFailuresPage: React.FC = () => {
  const navigate = useNavigate();

  const [env, setEnv] = useState<EnvFilter>(
    () => (localStorage.getItem("selectedEnv") as EnvFilter) ?? "qa"
  );
  const [clusters, setClusters] = useState<CommonFailureCluster[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [imageSrc, setImageSrc] = useState<string | null>(null);

  const handleEnvChange = (e: EnvFilter) => {
    setEnv(e);
    localStorage.setItem("selectedEnv", e);
  };

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const data = await getCommonFailures(env);
      setClusters(data.clusters);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load common failures");
    } finally {
      setLoading(false);
    }
  }, [env]);

  useEffect(() => { load(); }, [load]);

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc" }}>
      {imageSrc && <ImageModal src={imageSrc} onClose={() => setImageSrc(null)} />}

      {/* ── Sticky header ── */}
      <div style={{
        background: "#fff", borderBottom: "1px solid #e5e7eb",
        padding: "14px 32px",
        display: "flex", alignItems: "center", gap: 16,
        position: "sticky", top: 0, zIndex: 100,
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
      }}>
        <button
          onClick={() => navigate("/")}
          style={{
            background: "none", border: "1px solid #e2e8f0",
            borderRadius: 8, padding: "6px 14px",
            cursor: "pointer", fontSize: 13, color: "#64748b",
          }}
        >
          ← Dashboard
        </button>

        <div style={{ flex: 1 }}>
          <div style={{
            fontSize: 26, fontWeight: 900, color: "#0f172a",
            fontFamily: "'JetBrains Mono', monospace",
            letterSpacing: "-0.02em", lineHeight: 1.15,
          }}>
            Common Failures
          </div>
          <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 3 }}>
            Last 24 hours · {env.toUpperCase()} · patterns appearing more than 4 times
          </div>
        </div>

        <EnvToggle value={env} onChange={handleEnvChange} />

        {!loading && !error && (
          <div style={{
            background: "#fef2f2", border: "1px solid #fecaca",
            borderRadius: 10, padding: "6px 18px", textAlign: "center",
          }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#dc2626" }}>{clusters.length}</div>
            <div style={{ fontSize: 11, color: "#ef4444" }}>patterns</div>
          </div>
        )}
      </div>

      {/* ── Content ── */}
      <div style={{ padding: "24px 40px" }}>

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: "center", padding: 60, color: "#94a3b8" }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>⏳</div>
            <div>Loading common failures...</div>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div style={{
            background: "#fef2f2", border: "1px solid #fecaca",
            borderRadius: 10, padding: 20, color: "#dc2626", textAlign: "center",
          }}>
            ❌ {error}
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && clusters.length === 0 && (
          <div style={{
            background: "#f0fdf4", border: "1px solid #bbf7d0",
            borderRadius: 10, padding: 40, color: "#16a34a",
            textAlign: "center", fontSize: 16,
          }}>
            🎉 No common failures in the last 24 hours!
          </div>
        )}

        {/* Clusters */}
        {!loading && !error && clusters.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {clusters.map((cluster, i) => (
              <ClusterCard key={i} cluster={cluster} index={i} onImageClick={setImageSrc} />
            ))}
          </div>
        )}

      </div>
    </div>
  );
};

export default CommonFailuresPage;
