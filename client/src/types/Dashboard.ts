export type HealthBuckets = {
  healthy: number;
  medium:  number;
  bad:     number;
  dead:    number;
};

export type DashboardTotals = {
  passed: number;
  failed: number;
  total: number;     
  passRate: number;  
};

export type DashboardAreaItem = {
  area: string;
  lastRunDay: string | null;
  last: DashboardTotals;
  health: HealthBuckets;
};

export type AreasDashboardResponse = {
  daysBack: number;
  items: DashboardAreaItem[];
};
