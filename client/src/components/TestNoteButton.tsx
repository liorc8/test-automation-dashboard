import React, { useState, useEffect } from "react";
import { IconButton, Tooltip, Badge, Popover, Box, Typography, TextField, Button } from "@mui/material";
import EditNoteIcon from "@mui/icons-material/EditNote";
import { useTestNote } from "../hooks/useTestNote";

interface TestNoteButtonProps {
  areaName: string | undefined;
  testName: string;
  /** Stops the click from toggling a surrounding clickable row. */
  stopPropagation?: boolean;
}

/** Note icon with a badge when a note exists; opens a popover with an editable note. */
const TestNoteButton: React.FC<TestNoteButtonProps> = ({ areaName, testName, stopPropagation }) => {
  const { note, save } = useTestNote(areaName, testName);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [draft, setDraft] = useState(note);

  useEffect(() => {
    if (anchorEl) setDraft(note);
  }, [anchorEl, note]);

  const open = (e: React.MouseEvent<HTMLElement>) => {
    if (stopPropagation) e.stopPropagation();
    setAnchorEl(e.currentTarget);
  };
  const close = () => setAnchorEl(null);

  const handleSave = () => { save(draft); close(); };
  const handleClear = () => { save(""); setDraft(""); close(); };

  const hasNote = note.trim().length > 0;

  return (
    <>
      <Tooltip title={hasNote ? "Edit note" : "Add note"}>
        <IconButton
          size="small"
          aria-label={hasNote ? "Edit note" : "Add note"}
          onClick={open}
          sx={{ color: hasNote ? "primary.main" : "text.secondary", flexShrink: 0 }}
        >
          <Badge color="primary" variant="dot" invisible={!hasNote}>
            <EditNoteIcon fontSize="small" />
          </Badge>
        </IconButton>
      </Tooltip>

      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={close}
        onClick={(e) => e.stopPropagation()}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{ paper: { sx: { p: 2, width: 320 } } }}
      >
        <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Note
        </Typography>
        <TextField
          autoFocus
          multiline
          minRows={3}
          maxRows={8}
          fullWidth
          placeholder="Add a local note for this test…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          sx={{ mt: 1 }}
        />
        <Box sx={{ display: "flex", justifyContent: "space-between", mt: 1.5 }}>
          <Button size="small" onClick={handleClear} disabled={!hasNote && !draft.trim()} sx={{ textTransform: "none", color: "text.secondary" }}>
            Clear
          </Button>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button size="small" onClick={close} sx={{ textTransform: "none", color: "text.secondary" }}>
              Cancel
            </Button>
            <Button size="small" variant="contained" onClick={handleSave} sx={{ textTransform: "none" }}>
              Save
            </Button>
          </Box>
        </Box>
      </Popover>
    </>
  );
};

export default TestNoteButton;
