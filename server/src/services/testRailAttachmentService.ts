const TESTRAIL_API_BASE =
  "http://testrail.pre.proquest.com/testrail/index.php?/api/v2/";

const RESULTS_LIMIT = 60;                // how far back we look, per your call
const MAX_ATTACHMENTS_PER_RESULT = 3;
const MAX_ATTACHMENT_FETCHES_TOTAL = 15; // lower now that the result pool itself is capped

type FoundAttachment = { buffer: Buffer; contentType: string };
type TestRailResult = { id: number; created_on: number; attachment_ids?: number[] };

type ResultsCacheEntry = { results: TestRailResult[]; cachedAt: number };
const resultsCache = new Map<string, ResultsCacheEntry>();
const RESULTS_TTL_MS = 60 * 60 * 1000; // 1h

type MatchCacheEntry = (FoundAttachment & { cachedAt: number }) | { notFound: true; cachedAt: number };
const matchCache = new Map<string, MatchCacheEntry>();
const MATCH_FOUND_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30d — a past run's screenshot never changes
const MATCH_MISSING_TTL_MS = 60 * 60 * 1000;          // 1h

function authHeader(): string {
  const email = process.env.TESTRAIL_API_EMAIL;
  const apiKey = process.env.TESTRAIL_API_KEY;
  if (!email || !apiKey) {
    throw new Error("TestRail API credentials are not configured (TESTRAIL_API_EMAIL / TESTRAIL_API_KEY).");
  }
  return "Basic " + Buffer.from(`${email}:${apiKey}`).toString("base64");
}

async function fetchRecentResults(testId: string): Promise<TestRailResult[]> {
  const cached = resultsCache.get(testId);
  if (cached && Date.now() - cached.cachedAt < RESULTS_TTL_MS) {
    return cached.results;
  }

  const resp = await fetch(`${TESTRAIL_API_BASE}get_results/${testId}&limit=${RESULTS_LIMIT}`, {
    headers: { Authorization: authHeader(), "Content-Type": "application/json" },
  });
  if (!resp.ok) return [];
  const data = await resp.json();
  const results: TestRailResult[] = Array.isArray(data) ? data : (data.results ?? []);

  resultsCache.set(testId, { results, cachedAt: Date.now() });
  return results;
}

async function fetchAttachment(attachmentId: number): Promise<FoundAttachment | null> {
  const resp = await fetch(`${TESTRAIL_API_BASE}get_attachment/${attachmentId}`, {
    headers: { Authorization: authHeader(), "Content-Type": "application/json" },
  });
  if (!resp.ok) return null;
  const contentType = resp.headers.get("content-type") || "";
  if (!contentType.startsWith("image/")) return null;
  const arrayBuffer = await resp.arrayBuffer();
  return { buffer: Buffer.from(arrayBuffer), contentType };
}

/**
 * Finds the screenshot that best matches one specific historical failure, searching
 * only the last RESULTS_LIMIT (60) TestRail results for this test id: locates the
 * result whose created_on is closest to targetUnixTime, then walks outward to the
 * next-closest result if the nearest one has no image attachment of its own.
 */
export async function getScreenshotForRun(
  testRailId: string,
  targetUnixTime: number
): Promise<FoundAttachment | null> {
  const cacheKey = `${testRailId}:${targetUnixTime}`;
  const cached = matchCache.get(cacheKey);
  if (cached) {
    const ttl = "notFound" in cached ? MATCH_MISSING_TTL_MS : MATCH_FOUND_TTL_MS;
    if (Date.now() - cached.cachedAt < ttl) {
      return "notFound" in cached ? null : { buffer: cached.buffer, contentType: cached.contentType };
    }
  }

  try {
    const results = await fetchRecentResults(testRailId);

    const byDistance = [...results].sort(
      (a, b) => Math.abs(a.created_on - targetUnixTime) - Math.abs(b.created_on - targetUnixTime)
    );

    let attachmentFetches = 0;
    for (const result of byDistance) {
      const attachmentIds = (result.attachment_ids ?? []).slice(0, MAX_ATTACHMENTS_PER_RESULT);
      for (const attachmentId of attachmentIds) {
        if (attachmentFetches >= MAX_ATTACHMENT_FETCHES_TOTAL) break;
        attachmentFetches++;
        const found = await fetchAttachment(attachmentId);
        if (found) {
          matchCache.set(cacheKey, { ...found, cachedAt: Date.now() });
          return found;
        }
      }
      if (attachmentFetches >= MAX_ATTACHMENT_FETCHES_TOTAL) break;
    }
  } catch (error) {
    console.error("TestRail attachment fetch failed:", error);
    return null;
  }

  matchCache.set(cacheKey, { notFound: true, cachedAt: Date.now() });
  return null;
}