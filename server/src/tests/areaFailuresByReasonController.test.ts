jest.mock("../services/areasService", () => ({ isKnownArea: jest.fn() }));
jest.mock("../services/areaFailuresByReasonService", () => ({ getAreaFailuresByReason: jest.fn() }));

import { Request, Response } from "express";
import { isKnownArea } from "../services/areasService";
import { getAreaFailuresByReason } from "../services/areaFailuresByReasonService";
import { getAreaFailuresByReasonHandler } from "../controllers/areaFailuresByReasonController";

const mockIsKnown = isKnownArea as jest.Mock;
const mockGet = getAreaFailuresByReason as jest.Mock;

function mockRes() {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
}

describe("getAreaFailuresByReasonHandler", () => {
  it("returns 200 with grouped reasons", async () => {
    mockIsKnown.mockResolvedValue(true);
    mockGet.mockResolvedValue({ area: "LOD", reasons: [] });
    const req = { params: { areaName: "LOD" }, query: { env: "qa", windowDays: "10" } } as unknown as Request;
    const res = mockRes();

    await getAreaFailuresByReasonHandler(req, res);

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ area: "LOD" }));
  });

  it("returns 404 for an unknown area", async () => {
    mockIsKnown.mockResolvedValue(false);
    const req = { params: { areaName: "NOPE" }, query: {} } as unknown as Request;
    const res = mockRes();

    await getAreaFailuresByReasonHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("returns 400 for an invalid windowDays", async () => {
    mockIsKnown.mockResolvedValue(true);
    const req = { params: { areaName: "LOD" }, query: { windowDays: "-5" } } as unknown as Request;
    const res = mockRes();

    await getAreaFailuresByReasonHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("returns 500 when the service throws", async () => {
    mockIsKnown.mockResolvedValue(true);
    mockGet.mockRejectedValue(new Error("boom"));
    const req = { params: { areaName: "LOD" }, query: {} } as unknown as Request;
    const res = mockRes();
    jest.spyOn(console, "error").mockImplementation(() => {});

    await getAreaFailuresByReasonHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});
