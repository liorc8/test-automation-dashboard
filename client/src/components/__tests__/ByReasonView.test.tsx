import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import ByReasonView from "../ByReasonView";
import type { ReasonGroup } from "../../types/FailuresByReason";

vi.mock("../../services/apiService", () => ({
  getExpandedLog: vi.fn(() => new Promise(() => {})),
}));

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

function renderView(areaName = "LOD") {
  return render(
    <ByReasonView
      reasons={reasons}
      areaName={areaName}
      onImageClick={() => {}}
      onExpandLog={() => {}}
      onOpenHistory={() => {}}
      testRailUrlFor={() => null}
    />,
  );
}

function addReasonNote(region: HTMLElement, text: string) {
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
    // After expanding, the grouped tests are shown.
    const region = screen.getByRole("region");
    expect(within(region).getByText("Test_A")).toBeInTheDocument();
  });
});

describe("ByReasonView — inline notes", () => {
  it("shows the reason note label when collapsed but hides the write actions", () => {
    renderView("BR1");
    const summary = screen.getByRole("button", { name: /FATAL element not found/i });

    fireEvent.click(summary); // expand → reason-level Add note action is available
    addReasonNote(screen.getByRole("region"), "infra note");

    fireEvent.click(summary); // collapse
    expect(summary).toHaveAttribute("aria-expanded", "false");
    // Label stays readable in the collapsed list view…
    expect(screen.getAllByText("infra note").length).toBeGreaterThan(0);
    // …but no write actions are rendered while collapsed.
    expect(screen.queryByRole("button", { name: "Add note" })).toBeNull();
  });

  it("cascades an added reason note to all child test rows and clears them on delete", () => {
    renderView("BR2");
    const summary = screen.getByRole("button", { name: /FATAL element not found/i });
    fireEvent.click(summary);
    const region = screen.getByRole("region");

    addReasonNote(region, "cascade-xyz");
    // Reason chip + Test_A row chip + Test_B row chip.
    expect(screen.getAllByText("cascade-xyz")).toHaveLength(3);

    fireEvent.click(within(region).getByLabelText("Delete note"));
    expect(screen.queryByText("cascade-xyz")).toBeNull();
  });
});
