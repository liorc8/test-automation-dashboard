import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import ByReasonView from "../ByReasonView";
import * as api from "../../services/apiService";
import { __resetNotesCacheForTests } from "../../hooks/useNotes";
import type { ReasonGroup } from "../../types/FailuresByReason";

// In-memory fake notes backend.
let db: Array<{ noteId: number; testName: string | null; failureReason: string; noteContent: string; createdAt: string | null }>;
let seq: number;

vi.mock("../../services/apiService", () => ({
  getExpandedLog: vi.fn(() => new Promise(() => {})),
  getNotes: vi.fn(async () => db),
  createNote: vi.fn(async (testName: string | null, failureReason: string, content: string) => {
    const note = { noteId: ++seq, testName: testName ?? null, failureReason, noteContent: content, createdAt: null };
    db.push(note);
    return note;
  }),
  deleteNote: vi.fn(async (id: number) => { db = db.filter((n) => n.noteId !== id); }),
}));

beforeEach(() => { db = []; seq = 0; __resetNotesCacheForTests(); vi.clearAllMocks(); });

const reasons: ReasonGroup[] = [
  {
    reasonText: "FATAL element not found",
    failCount: 2,
    tests: [
      { testName: "Test_A", failCount: 1, lastFailedOn: "2026-06-10", reasons: [], lastFailure: { server: null, almaVersion: null, buildNumber: null, logLink: null, screenshotLink: null } },
      { testName: "Test_B", failCount: 1, lastFailedOn: "2026-06-10", reasons: [], lastFailure: { server: null, almaVersion: null, buildNumber: null, logLink: null, screenshotLink: null } },
    ],
  },
];

function renderView() {
  return render(
    <ByReasonView
      reasons={reasons}
      areaName="LOD"
      onImageClick={() => {}}
      onExpandLog={() => {}}
      onOpenHistory={() => {}}
      testRailUrlFor={() => null}
    />,
  );
}

async function addReasonNote(region: HTMLElement, text: string) {
  fireEvent.click(within(region).getByRole("button", { name: "Add note" }));
  fireEvent.change(within(region).getByPlaceholderText(/Note for this reason/i), { target: { value: text } });
  fireEvent.click(within(region).getByLabelText("Save note"));
}

describe("ByReasonView", () => {
  it("renders the reason header and affected-test badge", () => {
    renderView();
    expect(screen.getByText("FATAL element not found")).toBeInTheDocument();
    expect(screen.getByText("2 tests")).toBeInTheDocument();
  });

  it("is collapsed by default and expands on click", () => {
    renderView();
    const summary = screen.getByRole("button", { name: /FATAL element not found/i });
    expect(summary).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(summary);
    expect(summary).toHaveAttribute("aria-expanded", "true");
    const region = screen.getByRole("region");
    expect(within(region).getByText("Test_A")).toBeInTheDocument();
  });
});

describe("ByReasonView — inline notes", () => {
  it("adds a general reason note (null testName) and shows it collapsed without write actions", async () => {
    renderView();
    const summary = screen.getByRole("button", { name: /FATAL element not found/i });

    fireEvent.click(summary); // expand → reason-level Add note action available
    await addReasonNote(screen.getByRole("region"), "infra note");
    expect(await screen.findByText("infra note")).toBeInTheDocument();
    expect(api.createNote).toHaveBeenCalledWith(null, "FATAL element not found", "infra note");

    fireEvent.click(summary); // collapse
    expect(summary).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByText("infra note")).toBeInTheDocument();          // label still readable
    expect(screen.queryByRole("button", { name: "Add note" })).toBeNull(); // no write actions
  });
});
