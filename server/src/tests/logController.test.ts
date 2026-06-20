jest.mock("../services/logParserService", () => ({ expandLog: jest.fn() }));

import { Request, Response } from "express";
import { expandLog } from "../services/logParserService";
import { expandLogHandler } from "../controllers/logController";

const mockExpand = expandLog as jest.Mock;

function mockRes() {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
}

describe("expandLogHandler", () => {
  it("returns 400 when logUrl is missing", async () => {
    const req = { query: {} } as unknown as Request;
    const res = mockRes();

    await expandLogHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ available: false }));
  });

  it("returns the parser result for a valid request", async () => {
    mockExpand.mockResolvedValue({ available: true, lines: ["a", "b"], source: "parsed" });
    const req = { query: { logUrl: "http://x/log", testName: "T" } } as unknown as Request;
    const res = mockRes();

    await expandLogHandler(req, res);

    expect(mockExpand).toHaveBeenCalledWith("http://x/log", "T");
    expect(res.json).toHaveBeenCalledWith({ available: true, lines: ["a", "b"], source: "parsed" });
  });

  it("returns 500 when the parser throws", async () => {
    mockExpand.mockRejectedValue(new Error("boom"));
    jest.spyOn(console, "error").mockImplementation(() => {});
    const req = { query: { logUrl: "http://x/log" } } as unknown as Request;
    const res = mockRes();

    await expandLogHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});
