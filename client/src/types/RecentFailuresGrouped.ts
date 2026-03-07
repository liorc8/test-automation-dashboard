export type RecentFailureGroupedItem = {
  testName: string;
  failCount: number;
  lastFailedOn: string | null;
  reasons: string[];
  lastFailure: {
    server: string | null;
    almaVersion: string | null;
    buildNumber: number | null;
    logLink: string | null;
    screenshotLink: string | null;
  };
};

export type AreaRecentFailuresGroupedResponse = {
  area: string;
  windowDays: number;
  reasonsMax: number;
  items: RecentFailureGroupedItem[];
};