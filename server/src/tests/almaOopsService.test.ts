jest.mock("../db", () => ({ execute: jest.fn() }));

import { execute } from "../db";
import { getAlmaOops } from "../services/almaOopsService";

const mockExecute = execute as jest.Mock;

describe("almaOopsService.getAlmaOops", () => {
  it("maps aggregated rows and exposes the occurrences count", async () => {
    mockExecute.mockResolvedValue({
      rows: [
        {
          AREA: "LOD",
          TESTNAME: "MyTest",
          OCCURRENCES: 5,
          LAST_ENDING_UNIX: 1000,
          LAST_TESTEDON: null,
          SERVER: "QAC01",
          ALMAVERSION: "v1",
          BUILDNUMBER: 3,
          LOGLINK: "http://log",
          SCREENSHOTLINK: null,
          FAILURETEXT: "FATAL Message appear popup",
        },
      ],
    });

    const result = await getAlmaOops("qa");

    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      area: "LOD",
      testName: "MyTest",
      occurrences: 5,
      failCount: 5, // mirrors occurrences for the shared FailureCard badge
    });
    expect(result.windowDays).toBe(10);
  });

  it("applies the strict legacy filters plus the 10-day limit and aggregation", async () => {
    mockExecute.mockResolvedValue({ rows: [] });
    await getAlmaOops("qa");

    const sql = mockExecute.mock.calls[0][0] as string;
    // 10-day window + aggregation
    expect(sql).toMatch(/SYSDATE\s*-\s*10/);
    expect(sql).toMatch(/COUNT\(\*\)\s+AS\s+OCCURRENCES/i);
    expect(sql).toMatch(/GROUP BY/i);
    // strict legacy: latest-run-only membership + case-sensitive FATAL + Message appear
    expect(sql).toMatch(/ROW_NUMBER\(\)\s+OVER/i);
    expect(sql).toContain("LIKE '%FATAL%'");
    expect(sql).toContain("LIKE '%Message appear%'");
  });

  it("returns an empty list when there are no rows", async () => {
    mockExecute.mockResolvedValue({ rows: [] });
    const result = await getAlmaOops("release");
    expect(result.items).toEqual([]);
  });
});
