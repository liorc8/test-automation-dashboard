export type ReasonEntry = {
  text: string;
  lastDate: string | null;
  screenshotLink: string | null;
  logLink: string | null;
};

export type RecentFailureGroupedItem = {
  testName: string;
  failCount: number;
  lastFailedOn: string | null;
  jobName?: string | null;
  reasons: ReasonEntry[];
  lastFailure: {
    server: string | null;
    almaVersion: string | null;
    buildNumber: number | null;
    logLink: string | null;
    screenshotLink: string | null;
    /** TOTALRUNTIME from Oracle — consumed by formatDuration in the FailureCard. */
    duration?: number | null;
  };
};

export type AreaRecentFailuresGroupedResponse = {
  area: string;
  windowDays: number;
  reasonsMax: number;
  items: RecentFailureGroupedItem[];
};
