import React from "react";
import { Box, Typography } from "@mui/material";
import EditNoteIcon from "@mui/icons-material/EditNote";
import { useTestNote } from "../hooks/useTestNote";

interface TestNoteDisplayProps {
  areaName: string | undefined;
  testName: string;
}

/** Renders the saved note for a test inline (slate box). Nothing when no note exists. */
const TestNoteDisplay: React.FC<TestNoteDisplayProps> = ({ areaName, testName }) => {
  const { note } = useTestNote(areaName, testName);
  if (!note.trim()) return null;

  return (
    <Box sx={{
      display: "flex", gap: 0.75, alignItems: "flex-start",
      bgcolor: "action.hover", border: 1, borderColor: "divider",
      borderRadius: 1.5, px: 1.25, py: 0.75,
    }}>
      <EditNoteIcon sx={{ fontSize: 16, color: "text.secondary", flexShrink: 0, mt: "1px" }} />
      <Typography variant="caption" sx={{ color: "text.secondary", whiteSpace: "pre-wrap", wordBreak: "break-word", lineHeight: 1.5 }}>
        {note}
      </Typography>
    </Box>
  );
};

export default TestNoteDisplay;
