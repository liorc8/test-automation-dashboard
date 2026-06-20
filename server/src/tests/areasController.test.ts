jest.mock("../services/areasService", () => ({ getAreas: jest.fn() }));

import { Request, Response } from "express";
import { getAreas } from "../services/areasService";
import { AREAS } from "../config/areas";
import { getAreasHandler } from "../controllers/areasController";

const mockGetAreas = getAreas as jest.Mock;

function mockRes() {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
}

describe("getAreasHandler", () => {
  it("serves the dynamic area list", async () => {
    mockGetAreas.mockResolvedValue([{ id: "PRM", name: "PRM" }]);
    const res = mockRes();

    await getAreasHandler({} as Request, res);

    expect(res.json).toHaveBeenCalledWith([{ id: "PRM", name: "PRM" }]);
  });

  it("falls back to the static config when the DB query fails", async () => {
    mockGetAreas.mockRejectedValue(new Error("db down"));
    jest.spyOn(console, "error").mockImplementation(() => {});
    const res = mockRes();

    await getAreasHandler({} as Request, res);

    expect(res.json).toHaveBeenCalledWith(AREAS);
  });
});
