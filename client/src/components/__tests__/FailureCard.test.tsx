import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import FailureCard from "../FailureCard";
import type { RecentFailureGroupedItem } from "../../types/RecentFailuresGrouped";

// Mock the API so "Expand Log" never hits the network.
vi.mock("../../services/apiService", () => ({
  // Pending promise keeps the loading state visible for assertion.
  getExpandedLog: vi.fn(() => new Promise(() => {})),
}));

const item: RecentFailureGroupedItem = {
  testName: "Login_ReorderSections_Test",
  failCount: 3,
  lastFailedOn: "2026-06-10",
  jobName: "SQA-EU01-LOD_Authority",
  reasons: [
    {
      text: "FATAL something exploded\n at line 1",
      lastDate: "2026-06-10",
      screenshotLink: null,
      logLink: "http://jenkins:8080/job/SQA-EU01-LOD_Authority/12/log",
    },
  ],
  lastFailure: {
    server: "QAC01",
    almaVersion: "v1",
    buildNumber: 12,
    logLink: "http://jenkins:8080/job/SQA-EU01-LOD_Authority/12/log",
    screenshotLink: null,
  },
};

function renderCard() {
  return render(
    <FailureCard
      item={item}
      index={0}
      onImageClick={() => {}}
      onExpandLog={() => {}}
      onOpenHistory={() => {}}
      testRailUrl="http://testrail/index.php?/tests/view/123"
      areaName="LOD"
    />,
  );
}

describe("FailureCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the test name and the four action buttons", () => {
    renderCard();
    expect(screen.getByText("Login_ReorderSections_Test")).toBeInTheDocument();
    // Expand Log + History are <button>; Full Log + TestRail are <a> (href links).
    expect(screen.getByRole("button", { name: /expand log/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /history/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /full log/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /testrail/i })).toBeInTheDocument();
  });

  it("shows the loading state when Expand Log is clicked", async () => {
    renderCard();
    fireEvent.click(screen.getByRole("button", { name: /expand log/i }));
    expect(await screen.findByText(/loading/i)).toBeInTheDocument();
  });
});
