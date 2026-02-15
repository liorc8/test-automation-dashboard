// Shared types for Area/Env health time-series responses.

export type HealthSeriesPoint = {
  runDay: string;
  passed: number;
  failed: number;
  skipped: number;
  total: number;
  passRate: number;

  passedChart?: number;
  failedChart?: number;
  skippedChart?: number;
};

export type AreaHealthResponse = {
  area: string;
  windowDays: number;
  series: HealthSeriesPoint[];
};

export type EnvHealthResponse = {
  env: string;
  windowDays: number;
  series: HealthSeriesPoint[];
};
