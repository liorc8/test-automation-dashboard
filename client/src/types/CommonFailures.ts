import type { EnvFilter } from "../services/apiService";

export type CommonFailureExample = {
  area: string;
  testName: string;
  logLink: string | null;
  screenshotLink: string | null;
};

export type CommonFailureCluster = {
  failureText: string;
  occurrenceCount: number;
  affectedAreas: string[];
  examples: CommonFailureExample[];
};

export type CommonFailuresResponse = {
  env: EnvFilter;
  clusters: CommonFailureCluster[];
};
