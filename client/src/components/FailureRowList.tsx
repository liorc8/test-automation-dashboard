import React, { useState } from "react";
import { Box, Typography, Button, Paper, Collapse, IconButton, Tooltip } from "@mui/material";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import HistoryIcon from "@mui/icons-material/History";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import FailureCard from "./FailureCard";
import InlineNotes from "./InlineNotes";
import type { RecentFailureGroupedItem } from "../types/RecentFailuresGrouped";

interface FailureRowListProps {
  items: RecentFailureGroupedItem[];
  onImageClick: (src: string) => void;
  onExpandLog: (lines: string[], testName: string, label: string) => void;
  onOpenHistory: (testName: string) => void;
  testRailUrlFor: (testName: string) => string | null;
  areaName?: string;
  /** Reason this list is grouped under (By Reason tab) — cascades global notes to rows. */
  reasonContext?: string;
}

/** Compact, expandable list of failures (same look as the List View tab). */
const FailureRowList: React.FC<FailureRowListProps> = ({
  items, onImageClick, onExpandLog, onOpenHistory, testRailUrlFor, areaName, reasonContext,
}) => {
  const [openTestName, setOpenTestName] = useState<string | null>(null);

  return (
    <Paper variant="outlined" sx={{ borderTop: "none", borderRadius: "0 0 8px 8px", overflow: "hidden" }}>
      {items.map((item, idx) => {
        const isOpen = openTestName === item.testName;
        const isLast = idx === items.length - 1;
        const trUrl = testRailUrlFor(item.testName);

        return (
          <Box key={item.testName}>
            <Box
              onClick={() => setOpenTestName(prev => (prev === item.testName ? null : item.testName))}
              sx={{
                display: "flex", alignItems: "center", gap: 1.25,
                px: 2, py: 1.375,
                borderBottom: (!isLast || isOpen) ? 1 : 0,
                borderColor: "divider",
                cursor: "pointer",
                bgcolor: isOpen ? "action.hover" : "transparent",
                transition: "background 0.15s",
                userSelect: "none",
                "&:hover": { bgcolor: "action.hover" },
              }}
            >
              <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "#ef4444", flexShrink: 0 }} />
              <Typography sx={{ fontFamily: "'JetBrains Mono', 'Fira Code', monospace", fontSize: 13, color: "text.primary", minWidth: 0, flexShrink: 1, maxWidth: "55%", wordBreak: "break-all" }}>
                {item.testName}
              </Typography>
              <Tooltip title="Copy test name">
                <IconButton
                  size="small"
                  aria-label="Copy test name"
                  onClick={(e) => { e.stopPropagation(); navigator.clipboard?.writeText(item.testName); }}
                  sx={{ flexShrink: 0, p: 0.25, ml: 0.25, color: "text.disabled", "&:hover": { color: "text.secondary" } }}
                >
                  <ContentCopyIcon sx={{ fontSize: 14 }} />
                </IconButton>
              </Tooltip>
              {/* List view: notes + Add control on the far right of the row. */}
              {!isOpen && (
                <Box sx={{ ml: "auto", mr: 1, display: "flex", minWidth: 0, maxWidth: "55%", overflow: "hidden" }} onClick={(e) => e.stopPropagation()}>
                  <InlineNotes
                    testName={item.testName}
                    failureReason={reasonContext ?? item.reasons[0]?.text ?? "General"}
                    isListView
                  />
                </Box>
              )}
              {trUrl && (
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<OpenInNewIcon sx={{ fontSize: "13px !important" }} />}
                  href={trUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  sx={{
                    borderColor: "#cbd5e1", color: "#475569", textTransform: "none",
                    fontSize: 11, py: "3px", px: "10px", minHeight: 0, lineHeight: 1.4, flexShrink: 0,
                    "&:hover": { borderColor: "#94a3b8", bgcolor: "background.paper", color: "text.primary" },
                  }}
                >
                  TR
                </Button>
              )}
              <Button
                size="small"
                variant="outlined"
                startIcon={<HistoryIcon sx={{ fontSize: "13px !important" }} />}
                onClick={(e) => { e.stopPropagation(); onOpenHistory(item.testName); }}
                sx={{
                  borderColor: "#cbd5e1", color: "#475569", textTransform: "none",
                  fontSize: 11, py: "3px", px: "10px", minHeight: 0, lineHeight: 1.4, flexShrink: 0,
                  "&:hover": { borderColor: "#94a3b8", bgcolor: "background.paper", color: "text.primary" },
                }}
              >
                History
              </Button>
              <KeyboardArrowDownIcon sx={{
                fontSize: 18, color: isOpen ? "#dc2626" : "text.secondary", flexShrink: 0,
                transition: "transform 0.22s ease",
                transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
              }} />
            </Box>

            <Collapse in={isOpen} unmountOnExit>
              <Box sx={{
                p: "16px 16px 20px",
                bgcolor: "background.default",
                borderBottom: !isLast ? 1 : 0,
                borderColor: "divider",
              }}>
                <FailureCard
                  item={item}
                  index={0}
                  onImageClick={onImageClick}
                  onExpandLog={onExpandLog}
                  onOpenHistory={() => onOpenHistory(item.testName)}
                  testRailUrl={trUrl}
                  areaName={areaName}
                  reasonContext={reasonContext}
                />
              </Box>
            </Collapse>
          </Box>
        );
      })}
    </Paper>
  );
};

export default FailureRowList;
