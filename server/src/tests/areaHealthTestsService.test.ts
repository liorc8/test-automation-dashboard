jest.mock("../db", () => ({ execute: jest.fn() }));

import { execute } from "../db";
import { getAreaHealthTests } from "../services/areaHealthTestsService";

const mockExecute = execute as jest.Mock;

describe("areaHealthTestsService.getAreaHealthTests", () => {
  it("maps rows into typed health-test items", async () => {
    mockExecute.mockResolvedValue({
      rows: [
        {
          TESTNAME: "MyTest",
          PASSED: "false",
          LAST_RUN_DATE: "10/06/2026",
          LAST_SUCCESS: "01/06/2026",
          LAST_FAILURE: "10/06/2026",
          SUCCESSES: 3,
          FAILS: 7,
          PASS_RATE: 30,
        },
      ],
    });

    const items = await getAreaHealthTests("LOD", "medium", "qa", 8);

    expect(items).toEqual([
      {
        testName: "MyTest",
        passRate: 30,
        successes: 3,
        fails: 7,
        lastRunDate: "10/06/2026",
        lastPassed: false,
        lastSuccess: "01/06/2026",
        lastFailure: "10/06/2026",
      },
    ]);
  });

  it("binds the area and daysBack window", async () => {
    mockExecute.mockResolvedValue({ rows: [] });

    await getAreaHealthTests("LOD", "healthy", "qa", 8);

    expect(mockExecute).toHaveBeenCalledWith(expect.any(String), { area: "LOD", daysBack: 8 });
  });

  it("returns an empty array when there are no rows", async () => {
    mockExecute.mockResolvedValue({ rows: [] });
    const items = await getAreaHealthTests("LOD", "dead", "qa", 8);
    expect(items).toEqual([]);
  });
});
