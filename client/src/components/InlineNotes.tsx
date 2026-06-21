import React, { useCallback, useState, useSyncExternalStore } from "react";
import { Box, Typography, TextField, IconButton, Tooltip, Link } from "@mui/material";
import { alpha } from "@mui/material/styles";
import StickyNote2OutlinedIcon from "@mui/icons-material/StickyNote2Outlined";
import AddCommentOutlinedIcon from "@mui/icons-material/AddCommentOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";


type NoteItem = { id: string; text: string };
type NoteScope = "test" | "reason";

const JIRA_BASE_URL = import.meta.env.VITE_JIRA_BASE_URL;
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

const store = new Map<string, NoteItem[]>();
const EMPTY: NoteItem[] = [];
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((l) => l());
const subscribe = (cb: () => void) => { listeners.add(cb); return () => { listeners.delete(cb); }; };

let seq = 0;
const newId = () => `note-${Date.now()}-${seq++}`;

const pushNote = (id: string, text: string) =>
  store.set(id, [...(store.get(id) ?? []), { id: newId(), text }]);
const updateNote = (id: string, noteId: string, text: string) =>
  store.set(id, (store.get(id) ?? []).map((n) => (n.id === noteId ? { ...n, text } : n)));
const updateNoteByText = (id: string, oldText: string, text: string) =>
  store.set(id, (store.get(id) ?? []).map((n) => (n.text === oldText ? { ...n, text } : n)));
const deleteNote = (id: string, noteId: string) =>
  store.set(id, (store.get(id) ?? []).filter((n) => n.id !== noteId));
const deleteNoteByText = (id: string, text: string) =>
  store.set(id, (store.get(id) ?? []).filter((n) => n.text !== text));

function useInlineNotes(entityId: string) {
  const notes = useSyncExternalStore(subscribe, () => store.get(entityId) ?? EMPTY);
  // Adding can cascade the same note to related entities (e.g. all tests of a reason).
  const add = useCallback((text: string, cascadeTo: string[] = []) => {
    pushNote(entityId, text);
    cascadeTo.forEach((id) => pushNote(id, text));
    emit();
  }, [entityId]);
  // Editing cascades to the same related entities by matching the previous text.
  const edit = useCallback((noteId: string, text: string, oldText: string, cascadeTo: string[] = []) => {
    updateNote(entityId, noteId, text);
    cascadeTo.forEach((id) => updateNoteByText(id, oldText, text));
    emit();
  }, [entityId]);
  // Deleting cascades to the same related entities by matching note text.
  const remove = useCallback((noteId: string, text: string, cascadeTo: string[] = []) => {
    deleteNote(entityId, noteId);
    cascadeTo.forEach((id) => deleteNoteByText(id, text));
    emit();
  }, [entityId]);
  return { notes, add, edit, remove };
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
  note: NoteItem;
  readOnly: boolean;
  onEdit: (text: string) => void;
  onDelete: () => void;
}

const NotePill: React.FC<NotePillProps> = ({ note, readOnly, onEdit, onDelete }) => {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <NoteEditor
        initialValue={note.text}
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
        {renderNoteText(note.text)}
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
  /** Whether the note is attached to a single test or to a failure reason. */
  scope: NoteScope;
  /** Stable identity of the note target. */
  entityId: string;
  /** When true (collapsed/list view): show existing chips only, no write actions. */
  readOnly?: boolean;
  /** Extra entityIds a newly added note should also be applied to (cascade). */
  cascadeTo?: string[];
}

const InlineNotes: React.FC<InlineNotesProps> = ({ scope, entityId, readOnly = false, cascadeTo }) => {
  const { notes, add, edit, remove } = useInlineNotes(entityId);
  const [adding, setAdding] = useState(false);

  // Collapsed/read-only with nothing to show → render nothing.
  if (readOnly && notes.length === 0) return null;

  const placeholder = scope === "reason" ? "Note for this reason…" : "Note for this test…";

  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 0.75 }}>
      {notes.map((note) => (
        <NotePill
          key={note.id}
          note={note}
          readOnly={readOnly}
          onEdit={(text) => edit(note.id, text, note.text, cascadeTo)}
          onDelete={() => remove(note.id, note.text, cascadeTo)}
        />
      ))}

      {!readOnly && (adding ? (
        <NoteEditor
          initialValue=""
          placeholder={placeholder}
          onSave={(text) => { add(text, cascadeTo); setAdding(false); }}
          onCancel={() => setAdding(false)}
        />
      ) : (
        <Tooltip title="Add note">
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
