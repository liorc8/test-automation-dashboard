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

/** Notes matching a given (testName, failureReason) pair. testName null = general reason note. */
export function selectNotes(all: FailureNote[], testName: string | null, failureReason: string): FailureNote[] {
  return all.filter((n) => sameTest(n.testName, testName) && n.failureReason === failureReason);
}

export function useNotes() {
  const all = useSyncExternalStore(subscribe, () => notes);
  useEffect(() => { ensureLoaded(); }, []);

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

  return { notes: all, add, remove };
}
