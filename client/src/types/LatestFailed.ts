export type LatestFailedTestItem = {
  testName: string;
  server: string;
  testedOn: string | null;
  failureText: string | null;
  logLink: string | null;
  screenshotLink: string | null;
  almaVersion: string | null;
  buildNumber: number | null;
};

export type LatestFailedByServer = {
  server: string;
  tests: LatestFailedTestItem[];
};

export type LatestFailedTestsResponse = {
  area: string;
  env: string;
  totalCount: number;
  servers: LatestFailedByServer[];
};
