import React, { useState } from "react";
import { Box, Typography, Button, Card, CardContent, Chip, Collapse, CircularProgress } from "@mui/material";
import TerminalIcon from "@mui/icons-material/Terminal";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import HistoryIcon from "@mui/icons-material/History";
import ScreenshotPanel from "./ScreenshotPanel";
import InlineNotes from "./InlineNotes";
import { useNotes } from "../hooks/useNotes";
import {
  WINDOW_DAYS,
  renderLogLines,
  truncateLogToTestScope,
  extractFatalPreview,
  dateOnly,
  severityColor,
} from "./failureHelpers";
import { getExpandedLog } from "../services/apiService";
import type { RecentFailureGroupedItem, ReasonEntry } from "../types/RecentFailuresGrouped";
import type { LatestFailedTestItem } from "../types/LatestFailed";

// ─── Adapter: LatestFailedTestItem → RecentFailureGroupedItem ─────────────────

export function latestFailedToGroupedItem(item: LatestFailedTestItem): RecentFailureGroupedItem {
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

// ─── Reason block ─────────────────────────────────────────────────────────────

interface ReasonBlockProps {
  reason: ReasonEntry;
  label: string;
  testName: string;
  onExpandLog: (lines: string[], label: string) => void;
  extraActions?: React.ReactNode;
  /** Primary reason hides its notes here because they render under the test name. */
  hideNotes?: boolean;
}

const ReasonBlock: React.FC<ReasonBlockProps> = ({ reason, label, testName, onExpandLog, extraActions, hideNotes }) => {
  const previewLines = extractFatalPreview(reason.text ?? "");
  const [logLoading, setLogLoading] = useState(false);

  const handleExpandLog = async () => {
    // No remote log link — fall back to the locally stored failure text.
    if (!reason.logLink) {
      onExpandLog(truncateLogToTestScope(reason.text, testName), label);
      return;
    }
    setLogLoading(true);
    try {
      const res = await getExpandedLog(reason.logLink, testName);
      if (res.available) onExpandLog(res.lines, label);
      else onExpandLog([res.error], label);
    } catch (e) {
      onExpandLog([e instanceof Error ? e.message : "Failed to load log."], label);
    } finally {
      setLogLoading(false);
    }
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
      <Box sx={{ bgcolor: "#000000", borderRadius: 2, border: "1px solid #1e293b", overflow: "hidden" }}>
        <Box sx={{ maxHeight: 170, overflowY: "auto", py: 0.75 }}>
          <Box sx={{ fontFamily: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace", fontSize: 11 }}>
            {renderLogLines(previewLines)}
          </Box>
        </Box>
      </Box>
      <Box sx={{ display: "flex", gap: 0.875, flexWrap: "wrap" }}>
        <Button
          size="small" variant="outlined"
          disabled={logLoading}
          startIcon={logLoading
            ? <CircularProgress size={12} sx={{ color: "inherit" }} />
            : <TerminalIcon sx={{ fontSize: "13px !important" }} />}
          onClick={handleExpandLog}
          sx={{
            borderColor: "#334155", color: "text.secondary", fontSize: 11, textTransform: "none", py: "3px", px: "10px", minHeight: 0, lineHeight: 1.4,
            "&:hover": { borderColor: "#64748b", color: "#e2e8f0", bgcolor: "#1e293b" }
          }}
        >
          {logLoading ? "Loading…" : "Expand Log"}
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
        {extraActions}
      </Box>

      {/* Notes for THIS specific reason — its own block directly below the reason. */}
      {!hideNotes && (
        <div style={{ display: "block", marginTop: "8px", textAlign: "left" }}>
          <InlineNotes testName={testName} failureReason={reason.text ?? "General"} />
        </div>
      )}
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
  testRailUrl?: string | null;
  areaName?: string;
  /** Reason this card is grouped under (By Reason tab) — surfaces cascaded global notes. */
  reasonContext?: string;
}

const FailureCard: React.FC<FailureCardProps> = ({ item, index, onImageClick, onExpandLog, onOpenHistory, testRailUrl, reasonContext }) => {
  const [moreOpen, setMoreOpen] = useState(false);
  const primary = item.reasons[0] ?? null;
  const extra = item.reasons.slice(1, 3);
  const screenshotSrc = item.reasons[0]?.screenshotLink ?? item.lastFailure.screenshotLink ?? null;
  const color = severityColor(item.failCount);

  // DEBUG: surface the exact reason strings so we can see why cross-tab matching fails.
  const { notes } = useNotes();
  console.log("DEBUG REASON MATCH:", {
    testName: item.testName,
    testReason: item.reasons.map((r) => r.text),
    reasonContext,
    globalNotes: notes.filter((n) => n.testName === null).map((n) => ({ failureReason: n.failureReason, noteContent: n.noteContent })),
  });

  // History + TestRail, rendered alongside Expand Log / Full Log in a single row.
  const actionButtons = (
    <>
      <Button
        size="small"
        variant="outlined"
        startIcon={<HistoryIcon sx={{ fontSize: "13px !important" }} />}
        onClick={onOpenHistory}
        sx={{
          borderColor: "#cbd5e1", color: "#475569", fontSize: 11, textTransform: "none",
          py: "3px", px: "10px", minHeight: 0, lineHeight: 1.4,
          "&:hover": { borderColor: "#94a3b8", bgcolor: "background.paper", color: "text.primary" },
        }}
      >
        History
      </Button>
      {testRailUrl && (
        <Button
          size="small"
          variant="outlined"
          startIcon={<OpenInNewIcon sx={{ fontSize: "13px !important" }} />}
          href={testRailUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          sx={{
            borderColor: "#cbd5e1", color: "#475569", fontSize: 11, textTransform: "none",
            py: "3px", px: "10px", minHeight: 0, lineHeight: 1.4,
            "&:hover": { borderColor: "#94a3b8", bgcolor: "background.paper", color: "text.primary" },
          }}
        >
          TestRail
        </Button>
      )}
    </>
  );

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
      <Box sx={{ flex: "0 0 38%", minWidth: 380, alignSelf: "stretch", bgcolor: "background.paper", borderRadius: "10px 0 0 10px", overflow: "hidden", position: "relative" }}>
        <ScreenshotPanel src={screenshotSrc} onClick={onImageClick} />
      </Box>

      {/* Data panel */}
      <CardContent sx={{
        flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 1.75,
        py: 2.5, px: 3.5, borderLeft: 1, borderColor: "divider",
        "&:last-child": { pb: 2.5 },
      }}>
        {/* Header row */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, flexWrap: "wrap" }}>
          <Typography component="span" sx={{ bgcolor: "action.hover", color: "text.secondary", borderRadius: "6px", px: 1, py: "2px", fontSize: 11, fontWeight: 700, flexShrink: 0, lineHeight: 1.5 }}>
            #{index + 1}
          </Typography>
          <Typography sx={{ fontFamily: "'JetBrains Mono', 'Fira Code', monospace", fontSize: 13, fontWeight: 600, color: "text.primary", flex: 1, minWidth: 0, wordBreak: "break-all", lineHeight: 1.5 }}>
            {item.testName}
          </Typography>
          {item.lastFailure.server && (
            <Chip label={`🖥️ ${item.lastFailure.server}`} size="small" variant="outlined" sx={{ fontSize: 11, color: "text.secondary", borderColor: "divider", flexShrink: 0 }} />
          )}
          {item.lastFailure.almaVersion && (
            <Chip label={`📦 ${item.lastFailure.almaVersion}`} size="small" variant="outlined" sx={{ fontSize: 11, color: "text.secondary", borderColor: "divider", flexShrink: 0 }} />
          )}
          <Box component="span" sx={{ bgcolor: color, color: "#fff", borderRadius: 20, px: 1.5, py: "3px", fontSize: 12, fontWeight: 700, flexShrink: 0, whiteSpace: "nowrap", lineHeight: 1.6 }}>
            Failed {item.failCount} {item.failCount === 1 ? "time" : "times"} in {WINDOW_DAYS} days
          </Box>
        </Box>

        {/* Add Note for the main test — its own block directly below the title. */}
        {reasonContext && !item.reasons.some((r) => (r.text ?? "General") === reasonContext) ? (
          <div style={{ display: "block", marginTop: "8px", textAlign: "left" }}>
            <InlineNotes testName={item.testName} failureReason={reasonContext} />
          </div>
        ) : item.reasons.length === 0 ? (
          <div style={{ display: "block", marginTop: "8px", textAlign: "left" }}>
            <InlineNotes testName={item.testName} failureReason="General" />
          </div>
        ) : (
          <div style={{ display: "block", marginTop: "8px", textAlign: "left" }}>
            <InlineNotes testName={item.testName} failureReason={item.reasons[0]?.text ?? "General"} />
          </div>
        )}

        {/* Primary reason — its action row also hosts History + TestRail so all
            buttons (Expand Log, Full Log, History, TR) sit side by side. */}
        {primary ? (
          <Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.875 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary", textTransform: "uppercase", letterSpacing: "0.07em" }}>
                Primary Reason
              </Typography>
              {primary.lastDate && (
                <Typography variant="caption" sx={{ fontWeight: 600, color: "text.secondary", bgcolor: "action.hover", borderRadius: "4px", px: 0.875, py: "1px", border: 1, borderColor: "divider" }}>
                  📅 {dateOnly(primary.lastDate)}
                </Typography>
              )}
            </Box>
            <ReasonBlock reason={primary} label="Primary Reason" testName={item.testName}
              onExpandLog={(lines, label) => onExpandLog(lines, item.testName, label)}
              extraActions={actionButtons} hideNotes />
          </Box>
        ) : (
          <Box sx={{ display: "flex", gap: 0.875, flexWrap: "wrap", pt: 0.5 }}>
            {actionButtons}
          </Box>
        )}

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
                      <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary", textTransform: "uppercase", letterSpacing: "0.07em" }}>
                        Reason {i + 2}
                      </Typography>
                      {reason.lastDate && (
                        <Typography variant="caption" sx={{ fontWeight: 600, color: "text.secondary", bgcolor: "action.hover", borderRadius: "4px", px: 0.875, py: "1px", border: 1, borderColor: "divider" }}>
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
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, mt: "auto", pt: 0.5, borderTop: 1, borderColor: "divider" }}>
          {(item.lastFailure.buildNumber ?? 0) > 0 && (
            <Chip label={`🔨 Build ${item.lastFailure.buildNumber}`} size="small" variant="outlined"
              sx={{ fontSize: 11, color: "text.secondary", borderColor: "divider" }} />
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

export default FailureCard;
