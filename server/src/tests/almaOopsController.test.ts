jest.mock("../services/almaOopsService", () => ({ getAlmaOops: jest.fn() }));

import { Request, Response } from "express";
import { getAlmaOops } from "../services/almaOopsService";
import { getAlmaOopsHandler } from "../controllers/almaOopsController";

const mockGet = getAlmaOops as jest.Mock;

function mockRes() {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
}

describe("getAlmaOopsHandler", () => {
  it("returns 200 with the data", async () => {
    mockGet.mockResolvedValue({ env: "qa", windowDays: 10, items: [] });
    const req = { query: { env: "qa" } } as unknown as Request;
    const res = mockRes();

    await getAlmaOopsHandler(req, res);

    expect(mockGet).toHaveBeenCalledWith("qa");
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ items: [] }));
  });

  it("returns 500 when the service throws", async () => {
    mockGet.mockRejectedValue(new Error("boom"));
    jest.spyOn(console, "error").mockImplementation(() => {});
    const req = { query: {} } as unknown as Request;
    const res = mockRes();

    await getAlmaOopsHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});
