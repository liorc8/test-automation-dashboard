jest.mock("../db", () => ({ execute: jest.fn() }));
jest.mock("../services/areasService", () => ({ getAreas: jest.fn() }));

import { execute } from "../db";
import { getAreas } from "../services/areasService";
import { getAreasDashboard } from "../services/dashboardService";

const mockExecute = execute as jest.Mock;
const mockGetAreas = getAreas as jest.Mock;

describe("dashboardService.getAreasDashboard", () => {
  it("transforms rows into per-area items and fills zeros for areas with no rows", async () => {
    mockExecute.mockResolvedValue({
      rows: [
        {
          AREA: "PRM",
          TOTAL: 10,
          LAST_PASSED: 8,
          LAST_FAILED: 2,
          HEALTHY_COUNT: 7,
          MEDIUM_COUNT: 1,
          BAD_COUNT: 1,
          DEAD_COUNT: 1,
        },
      ],
    });
    mockGetAreas.mockResolvedValue([
      { id: "PRM", name: "PRM" },
      { id: "EMPTY", name: "Empty" },
    ]);

    const result = await getAreasDashboard(8, "qa");

    const prm = result.items.find((i: any) => i.area === "PRM");
    const empty = result.items.find((i: any) => i.area === "EMPTY");

    expect(prm.last).toEqual({ passed: 8, failed: 2, total: 10, passRate: 80 });
    expect(prm.health).toEqual({ healthy: 7, medium: 1, bad: 1, dead: 1 });
    expect(empty.last).toEqual({ passed: 0, failed: 0, total: 0, passRate: 0 });
    expect(empty.health).toEqual({ healthy: 0, medium: 0, bad: 0, dead: 0 });
    expect(result.env).toBe("qa");
  });

  it("passes the daysBack bind through to the query", async () => {
    mockExecute.mockResolvedValue({ rows: [] });
    mockGetAreas.mockResolvedValue([]);

    await getAreasDashboard(8, "qa");

    expect(mockExecute).toHaveBeenCalledWith(expect.any(String), { daysBack: 8 });
  });
});
