import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import InlineNotes from "../InlineNotes";
import * as api from "../../services/apiService";
import { __resetNotesCacheForTests } from "../../hooks/useNotes";

// In-memory fake backend (test-file scoped, reset before each test).
let db: Array<{ noteId: number; testName: string | null; failureReason: string; noteContent: string; createdAt: string | null }>;
let seq: number;

vi.mock("../../services/apiService", () => ({
  getNotes: vi.fn(async () => db),
  createNote: vi.fn(async (testName: string | null, failureReason: string, content: string) => {
    const note = { noteId: ++seq, testName: testName ?? null, failureReason, noteContent: content, createdAt: null };
    db.push(note);
    return note;
  }),
  deleteNote: vi.fn(async (id: number) => { db = db.filter((n) => n.noteId !== id); }),
}));

beforeEach(() => { db = []; seq = 0; __resetNotesCacheForTests(); vi.clearAllMocks(); });
afterEach(() => vi.unstubAllEnvs());

async function addNote(text: string) {
  fireEvent.click(screen.getByRole("button", { name: "Add note" }));
  fireEvent.change(screen.getByPlaceholderText(/Note for this/i), { target: { value: text } });
  fireEvent.click(screen.getByLabelText("Save note"));
}

describe("InlineNotes — visibility logic", () => {
  it("renders Add/Edit/Delete actions in the editable (expanded) view", async () => {
    render(<InlineNotes testName="Test_A" failureReason="reasonA" />);

    await addNote("remember to retry");

    expect(await screen.findByText("remember to retry")).toBeInTheDocument();
    expect(screen.getByLabelText("Edit note")).toBeInTheDocument();
    expect(screen.getByLabelText("Delete note")).toBeInTheDocument();
    // Unique (test, reason) → Add hidden once a note exists.
    expect(screen.queryByRole("button", { name: "Add note" })).toBeNull();
  });

  it("read-only (collapsed) view shows labels but no write actions", async () => {
    db = [{ noteId: 1, testName: "Test_A", failureReason: "reasonA", noteContent: "collapsed label", createdAt: null }];
    render(<InlineNotes testName="Test_A" failureReason="reasonA" readOnly />);

    expect(await screen.findByText("collapsed label")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add note" })).toBeNull();
    expect(screen.queryByLabelText("Edit note")).toBeNull();
    expect(screen.queryByLabelText("Delete note")).toBeNull();
  });

  it("renders nothing in read-only mode when there are no notes", () => {
    const { container } = render(<InlineNotes testName="Test_X" failureReason="reasonX" readOnly />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("InlineNotes — backend wiring", () => {
  it("POSTs a general reason note with null testName", async () => {
    render(<InlineNotes failureReason="reasonA" />); // no testName → general

    await addNote("shared infra issue");
    expect(await screen.findByText("shared infra issue")).toBeInTheDocument();
    expect(api.createNote).toHaveBeenCalledWith(null, "reasonA", "shared infra issue");
  });

  it("DELETEs a note via its id", async () => {
    db = [{ noteId: 7, testName: "Test_A", failureReason: "reasonA", noteContent: "to delete", createdAt: null }];
    render(<InlineNotes testName="Test_A" failureReason="reasonA" />);

    fireEvent.click(await screen.findByLabelText("Delete note"));
    expect(api.deleteNote).toHaveBeenCalledWith(7);
  });
});

describe("InlineNotes — JIRA auto-linking", () => {
  it("turns a JIRA ticket id into a safe new-tab link", async () => {
    render(<InlineNotes testName="Test_A" failureReason="reasonA" />);

    await addNote("Fixes URM-88888");

    const link = await screen.findByRole("link", { name: "URM-88888" });
    expect(link.tagName).toBe("A");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link.getAttribute("rel")).toContain("noopener");
    expect(link.getAttribute("href")).toMatch(/URM-88888$/);
  });

  it("uses the mocked VITE_JIRA_BASE_URL for link hrefs", async () => {
    // Re-evaluate the module with the env stubbed so the base URL is picked up.
    vi.resetModules();
    vi.stubEnv("VITE_JIRA_BASE_URL", "https://jira.test/browse/");
    const { default: FreshInlineNotes } = await import("../InlineNotes");

    render(<FreshInlineNotes testName="Test_A" failureReason="reasonA" />);
    await addNote("see URM-5 for details");

    const link = await screen.findByRole("link", { name: "URM-5" });
    expect(link).toHaveAttribute("href", "https://jira.test/browse/URM-5");
  }, 15000);
});
