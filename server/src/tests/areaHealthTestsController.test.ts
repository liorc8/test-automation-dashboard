jest.mock("../services/areasService", () => ({ isKnownArea: jest.fn() }));
jest.mock("../services/areaHealthTestsService", () => ({ getAreaHealthTests: jest.fn() }));

import { Request, Response } from "express";
import { isKnownArea } from "../services/areasService";
import { getAreaHealthTests } from "../services/areaHealthTestsService";
import { getAreaHealthTestsHandler } from "../controllers/areaHealthTestsController";

const mockIsKnown = isKnownArea as jest.Mock;
const mockGet = getAreaHealthTests as jest.Mock;

function mockRes() {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
}

describe("getAreaHealthTestsHandler", () => {
  it("returns 200 with tests for a valid request", async () => {
    mockIsKnown.mockResolvedValue(true);
    mockGet.mockResolvedValue([{ testName: "X" }]);
    const req = { params: { areaName: "LOD" }, query: { bucket: "healthy", env: "qa" } } as unknown as Request;
    const res = mockRes();

    await getAreaHealthTestsHandler(req, res);

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ areaName: "LOD", bucket: "healthy", tests: [{ testName: "X" }] }));
    expect(res.status).not.toHaveBeenCalled();
  });

  it("returns 404 for an unknown area", async () => {
    mockIsKnown.mockResolvedValue(false);
    const req = { params: { areaName: "NOPE" }, query: { bucket: "healthy" } } as unknown as Request;
    const res = mockRes();

    await getAreaHealthTestsHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("returns 400 for an invalid bucket", async () => {
    mockIsKnown.mockResolvedValue(true);
    const req = { params: { areaName: "LOD" }, query: { bucket: "bogus" } } as unknown as Request;
    const res = mockRes();

    await getAreaHealthTestsHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("returns 500 when the service throws", async () => {
    mockIsKnown.mockResolvedValue(true);
    mockGet.mockRejectedValue(new Error("db down"));
    const req = { params: { areaName: "LOD" }, query: { bucket: "healthy" } } as unknown as Request;
    const res = mockRes();
    jest.spyOn(console, "error").mockImplementation(() => {});

    await getAreaHealthTestsHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});
