import { useCallback, useEffect, useSyncExternalStore } from "react";
import { getNotes, createNote, deleteNote, type FailureNote } from "../services/apiService";


let notes: FailureNote[] = [];
let loaded = false;
let loading = false;
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((l) => l());
const subscribe = (cb: () => void) => { listeners.add(cb); return () => { listeners.delete(cb); }; };

// Dedupe by noteId so an optimistic add that races the initial load can't double.
const byId = (arr: FailureNote[]): FailureNote[] =>
  Array.from(new Map(arr.map((n) => [n.noteId, n])).values());

async function ensureLoaded() {
  if (loaded || loading) return;
  loading = true;
  try {
    const fetched = await getNotes();
    notes = byId([...fetched, ...notes]);
    loaded = true;
  } catch (e) {
    console.error("Failed to load notes:", e);
  } finally {
    loading = false;
    emit();
  }
}

/** Test-only: clears the module-level cache so each test starts isolated. */
export function __resetNotesCacheForTests() {
  notes = [];
  loaded = false;
  loading = false;
  emit();
}

const sameTest = (a: string | null, b: string | null) => (a ?? null) === (b ?? null);

// FAILURE_REASON column is VARCHAR2(1000); normalize the key the same way writes do.
const MAX_REASON_LEN = 1000;
const normTest = (t: string | null | undefined) => (typeof t === "string" && t.trim() !== "" ? t.trim() : null);
// Permissive key for cross-tab matching: strip ALL non-alphanumerics + lowercase.
const reasonKey = (r: string | null | undefined) => (r ?? "").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, MAX_REASON_LEN);

/** Notes matching a given (testName, failureReason) pair. testName null = general reason note. */
export function selectNotes(all: FailureNote[], testName: string | null, failureReason: string): FailureNote[] {
  return all.filter((n) => sameTest(n.testName, testName) && n.failureReason === failureReason);
}

/**
 * Relational getter: returns BOTH the item's private notes AND the global
 * (testName null) notes for the same failure reason. Used by every test row /
 * reason block so global notes cascade universally.
 */
export function getNotesForItem(all: FailureNote[], testName: string | null | undefined, failureReason: string): FailureNote[] {
  const tn = normTest(testName);
  const target = reasonKey(failureReason);
  // Permissive match: equal OR either side contains the other (endpoints format
  // the same reason differently across tabs).
  const reasonMatches = (other: string) => {
    const nk = reasonKey(other);
    if (!nk || !target) return nk === target;
    return nk === target || nk.includes(target) || target.includes(nk);
  };
  return all.filter(
    (n) => (n.testName === tn || n.testName === null) && reasonMatches(n.failureReason)
  );
}

export function useNotes() {
  const all = useSyncExternalStore(subscribe, () => notes);
  useEffect(() => { ensureLoaded(); }, []);

  const notesForItem = useCallback(
    (testName: string | null | undefined, failureReason: string) => getNotesForItem(all, testName, failureReason),
    [all]
  );

  const add = useCallback(async (testName: string | null, failureReason: string, content: string) => {
    try {
      const created = await createNote(testName, failureReason, content);
      notes = byId([created, ...notes]);
      emit();
    } catch (e) {
      console.error("Failed to add note:", e);
    }
  }, []);

  const remove = useCallback(async (id: number) => {
    try {
      await deleteNote(id);
      notes = notes.filter((n) => n.noteId !== id);
      emit();
    } catch (e) {
      console.error("Failed to delete note:", e);
    }
  }, []);

  return { notes: all, add, remove, notesForItem };
}
