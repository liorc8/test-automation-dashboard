import { useEffect, useState } from "react";
import { getAreaTestRailIds, type EnvFilter } from "../services/apiService";

export function useTestRailIds(areaName: string | undefined, env: EnvFilter) {
  const [ids, setIds] = useState<Record<string, string>>({});
  const [baseUrl, setBaseUrl] = useState("");

  useEffect(() => {
    if (!areaName) return;
    let cancelled = false;
    getAreaTestRailIds(areaName, env)
      .then(r => {
        if (cancelled) return;
        setIds(r.ids ?? {});
        setBaseUrl(r.baseUrl ?? "");
      })
      .catch(() => { if (!cancelled) { setIds({}); setBaseUrl(""); } });
    return () => { cancelled = true; };
  }, [areaName, env]);

  const urlFor = (testName: string): string | null => {
    const id = ids[testName.toUpperCase()];
    return id && baseUrl ? `${baseUrl}${id}` : null;
  };

  return { urlFor };
}
