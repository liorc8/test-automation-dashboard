jest.mock("../services/notesService", () => {
  class NoteLimitError extends Error {}
  return {
    getNotes: jest.fn(),
    createNote: jest.fn(),
    deleteNote: jest.fn(),
    NoteLimitError,
  };
});

import { Request, Response } from "express";
import { getNotes, createNote, deleteNote, NoteLimitError } from "../services/notesService";
import { getNotesHandler, createNoteHandler, deleteNoteHandler } from "../controllers/notesController";

const mockGet = getNotes as jest.Mock;
const mockCreate = createNote as jest.Mock;
const mockDelete = deleteNote as jest.Mock;

function mockRes() {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res as Response;
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, "error").mockImplementation(() => {});
});

describe("getNotesHandler", () => {
  it("returns 200 with the notes", async () => {
    mockGet.mockResolvedValue([{ noteId: 1 }]);
    const res = mockRes();
    await getNotesHandler({} as Request, res);
    expect(res.json).toHaveBeenCalledWith([{ noteId: 1 }]);
  });

  it("returns 500 when the service throws", async () => {
    mockGet.mockRejectedValue(new Error("boom"));
    const res = mockRes();
    await getNotesHandler({} as Request, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe("createNoteHandler", () => {
  it("creates a note and returns 201", async () => {
    mockCreate.mockResolvedValue(55);
    const req = { body: { testName: "T1", failureReason: "FATAL", content: "hi" } } as Request;
    const res = mockRes();

    await createNoteHandler(req, res);

    expect(mockCreate).toHaveBeenCalledWith("T1", "FATAL", "hi");
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ noteId: 55, testName: "T1" }));
  });

  it("normalizes empty testName to null (global note)", async () => {
    mockCreate.mockResolvedValue(1);
    const req = { body: { testName: "   ", failureReason: "FATAL", content: "global" } } as Request;
    const res = mockRes();

    await createNoteHandler(req, res);

    expect(mockCreate).toHaveBeenCalledWith(null, "FATAL", "global");
  });

  it("returns 400 when failureReason is missing", async () => {
    const req = { body: { content: "hi" } } as Request;
    const res = mockRes();
    await createNoteHandler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("returns 400 when content is missing", async () => {
    const req = { body: { failureReason: "FATAL" } } as Request;
    const res = mockRes();
    await createNoteHandler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("returns 400 when the 5-note limit is exceeded", async () => {
    mockCreate.mockRejectedValue(new NoteLimitError("Maximum of 5 notes per item reached."));
    const req = { body: { testName: "T1", failureReason: "FATAL", content: "6th" } } as Request;
    const res = mockRes();

    await createNoteHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringMatching(/5 notes/i) }));
  });

  it("returns 500 on an unexpected service error", async () => {
    mockCreate.mockRejectedValue(new Error("db down"));
    const req = { body: { testName: "T1", failureReason: "FATAL", content: "x" } } as Request;
    const res = mockRes();
    await createNoteHandler(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe("deleteNoteHandler", () => {
  it("returns 204 when a note is deleted", async () => {
    mockDelete.mockResolvedValue(true);
    const req = { params: { id: "5" } } as unknown as Request;
    const res = mockRes();

    await deleteNoteHandler(req, res);

    expect(mockDelete).toHaveBeenCalledWith(5);
    expect(res.status).toHaveBeenCalledWith(204);
  });

  it("returns 404 when the note does not exist", async () => {
    mockDelete.mockResolvedValue(false);
    const req = { params: { id: "999" } } as unknown as Request;
    const res = mockRes();
    await deleteNoteHandler(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("returns 400 for a non-positive id", async () => {
    const req = { params: { id: "abc" } } as unknown as Request;
    const res = mockRes();
    await deleteNoteHandler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(mockDelete).not.toHaveBeenCalled();
  });
});
