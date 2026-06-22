import React, { useState } from "react";
import { Box, Typography, TextField, IconButton, Tooltip, Link } from "@mui/material";
import { alpha } from "@mui/material/styles";
import StickyNote2OutlinedIcon from "@mui/icons-material/StickyNote2Outlined";
import AddCommentOutlinedIcon from "@mui/icons-material/AddCommentOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import { useNotes, selectNotes } from "../hooks/useNotes";
import type { FailureNote } from "../services/apiService";

// FAILURE_REASON column is VARCHAR2(1000); cap the key so it always fits the DB.
const MAX_REASON_LEN = 1000;

// JIRA base comes from the Vite env (VITE_JIRA_BASE_URL); fallback keeps links working.
const JIRA_BASE_URL = import.meta.env.VITE_JIRA_BASE_URL || "https://default.atlassian.net/browse/";
const JIRA_TICKET_RE = /\b[A-Z]+-\d+\b/g;

/**
 * Renders note text with JIRA ticket IDs (e.g. URM-88888) turned into safe,
 * clickable links. Splits the string and maps matches to React elements — no
 * dangerouslySetInnerHTML, so user text is never interpreted as HTML.
 */
function renderNoteText(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  JIRA_TICKET_RE.lastIndex = 0;

  while ((match = JIRA_TICKET_RE.exec(text)) !== null) {
    const ticket = match[0];
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
    parts.push(
      <Link
        key={`${ticket}-${match.index}`}
        href={`${JIRA_BASE_URL}${ticket}`}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        sx={{ color: "inherit", fontWeight: 700, textDecorationColor: "currentColor" }}
      >
        {ticket}
      </Link>
    );
    lastIndex = match.index + ticket.length;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts;
}

// ─── Inline editor (shared by add + edit flows) ───────────────────────────────

interface NoteEditorProps {
  initialValue: string;
  placeholder: string;
  onSave: (text: string) => void;
  onCancel: () => void;
}

const NoteEditor: React.FC<NoteEditorProps> = ({ initialValue, placeholder, onSave, onCancel }) => {
  const [draft, setDraft] = useState(initialValue);
  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed) onSave(trimmed);
    else onCancel();
  };

  return (
    <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.5 }} onClick={(e) => e.stopPropagation()}>
      <TextField
        autoFocus
        size="small"
        variant="outlined"
        placeholder={placeholder}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); commit(); }
          if (e.key === "Escape") { e.preventDefault(); onCancel(); }
        }}
        sx={{
          minWidth: 240,
          "& .MuiOutlinedInput-root": { bgcolor: "background.paper", borderRadius: 1.5 },
          "& .MuiOutlinedInput-input": { fontSize: 12.5, py: 0.5, color: "text.primary" },
        }}
      />
      <Tooltip title="Save">
        <IconButton size="small" aria-label="Save note" onClick={commit} sx={{ color: "text.secondary" }}>
          <CheckIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </Tooltip>
      <Tooltip title="Cancel">
        <IconButton size="small" aria-label="Cancel note" onClick={onCancel} sx={{ color: "text.disabled" }}>
          <CloseIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </Tooltip>
    </Box>
  );
};

// ─── Note chip (view, + inline edit when not read-only) ───────────────────────

interface NotePillProps {
  note: FailureNote;
  readOnly: boolean;
  onEdit: (text: string) => void;
  onDelete: () => void;
}

