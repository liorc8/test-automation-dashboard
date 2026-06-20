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
