jest.mock("../db", () => ({ execute: jest.fn() }));

import { execute } from "../db";
import { getNotes, createNote, deleteNote, NoteLimitError, MAX_NOTES_PER_ITEM } from "../services/notesService";

const mockExecute = execute as jest.Mock;

beforeEach(() => mockExecute.mockReset());

describe("notesService.getNotes", () => {
  it("maps DB rows into FailureNote objects", async () => {
    mockExecute.mockResolvedValue({
      rows: [
        {
          NOTE_ID: 7,
          TEST_NAME: "MyTest",
          FAILURE_REASON: "FATAL boom",
          NOTE_CONTENT: "look into URM-1",
          CREATED_AT: new Date("2026-06-22T00:00:00Z"),
        },
        { NOTE_ID: 8, TEST_NAME: null, FAILURE_REASON: "FATAL boom", NOTE_CONTENT: "global", CREATED_AT: null },
      ],
    });

    const notes = await getNotes();

    expect(notes).toHaveLength(2);
    expect(notes[0]).toMatchObject({ noteId: 7, testName: "MyTest", failureReason: "FATAL boom", noteContent: "look into URM-1" });
    expect(notes[1]).toMatchObject({ noteId: 8, testName: null, createdAt: null });
  });

  it("returns an empty array when there are no rows", async () => {
    mockExecute.mockResolvedValue({ rows: [] });
    expect(await getNotes()).toEqual([]);
  });
});

describe("notesService.createNote", () => {
  it("inserts and returns the new noteId when under the limit", async () => {
    mockExecute
      .mockResolvedValueOnce({ rows: [{ CNT: 2 }] })          // count query
      .mockResolvedValueOnce({ outBinds: { noteId: [99] } });  // insert

    const id = await createNote("MyTest", "FATAL boom", "note text");

    expect(id).toBe(99);
    expect(mockExecute).toHaveBeenCalledTimes(2);
    // The INSERT runs with autoCommit.
    const insertCall = mockExecute.mock.calls[1];
    expect(insertCall[0]).toMatch(/INSERT INTO FAILURE_NOTES/i);
    expect(insertCall[2]).toEqual(expect.objectContaining({ autoCommit: true }));
  });

  it("normalizes the count query for a global (null testName) note", async () => {
    mockExecute
      .mockResolvedValueOnce({ rows: [{ CNT: 0 }] })
      .mockResolvedValueOnce({ outBinds: { noteId: [1] } });

    await createNote(null, "FATAL boom", "global note");

    const countBinds = mockExecute.mock.calls[0][1];
    expect(countBinds).toEqual(expect.objectContaining({ testName: null, failureReason: "FATAL boom" }));
  });

  it(`throws NoteLimitError and does NOT insert at the ${MAX_NOTES_PER_ITEM}-note cap`, async () => {
    mockExecute.mockResolvedValueOnce({ rows: [{ CNT: MAX_NOTES_PER_ITEM }] }); // already at cap

    await expect(createNote("MyTest", "FATAL boom", "one too many")).rejects.toBeInstanceOf(NoteLimitError);
    // Only the count query ran — no INSERT.
    expect(mockExecute).toHaveBeenCalledTimes(1);
  });
});

describe("notesService.deleteNote", () => {
  it("returns true when a row was deleted", async () => {
    mockExecute.mockResolvedValue({ rowsAffected: 1 });
    expect(await deleteNote(5)).toBe(true);
    expect(mockExecute.mock.calls[0][2]).toEqual(expect.objectContaining({ autoCommit: true }));
  });

  it("returns false when nothing matched", async () => {
    mockExecute.mockResolvedValue({ rowsAffected: 0 });
    expect(await deleteNote(404)).toBe(false);
  });
});
