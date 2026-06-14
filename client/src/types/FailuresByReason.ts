import type { RecentFailureGroupedItem } from "./RecentFailuresGrouped";

export type ReasonGroup = {
  reasonText: string;
  failCount: number;
  tests: RecentFailureGroupedItem[];
};

export type AreaFailuresByReasonResponse = {
  area: string;
  windowDays: number;
  env: string;
  reasons: ReasonGroup[];
};
