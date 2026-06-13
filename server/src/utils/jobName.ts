// Extracts a Jenkins job name from a build artifact URL (logLink / screenshotLink).
// Returns the first "/job/<name>" segment, e.g.
//   ":8080/job/SQA-EU01-LOD_Authority/ws/..." → "SQA-EU01-LOD_Authority"
// Returns null when no job segment is present.

export function extractJobName(url: string | null | undefined): string | null {
  if (!url) return null;
  const match = url.match(/\/job\/([^\/]+)/i);
  return match ? match[1] : null;
}

/** Extracts the Jenkins job name, preferring the log URL over the screenshot URL. */
export function jobNameFromLinks(
  logLink: string | null | undefined,
  screenshotLink: string | null | undefined
): string | null {
  return extractJobName(logLink) ?? extractJobName(screenshotLink);
}
