jest.mock("../db", () => ({ execute: jest.fn() }));

import { execute } from "../db";
import { getAreaFailuresByReason } from "../services/areaFailuresByReasonService";

const mockExecute = execute as jest.Mock;

describe("areaFailuresByReasonService.getAreaFailuresByReason", () => {
  it("groups tests by shared FATAL reason and drops one-off failures", async () => {
    mockExecute.mockResolvedValue({
      rows: [
        { TESTNAME: "T1", FAILURETEXT: "log line\nFATAL boom happened", ENDINGTIMEUNIX: 1000, TESTEDON: null, SERVER: "QAC01", ALMAVERSION: "v1", BUILDNUMBER: 1, LOGLINK: null, SCREENSHOTLINK: null },
        { TESTNAME: "T2", FAILURETEXT: "other prefix\nFATAL boom happened", ENDINGTIMEUNIX: 2000, TESTEDON: null, SERVER: "QAC02", ALMAVERSION: "v1", BUILDNUMBER: 2, LOGLINK: null, SCREENSHOTLINK: null },
        { TESTNAME: "T3", FAILURETEXT: "FATAL unique thing", ENDINGTIMEUNIX: 3000, TESTEDON: null, SERVER: "QAC01", ALMAVERSION: "v1", BUILDNUMBER: 3, LOGLINK: null, SCREENSHOTLINK: null },
      ],
    });

    const result = await getAreaFailuresByReason("LOD", 10, "qa");

    // Only the reason shared by 2+ tests survives the HAVING >= 2 filter.
    expect(result.reasons).toHaveLength(1);
    expect(result.reasons[0].reasonText).toBe("FATAL boom happened");
    expect(result.reasons[0].failCount).toBe(2);
    expect(result.reasons[0].tests.map((t: any) => t.testName).sort()).toEqual(["T1", "T2"]);
  });

  it("binds the area and daysBack window", async () => {
    mockExecute.mockResolvedValue({ rows: [] });
    await getAreaFailuresByReason("LOD", 10, "qa");
    expect(mockExecute).toHaveBeenCalledWith(expect.any(String), { area: "LOD", daysBack: 10 });
  });

  it("returns no reasons when nothing is shared", async () => {
    mockExecute.mockResolvedValue({
      rows: [
        { TESTNAME: "A", FAILURETEXT: "FATAL only once", ENDINGTIMEUNIX: 1, TESTEDON: null, SERVER: null, ALMAVERSION: null, BUILDNUMBER: null, LOGLINK: null, SCREENSHOTLINK: null },
      ],
    });
    const result = await getAreaFailuresByReason("LOD", 10, "qa");
    expect(result.reasons).toEqual([]);
  });
});
