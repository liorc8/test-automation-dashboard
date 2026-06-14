import { useEffect, useState } from "react";

const KEY_PREFIX = "testNote:";
const CHANGE_EVENT = "testnote-change";

function noteKey(areaName: string, testName: string): string {
  return `${KEY_PREFIX}${areaName.toUpperCase()}:${testName}`;
}

/**
 * Per-test local note, keyed by area + test name and persisted in localStorage.
 * Notes are ephemeral by nature: when a test stops failing it disappears from the
 * views, so its note simply stops being shown (the value stays in storage).
 *
 * A custom window event keeps independent hook instances (e.g. the editor button
 * and an inline display of the same note) in sync after a save.
 */
export function useTestNote(areaName: string | undefined, testName: string) {
  const key = noteKey(areaName ?? "", testName);
  const [note, setNote] = useState<string>("");

  useEffect(() => {
    const read = () => {
      try {
        setNote(window.localStorage.getItem(key) ?? "");
      } catch {
        setNote("");
      }
    };
    read();

    const onChange = (e: Event) => {
      const detailKey = (e as CustomEvent<{ key: string }>).detail?.key;
      if (!detailKey || detailKey === key) read();
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === null || e.key === key) read();
    };

    window.addEventListener(CHANGE_EVENT, onChange);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(CHANGE_EVENT, onChange);
      window.removeEventListener("storage", onStorage);
    };
  }, [key]);

  const save = (value: string) => {
    const trimmed = value.trim();
    try {
      if (trimmed) window.localStorage.setItem(key, trimmed);
      else window.localStorage.removeItem(key);
    } catch {
      /* ignore storage errors */
    }
    setNote(trimmed);
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: { key } }));
  };

  return { note, save };
}