const NotePill: React.FC<NotePillProps> = ({ note, readOnly, onEdit, onDelete }) => {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <NoteEditor
        initialValue={note.noteContent}
        placeholder="Edit note…"
        onSave={(text) => { onEdit(text); setEditing(false); }}
        onCancel={() => setEditing(false)}
      />
    );
  }

  return (
    <Box
      onClick={(e) => e.stopPropagation()}
      sx={{
        display: "inline-flex", alignItems: "center", gap: 0.625, maxWidth: "100%",
        // Prominent, intuitive "sticky note" amber — high contrast, not alarming.
        bgcolor: (t) => alpha(t.palette.warning.main, t.palette.mode === "dark" ? 0.22 : 0.16),
        border: 1,
        borderColor: (t) => alpha(t.palette.warning.main, 0.5),
        color: (t) => (t.palette.mode === "dark" ? t.palette.warning.light : t.palette.warning.dark),
        borderRadius: 1.5, pl: 1, pr: readOnly ? 1 : 0.5, py: 0.375,
        transition: "border-color 0.15s, background-color 0.15s",
        ...(!readOnly && {
          "&:hover": { borderColor: (t) => alpha(t.palette.warning.main, 0.85) },
          "&:hover .note-actions": { opacity: 1, width: "auto", ml: 0.25 },
        }),
      }}
    >
      <StickyNote2OutlinedIcon sx={{ fontSize: 15, color: "inherit", flexShrink: 0 }} />
      <Typography
        variant="caption"
        sx={{ color: "inherit", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", lineHeight: 1.6 }}
      >
        {renderNoteText(note.noteContent)}
      </Typography>
      {!readOnly && (
        <Box
          className="note-actions"
          sx={{ display: "inline-flex", alignItems: "center", opacity: 0, width: 0, overflow: "hidden", transition: "opacity 0.15s" }}
        >
          <Tooltip title="Edit note">
            <IconButton size="small" aria-label="Edit note" onClick={() => setEditing(true)} sx={{ p: 0.25, color: "inherit", opacity: 0.75, "&:hover": { opacity: 1 } }}>
              <EditOutlinedIcon sx={{ fontSize: 14 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete note">
            <IconButton size="small" aria-label="Delete note" onClick={onDelete} sx={{ p: 0.25, color: "inherit", opacity: 0.75, "&:hover": { opacity: 1 } }}>
              <DeleteOutlineIcon sx={{ fontSize: 14 }} />
            </IconButton>
          </Tooltip>
        </Box>
      )}
    </Box>
  );
};

// ─── Inline notes container ───────────────────────────────────────────────────

interface InlineNotesProps {
  /** Test the note is attached to. null/undefined/empty → general reason note. */
  testName?: string | null;
  /** The failure reason the note belongs to (DB FAILURE_REASON, NOT NULL). */
  failureReason: string;
  /** When true (collapsed/list view): show existing chips only, no write actions. */
  readOnly?: boolean;
}

const InlineNotes: React.FC<InlineNotesProps> = ({ testName, failureReason, readOnly = false }) => {
  const { notes, add, remove } = useNotes();
  const [adding, setAdding] = useState(false);

  const tn = typeof testName === "string" && testName.trim() !== "" ? testName.trim() : null;
  const reason = (failureReason ?? "").slice(0, MAX_REASON_LEN);
  const mine = selectNotes(notes, tn, reason);

  // Collapsed/read-only with nothing to show → render nothing.
  if (readOnly && mine.length === 0) return null;

  const isGeneral = tn === null;
  const addTooltip = isGeneral
    ? "Add a note to all tests failing with this reason"
    : "Add a note to this specific test only";
  const placeholder = isGeneral ? "Note for this reason…" : "Note for this test…";

  const handleAdd = (text: string) => { add(tn, reason, text); setAdding(false); };
  const handleEdit = (note: FailureNote, text: string) => { remove(note.noteId).then(() => add(tn, reason, text)); };

  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 0.75 }}>
      {mine.map((note) => (
        <NotePill
          key={note.noteId}
          note={note}
          readOnly={readOnly}
          onEdit={(text) => handleEdit(note, text)}
          onDelete={() => remove(note.noteId)}
        />
      ))}

      {/* Unique (TEST_NAME, FAILURE_REASON) → only offer Add when none exists yet. */}
      {!readOnly && mine.length === 0 && (adding ? (
        <NoteEditor
          initialValue=""
          placeholder={placeholder}
          onSave={handleAdd}
          onCancel={() => setAdding(false)}
        />
      ) : (
        <Tooltip title={addTooltip}>
          <Box
            component="button"
            type="button"
            aria-label="Add note"
            onClick={(e) => { e.stopPropagation(); setAdding(true); }}
            sx={{
              display: "inline-flex", alignItems: "center", gap: 0.5,
              border: "1px dashed", borderColor: "divider", borderRadius: 1.5,
              bgcolor: "transparent", color: "text.secondary", cursor: "pointer",
              px: 1, py: 0.375, font: "inherit", lineHeight: 1.6,
              transition: "color 0.15s, border-color 0.15s, background-color 0.15s",
              "&:hover": {
                color: "text.primary",
                borderColor: "text.secondary",
                bgcolor: "action.hover",
              },
            }}
          >
            <AddCommentOutlinedIcon sx={{ fontSize: 15 }} />
            <Typography variant="caption" sx={{ color: "inherit", fontWeight: 600, lineHeight: 1.6 }}>
              Add note
            </Typography>
          </Box>
        </Tooltip>
      ))}
    </Box>
  );
};

export default InlineNotes;
