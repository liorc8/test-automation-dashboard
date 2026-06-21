import type { RecentFailureGroupedItem } from "./RecentFailuresGrouped";

// Alma Oops items reuse the grouped-failure shape (so they render in FailureCard)
// plus the originating area and an occurrences count.
export type AlmaOopsItem = RecentFailureGroupedItem & {
  area: string;
  occurrences: number;
};

export type AlmaOopsResponse = {
  env: string;
  windowDays: number;
  items: AlmaOopsItem[];
};
