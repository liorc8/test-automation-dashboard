export type ReasonEntry = {
  text: string;
  screenshotLink: string | null;
  logLink: string | null;
};

export type RecentFailureGroupedItem = {
  testName: string;
  failCount: number;
  lastFailedOn: string | null;
  reasons: ReasonEntry[];
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
