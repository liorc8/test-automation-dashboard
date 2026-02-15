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
  window: DashboardTotals & { daysBack: number };
};

export type AreasDashboardResponse = {
  daysBack: number;
  items: DashboardAreaItem[];
};
