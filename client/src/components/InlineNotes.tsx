import React, { useState } from "react";
import { Box, Typography, TextField, IconButton, Tooltip, Link } from "@mui/material";
import { alpha } from "@mui/material/styles";
import StickyNote2OutlinedIcon from "@mui/icons-material/StickyNote2Outlined";
import PublicOutlinedIcon from "@mui/icons-material/PublicOutlined";
import AddCommentOutlinedIcon from "@mui/icons-material/AddCommentOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import { useNotes } from "../hooks/useNotes";
import type { FailureNote } from "../services/apiService";

// FAILURE_REASON column is VARCHAR2(1000); cap the key so it always fits the DB.
const MAX_REASON_LEN = 1000;

// JIRA base comes from the Vite env (VITE_JIRA_BASE_URL); fallback keeps links working.
const JIRA_BASE_URL = import.meta.env.VITE_JIRA_BASE_URL || "https://default.atlassian.net/browse/";
const JIRA_TICKET_RE = /\b[A-Z]+-\d+\b/g;

// ── Slate-blue / muted-indigo note palette (blends with the dark dashboard). ──
type Tone = "indigo" | "slate";
const toneSx = (tone: Tone) => {
  const hue = tone === "indigo"
    ? { dark: "#a5b4fc", light: "#6366f1", text: { dark: "#c7d2fe", light: "#4338ca" } }
    : { dark: "#cbd5e1", light: "#64748b", text: { dark: "#cbd5e1", light: "#475569" } };
  return {
    bgcolor: (t: any) => alpha(t.palette.mode === "dark" ? hue.dark : hue.light, t.palette.mode === "dark" ? 0.16 : 0.1),
    borderColor: (t: any) => alpha(t.palette.mode === "dark" ? hue.dark : hue.light, 0.4),
    color: (t: any) => (t.palette.mode === "dark" ? hue.text.dark : hue.text.light),
    hoverBorder: (t: any) => alpha(t.palette.mode === "dark" ? hue.dark : hue.light, 0.75),
  };
};

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
  tone: Tone;
  readOnly: boolean;
  /** Inherited global note (testName null) shown on a test — labelled, never editable here. */
  inherited?: boolean;
  onEdit: (text: string) => void;
  onDelete: () => void;
}

const NotePill: React.FC<NotePillProps> = ({ note, tone, readOnly, inherited, onEdit, onDelete }) => {
  const [editing, setEditing] = useState(false);
  const c = toneSx(tone);

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

  const showActions = !readOnly && !inherited;

  return (
    <Box
      onClick={(e) => e.stopPropagation()}
      sx={{
        display: "inline-flex", alignItems: "center", gap: 0.625, maxWidth: "100%",
        bgcolor: c.bgcolor, border: 1, borderColor: c.borderColor, color: c.color,
        borderRadius: 1.5, pl: 1, pr: showActions ? 0.5 : 1, py: 0.375,
        transition: "border-color 0.15s, background-color 0.15s",
        ...(showActions && {
          "&:hover": { borderColor: c.hoverBorder },
          "&:hover .note-actions": { opacity: 1, width: "auto", ml: 0.25 },
        }),
      }}
    >
      <Tooltip title={inherited ? "Global note for this reason" : ""} disableHoverListener={!inherited}>
        {inherited
          ? <PublicOutlinedIcon sx={{ fontSize: 15, color: "inherit", flexShrink: 0 }} />
          : <StickyNote2OutlinedIcon sx={{ fontSize: 15, color: "inherit", flexShrink: 0 }} />}
      </Tooltip>
      <Typography
        variant="caption"
        sx={{ color: "inherit", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", lineHeight: 1.6 }}
      >
        {renderNoteText(note.noteContent)}
      </Typography>
      {showActions && (
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
  /** List view (collapsed rows/headers): right-align the Add control. Card view: block under text. */
  isListView?: boolean;
}

const MAX_NOTES_PER_ITEM = 5;

const InlineNotes: React.FC<InlineNotesProps> = ({ testName, failureReason, readOnly = false, isListView = false }) => {
  const { add, remove, notesForItem } = useNotes();
  const [adding, setAdding] = useState(false);

  const tn = typeof testName === "string" && testName.trim() !== "" ? testName.trim() : null;
  const reason = (failureReason ?? "").slice(0, MAX_REASON_LEN);
  const isGeneral = tn === null;

  // Relational getter: this item's private notes + global notes for the same reason.
  const all = notesForItem(tn, reason);
  const own = all.filter((n) => n.testName === tn);
  const inherited = isGeneral ? [] : all.filter((n) => n.testName === null);

  if (readOnly && own.length === 0 && inherited.length === 0) return null;

  const atLimit = own.length >= MAX_NOTES_PER_ITEM;

  const addTooltip = isGeneral
    ? "Add a note to all tests failing with this reason"
    : "Add a note to this specific test only";
  const placeholder = isGeneral ? "Note for this reason…" : "Note for this test…";

  const handleAdd = (text: string) => { add(tn, reason, text); setAdding(false); };
  const handleEdit = (note: FailureNote, text: string) => { remove(note.noteId).then(() => add(tn, reason, text)); };

  // List view: push the Add control to the far right. Card view: keep it under the text.
  const mlAuto = isListView ? "auto" : undefined;

  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 0.75 }}>
      {/* Inherited global notes (read-only here; managed from the reason view). */}
      {inherited.map((note) => (
        <NotePill key={`g-${note.noteId}`} note={note} tone="slate" readOnly inherited onEdit={() => {}} onDelete={() => {}} />
      ))}

      {/* Own notes — multiple allowed. */}
      {own.map((note) => (
        <NotePill
          key={note.noteId}
          note={note}
          tone="indigo"
          readOnly={readOnly}
          onEdit={(text) => handleEdit(note, text)}
          onDelete={() => remove(note.noteId)}
        />
      ))}

      {!readOnly && !atLimit && (adding ? (
        <Box sx={{ ml: mlAuto, display: "inline-flex" }}>
          <NoteEditor
            initialValue=""
            placeholder={placeholder}
            onSave={handleAdd}
            onCancel={() => setAdding(false)}
          />
        </Box>
      ) : (
        <Tooltip title={addTooltip}>
          <Box
            role="button"
            tabIndex={0}
            aria-label="Add note"
            onClick={(e) => { e.stopPropagation(); setAdding(true); }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); setAdding(true); }
            }}
            sx={{
              display: "inline-flex", alignItems: "center", gap: 0.5, ml: mlAuto,
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

      {/* At the 5-note cap, surface a subtle hint instead of the Add button. */}
      {!readOnly && atLimit && (
        <Typography variant="caption" sx={{ ml: mlAuto, color: "text.disabled", fontStyle: "italic" }}>
          Max {MAX_NOTES_PER_ITEM} notes
        </Typography>
      )}
    </Box>
  );
};

export default InlineNotes;
