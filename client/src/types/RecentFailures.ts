export type RecentFailureItem = {
  runDay: string;
  testedOn: string;              
  testName: string;
  server: string;
  almaVersion: string;
  buildNumber?: number;
  buildData?: string;
  logLink?: string;
  screenshotLink?: string;
  failureTextPreview?: string;
};

export type AreaRecentFailuresResponse = {
  area: string;
  windowDays: number;
  items: RecentFailureItem[];
};
