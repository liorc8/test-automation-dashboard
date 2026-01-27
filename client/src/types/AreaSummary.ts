export interface AreaTotals {
  passed: number;
  failed: number;
  total: number;
  passRate: number;
}

export interface LastRunInfo {
  testedOn: string | null;
  buildNumber: number | null;
  server: string | null;
  almaVersion: string | null;
}

export interface RecentFailure {
  testedOn: string | null;
  testName: string | null;
  server: string | null;
  almaVersion: string | null;
  buildNumber: number | null;
  logLink: string | null;
  screenshotLink: string | null;
  failureTextPreview: string | null;
}

export interface AreaSummaryResponse {
  area: string;
  windowDays: number;
  totals: AreaTotals;
  lastRun: LastRunInfo;
  recentFailures: RecentFailure[];
}