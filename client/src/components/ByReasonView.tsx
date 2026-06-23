import React, { useState } from "react";
import { Box, Typography, Accordion, AccordionSummary, AccordionDetails } from "@mui/material";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import AddCommentOutlinedIcon from "@mui/icons-material/AddCommentOutlined";
import FailureRowList from "./FailureRowList";
import InlineNotes from "./InlineNotes";
import type { ReasonGroup } from "../types/FailuresByReason";

interface ByReasonViewProps {
  reasons: ReasonGroup[];
  areaName: string | undefined;
  onImageClick: (src: string) => void;
  onExpandLog: (lines: string[], testName: string, label: string) => void;
  onOpenHistory: (testName: string) => void;
  testRailUrlFor: (testName: string) => string | null;
}

function previewReason(text: string): string {
  const line = text.split(/\r?\n/).map(l => l.trim()).find(l => l.length > 0) ?? text.trim();
  return line.length > 160 ? `${line.slice(0, 160)}…` : line;
}


const ByReasonView: React.FC<ByReasonViewProps> = ({
  reasons, areaName, onImageClick, onExpandLog, onOpenHistory, testRailUrlFor,
}) => {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {reasons.map((group, idx) => {
        const isExpanded = expandedIdx === idx;
        return (
        <Accordion
          key={idx}
          disableGutters
          expanded={isExpanded}
          onChange={(_, exp) => setExpandedIdx(exp ? idx : null)}
          sx={{
            bgcolor: "background.paper",
            border: 1, borderColor: "divider", borderRadius: 2,
            overflow: "hidden",
            "&:before": { display: "none" },
            boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
          }}
        >
          <AccordionSummary
            expandIcon={<KeyboardArrowDownIcon sx={{ color: "text.secondary" }} />}
            sx={{
              bgcolor: "#1e293b",
              "& .MuiAccordionSummary-content": { alignItems: "center", gap: 1.5, my: 1.25, minWidth: 0 },
            }}
          >
            <Typography sx={{ fontSize: 18, lineHeight: 1, flexShrink: 0 }}>⚠️</Typography>
            <Typography sx={{
              fontFamily: "'JetBrains Mono', 'Fira Code', monospace", fontSize: 13, fontWeight: 700,
              color: "#f1f5f9", flex: 1, minWidth: 0, wordBreak: "break-word",
            }}>
              {previewReason(group.reasonText)}
            </Typography>
            {/* List view header: read-only reason chips + an Add trigger, on the far right.
                The trigger expands the accordion so the editor opens below the title. */}
            {!isExpanded && (
              <Box sx={{ ml: "auto", display: "flex", alignItems: "center", gap: 1, minWidth: 0, maxWidth: "55%" }} onClick={(e) => e.stopPropagation()}>
                <Box sx={{ display: "flex", minWidth: 0, overflow: "hidden" }}>
                  <InlineNotes testName={null} failureReason={group.reasonText} readOnly />
                </Box>
                <Box
                  role="button"
                  tabIndex={0}
                  aria-label="Add note"
                  onClick={(e) => { e.stopPropagation(); setExpandedIdx(idx); }}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); setExpandedIdx(idx); } }}
                  sx={{
                    display: "inline-flex", alignItems: "center", gap: 0.5, flexShrink: 0,
                    border: "1px dashed", borderColor: "rgba(148,163,184,0.5)", borderRadius: 1.5,
                    color: "#cbd5e1", cursor: "pointer", px: 1, py: 0.375, lineHeight: 1.6,
                    "&:hover": { color: "#f1f5f9", borderColor: "#94a3b8", bgcolor: "rgba(148,163,184,0.12)" },
                  }}
                >
                  <AddCommentOutlinedIcon sx={{ fontSize: 15 }} />
                  <Typography variant="caption" sx={{ color: "inherit", fontWeight: 600, lineHeight: 1.6 }}>Add note</Typography>
                </Box>
              </Box>
            )}
            <Box component="span" sx={{
              ml: isExpanded ? "auto" : 0, flexShrink: 0,
              bgcolor: "#475569", color: "#f1f5f9", borderRadius: 20,
              px: 1.5, py: "3px", fontSize: 12, fontWeight: 700,
            }}>
              {group.failCount} {group.failCount === 1 ? "test" : "tests"}
            </Box>
          </AccordionSummary>
          <AccordionDetails sx={{ p: 0 }}>
            {/* Expanded only: the single editable reason-level (general) Add Note action. */}
            {isExpanded && (
              <Box data-testid="reason-note" sx={{ px: 2, pt: 1.5, pb: 0.5 }}>
                <InlineNotes testName={null} failureReason={group.reasonText} />
              </Box>
            )}
            {/* Compact rows — same layout as the By Server / By Job tabs. */}
            <FailureRowList
              items={group.tests}
              onImageClick={onImageClick}
              onExpandLog={onExpandLog}
              onOpenHistory={onOpenHistory}
              testRailUrlFor={testRailUrlFor}
              areaName={areaName}
              reasonContext={group.reasonText}
            />
          </AccordionDetails>
        </Accordion>
        );
      })}
    </Box>
  );
};

export default ByReasonView;