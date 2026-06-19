jest.mock("../db", () => ({ execute: jest.fn() }));

import { execute } from "../db";
import { getAreas, isKnownArea } from "../services/areasService";

const mockExecute = execute as jest.Mock;

describe("areasService", () => {
  it("maps DB areas to friendly names, falling back to the raw id", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [{ AREA: "ALMAE" }, { AREA: "ZZZNEW" }] });

    const areas = await getAreas();

    expect(areas).toEqual([
      { id: "ALMAE", name: "Alma Starter" }, // override from config
      { id: "ZZZNEW", name: "ZZZNEW" },      // unknown -> raw id
    ]);
    expect(mockExecute).toHaveBeenCalledTimes(1);
  });

  it("serves cached results without re-querying the DB", async () => {
    const areas = await getAreas();
    expect(areas.length).toBe(2);
    expect(mockExecute).not.toHaveBeenCalled(); // cache hit (clearMocks reset the counter)
  });

  it("isKnownArea is case-insensitive against the cached list", async () => {
    expect(await isKnownArea("almae")).toBe(true);
    expect(await isKnownArea("DOES_NOT_EXIST")).toBe(false);
    expect(await isKnownArea(undefined)).toBe(false);
  });
});
