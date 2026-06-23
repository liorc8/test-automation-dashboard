import { describe, it, expect } from "vitest";
import { getNotesForItem } from "../useNotes";
import type { FailureNote } from "../../services/apiService";

const note = (over: Partial<FailureNote>): FailureNote => ({
  noteId: Math.floor(Math.random() * 1e6),
  testName: null,
  failureReason: "FATAL element not found",
  noteContent: "x",
  createdAt: null,
  ...over,
});

describe("getNotesForItem", () => {
  it("merges a global (testName null) note with a test sharing the same reason", () => {
    const all = [
      note({ noteId: 1, testName: null, failureReason: "FATAL element not found", noteContent: "global" }),
      note({ noteId: 2, testName: "Test_A", failureReason: "FATAL element not found", noteContent: "private A" }),
    ];

    const result = getNotesForItem(all, "Test_A", "FATAL element not found");
    expect(result.map((n) => n.noteId).sort()).toEqual([1, 2]);
  });

  it("matches permissively across whitespace / case / punctuation differences", () => {
    const all = [note({ noteId: 1, testName: null, failureReason: "FATAL element not found" })];

    // Same reason, but reformatted by a different endpoint.
    const result = getNotesForItem(all, "Test_A", "  FATAL: Element  Not Found!! ");
    expect(result.map((n) => n.noteId)).toEqual([1]);
  });

  it("matches when one reason string contains the other", () => {
    const all = [note({ noteId: 1, testName: null, failureReason: "FATAL element not found" })];

    const longer = "FATAL element not found at line 42 in module X";
    expect(getNotesForItem(all, "Test_A", longer).map((n) => n.noteId)).toEqual([1]);
  });

  it("does not leak a private note onto a different test", () => {
    const all = [note({ noteId: 2, testName: "Test_A", failureReason: "FATAL element not found", noteContent: "private A" })];

    expect(getNotesForItem(all, "Test_B", "FATAL element not found")).toEqual([]);
  });

  it("does not include global notes for a different reason", () => {
    const all = [note({ noteId: 1, testName: null, failureReason: "Timeout waiting for selector" })];

    expect(getNotesForItem(all, "Test_A", "FATAL element not found")).toEqual([]);
  });

  it("treats empty/whitespace testName as a global lookup", () => {
    const all = [
      note({ noteId: 1, testName: null, failureReason: "FATAL element not found", noteContent: "global" }),
      note({ noteId: 2, testName: "Test_A", failureReason: "FATAL element not found" }),
    ];

    // Reason-level (general) view: only global notes, never another test's private note.
    const result = getNotesForItem(all, "   ", "FATAL element not found");
    expect(result.map((n) => n.noteId)).toEqual([1]);
  });
});
