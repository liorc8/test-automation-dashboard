import { useCallback, useEffect, useState } from "react";

const MAX_ITEMS = 10;
const CHANGE_EVENT = "searchhistory-change";

function read(storageKey: string): string[] {
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

/**
 * Persistent search history (localStorage). Keeps the 10 most recent unique terms,
 * newest first. `push` adds/promotes a term; `remove` deletes a specific term.
 * A window event keeps independent instances (e.g. the dropdown and a parent that
 * saves selected results) in sync.
 */
export function useSearchHistory(storageKey: string) {
  const [history, setHistory] = useState<string[]>(() => read(storageKey));

  useEffect(() => {
    const refresh = () => setHistory(read(storageKey));
    refresh();

    const onChange = (e: Event) => {
      const key = (e as CustomEvent<{ key: string }>).detail?.key;
      if (!key || key === storageKey) refresh();
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === null || e.key === storageKey) refresh();
    };

    window.addEventListener(CHANGE_EVENT, onChange);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(CHANGE_EVENT, onChange);
      window.removeEventListener("storage", onStorage);
    };
  }, [storageKey]);

  const write = useCallback((next: string[]) => {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      /* ignore storage errors */
    }
    setHistory(next);
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: { key: storageKey } }));
  }, [storageKey]);

  const push = useCallback((term: string) => {
    const trimmed = term.trim();
    if (!trimmed) return;
    const prev = read(storageKey);
    const deduped = prev.filter((t) => t.toLowerCase() !== trimmed.toLowerCase());
    write([trimmed, ...deduped].slice(0, MAX_ITEMS));
  }, [storageKey, write]);

  const remove = useCallback((term: string) => {
    const prev = read(storageKey);
    write(prev.filter((t) => t !== term));
  }, [storageKey, write]);

  return { history, push, remove };
}
