import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box, Typography, Button, Chip, Collapse, Paper, Alert, CircularProgress,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import BrokenImageIcon from "@mui/icons-material/BrokenImage";
import ZoomInIcon from "@mui/icons-material/ZoomIn";

import EnvToggle from "../components/EnvToggle";
import ThemeToggle from "../components/ThemeToggle";
import ImageModal from "../components/ImageModal";
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
      <Box key={i} sx={{
        display: "block",
        background: isFatal ? "rgba(239,68,68,0.15)" : "transparent",
        color: isFatal ? "#fca5a5" : "#cbd5e1",
        fontWeight: isFatal ? 700 : "normal",
        borderLeft: isFatal ? "3px solid #ef4444" : "3px solid transparent",
        padding: "1px 8px",
        lineHeight: 1.55,
      }}>
        {line || " "}
      </Box>
    );
  });
}

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
      <Box sx={{
        width: 220, flexShrink: 0, alignSelf: "stretch",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: 1,
        bgcolor: "background.default", borderRight: 1, borderColor: "divider",
        borderRadius: "10px 0 0 0",
      }}>
        <BrokenImageIcon sx={{ fontSize: 32, color: "text.disabled" }} />
        <Typography sx={{ fontSize: 11, color: "text.secondary", textAlign: "center", lineHeight: 1.4, px: 1.5 }}>
          No screenshot
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        width: 220, flexShrink: 0, alignSelf: "stretch",
        position: "relative", overflow: "hidden",
        background: "#0f172a",
        borderRight: "1px solid #1e293b",
        borderRadius: "10px 0 0 0",
        cursor: "zoom-in",
      }}
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
          objectFit: "cover", objectPosition: "top",
          display: "block",
          transition: "transform 0.22s ease",
          transform: hovered ? "scale(1.06)" : "scale(1)",
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
        <ZoomInIcon sx={{ fontSize: 32, color: "#fff" }} />
      </Box>
      <Box sx={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        background: "linear-gradient(transparent, rgba(15,23,42,0.85))",
        padding: "16px 8px 6px",
        fontSize: 10, color: "#94a3b8", textAlign: "center",
        opacity: hovered ? 0 : 1,
        transition: "opacity 0.18s ease",
        pointerEvents: "none",
      }}>
        Click to zoom
      </Box>
    </Box>
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
  const color = severityColor(cluster.occurrenceCount);
  const previewLines = extractPreviewLines(cluster.failureText);

  const screenshotSrc =
    cluster.examples.find(ex => ex.screenshotLink)?.screenshotLink ?? null;

  return (
    <Paper
      variant="outlined"
      sx={{
        borderRadius: 3,
        borderTop: `3px solid ${color}`,
        boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
        transition: "box-shadow 0.2s ease, transform 0.2s ease",
        "&:hover": { boxShadow: "0 8px 28px rgba(0,0,0,0.13)", transform: "translateY(-2px)" },
        overflow: "hidden",
        display: "flex",
        flexDirection: "row",
      }}
    >
      {/* Screenshot panel — left column */}
      <ScreenshotThumbnail src={screenshotSrc} onClick={onImageClick} />

      {/* Right column */}
      <Box sx={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>

        {/* Card header */}
        <Box sx={{ p: "18px 24px 14px", display: "flex", flexDirection: "column", gap: 1.5 }}>

          {/* Top row */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, flexWrap: "wrap" }}>
            <Box component="span" sx={{
              bgcolor: "action.hover", color: "text.secondary", borderRadius: "6px",
              px: 1, py: "2px", fontSize: 11, fontWeight: 700, flexShrink: 0, lineHeight: 1.5,
            }}>#{index + 1}</Box>

            <Box component="span" sx={{
              bgcolor: color, color: "#fff", borderRadius: 20,
              px: 1.5, py: "3px", fontSize: 12, fontWeight: 700,
              flexShrink: 0, whiteSpace: "nowrap", lineHeight: 1.6,
            }}>
              {cluster.occurrenceCount} occurrences
            </Box>

            <Box sx={{ display: "flex", gap: 0.625, flexWrap: "wrap", ml: 0.5 }}>
              {cluster.affectedAreas.map(area => (
                <Chip
                  key={area}
                  label={area}
                  size="small"
                  variant="outlined"
                  sx={{ fontSize: 10, height: 20, borderColor: "divider", color: "text.secondary" }}
                />
              ))}
            </Box>
          </Box>

          {/* Failure text preview (dark log block) */}
          <Box sx={{ background: "#0f172a", borderRadius: 2, border: "1px solid #1e293b", overflow: "hidden" }}>
            <Box sx={{ maxHeight: 130, overflowY: "auto", py: 0.75 }}>
              <Box sx={{ fontFamily: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace", fontSize: 11 }}>
                {renderPreviewLines(previewLines)}
              </Box>
            </Box>
          </Box>

          {/* Expand toggle */}
          <Button
            size="small"
            variant="outlined"
            onClick={() => setExpanded(o => !o)}
            endIcon={<KeyboardArrowDownIcon sx={{
              fontSize: "16px !important",
              transition: "transform 0.22s ease",
              transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
            }} />}
            sx={{
              alignSelf: "flex-start",
              borderColor: "divider", color: "text.secondary",
              fontSize: 12, textTransform: "none", py: "5px", px: 1.5, minHeight: 0,
              "&:hover": { borderColor: "text.disabled", color: "text.primary", bgcolor: "action.hover" },
            }}
          >
            {expanded ? "Hide details" : `Show details · ${cluster.examples.length} example${cluster.examples.length !== 1 ? "s" : ""}`}
          </Button>
        </Box>

        {/* Expanded section */}
        <Collapse in={expanded} unmountOnExit>
          <Box sx={{
            borderTop: 1, borderColor: "divider",
            p: "16px 24px 20px",
            bgcolor: "background.default",
            display: "flex", flexDirection: "column", gap: 2,
          }}>
            <Box>
              <Typography sx={{
                fontSize: 10, fontWeight: 700, color: "text.secondary",
                textTransform: "uppercase", letterSpacing: "0.07em", mb: 0.875,
              }}>
                Example Tests
              </Typography>
              <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
                {cluster.examples.map((ex, i) => (
                  <Box key={i} sx={{
                    display: "flex", alignItems: "center", gap: 1.25,
                    px: 2, py: 1.25,
                    borderBottom: i < cluster.examples.length - 1 ? 1 : 0,
                    borderColor: "divider",
                  }}>
                    <Box component="span" sx={{
                      bgcolor: "action.hover", color: "text.secondary",
                      borderRadius: "4px", px: 0.875, py: "2px",
                      fontSize: 10, fontWeight: 700, flexShrink: 0, letterSpacing: "0.04em",
                      border: 1, borderColor: "divider",
                    }}>{ex.area}</Box>

                    <Typography component="span" sx={{
                      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                      fontSize: 12, color: "text.primary",
                      flex: 1, minWidth: 0, wordBreak: "break-all",
                    }}>
                      {ex.testName}
                    </Typography>

                    <Box sx={{ display: "flex", gap: 0.75, flexShrink: 0 }}>
                      {ex.logLink && (
                        <Button size="small" startIcon={<OpenInNewIcon sx={{ fontSize: "12px !important" }} />}
                          href={ex.logLink} target="_blank" rel="noopener noreferrer"
                          sx={{ minWidth: 0, fontSize: 11, textTransform: "none", color: "text.secondary", "&:hover": { color: "text.primary" } }}>
                          Log
                        </Button>
                      )}
                      {ex.screenshotLink && (
                        <Button size="small" startIcon={<OpenInNewIcon sx={{ fontSize: "12px !important" }} />}
                          href={ex.screenshotLink} target="_blank" rel="noopener noreferrer"
                          sx={{ minWidth: 0, fontSize: 11, textTransform: "none", color: "text.secondary", "&:hover": { color: "text.primary" } }}>
                          Screenshot
                        </Button>
                      )}
                    </Box>
                  </Box>
                ))}
              </Paper>
            </Box>
          </Box>
        </Collapse>
      </Box>
    </Paper>
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
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      {imageSrc && <ImageModal src={imageSrc} onClose={() => setImageSrc(null)} />}

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
          sx={{ borderColor: "divider", color: "text.secondary", textTransform: "none", "&:hover": { borderColor: "text.disabled" } }}
        >
          Dashboard
        </Button>

        <Box sx={{ flex: 1 }}>
          <Typography sx={{ fontSize: 26, fontWeight: 900, color: "text.primary", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "-0.02em", lineHeight: 1.15 }}>
            Common Failures
          </Typography>
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            Last 24 hours · {env.toUpperCase()} · patterns appearing more than 4 times
          </Typography>
        </Box>

        <EnvToggle value={env} onChange={handleEnvChange} />

        {!loading && !error && (
          <Box sx={{ bgcolor: "#fef2f2", border: "1px solid #fecaca", borderRadius: 2.5, px: 2.25, py: 0.75, textAlign: "center" }}>
            <Typography sx={{ fontSize: 20, fontWeight: 800, color: "#dc2626" }}>{clusters.length}</Typography>
            <Typography sx={{ fontSize: 11, color: "#ef4444" }}>patterns</Typography>
          </Box>
        )}

        <ThemeToggle />
      </Box>

      {/* ── Content ── */}
      <Box sx={{ p: "24px 40px" }}>

        {loading && (
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1.5, py: 8, color: "text.secondary" }}>
            <CircularProgress size={28} />
            <Typography>Loading common failures…</Typography>
          </Box>
        )}

        {!loading && error && <Alert severity="error">{error}</Alert>}

        {!loading && !error && clusters.length === 0 && (
          <Alert severity="success">🎉 No common failures in the last 24 hours!</Alert>
        )}

        {!loading && !error && clusters.length > 0 && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.75 }}>
            {clusters.map((cluster, i) => (
              <ClusterCard key={i} cluster={cluster} index={i} onImageClick={setImageSrc} />
            ))}
          </Box>
        )}

      </Box>
    </Box>
  );
};

export default CommonFailuresPage;
