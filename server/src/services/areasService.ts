import { execute } from "../db";
import { AREAS, AreaConfig } from "../config/areas";


const DISPLAY_NAME_OVERRIDES: Record<string, string> = AREAS.reduce((acc, a) => {
  acc[a.id.toUpperCase()] = a.name;
  return acc;
}, {} as Record<string, string>);

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

let cache: { data: AreaConfig[]; expiresAt: number } | null = null;

export async function getAreas(): Promise<AreaConfig[]> {
  if (cache && cache.expiresAt > Date.now()) {
    return cache.data;
  }

  const sql = `
    SELECT DISTINCT UPPER(AREA) AS AREA
    FROM QA_AUTOMATION.TESTRESULTS
    WHERE AREA IS NOT NULL
    ORDER BY UPPER(AREA)
  `;

  const res = await execute(sql);
  const rows = (res.rows ?? []) as any[];

  const areas: AreaConfig[] = rows
    .map((r) => String(r.AREA ?? "").trim())
    .filter((id) => id.length > 0)
    .map((id) => ({ id, name: DISPLAY_NAME_OVERRIDES[id] ?? id }));

  cache = { data: areas, expiresAt: Date.now() + CACHE_TTL_MS };
  return areas;
}

export async function isKnownArea(areaName: string | undefined): Promise<boolean> {
  if (!areaName) return false;
  const key = areaName.toUpperCase();
  try {
    const areas = await getAreas();
    return areas.some((a) => a.id.toUpperCase() === key);
  } catch {
    return AREAS.some((a) => a.id.toUpperCase() === key);
  }
}
