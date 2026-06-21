import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import * as api from "../../services/apiService";
import RecentFailuresPage from "../Recentfailurespage";

vi.mock("../../services/apiService", () => ({
  getAreaRecentFailuresGrouped: vi.fn(),
  getAreaLatestFailedTests: vi.fn(),
  getAreaFailuresByReason: vi.fn(),
  getAreaTestRailIds: vi.fn(),
  getExpandedLog: vi.fn(() => new Promise(() => {})),
}));

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/failures/LOD?env=qa"]}>
      <Routes>
        <Route path="/failures/:areaName" element={<RecentFailuresPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

const groupedItem = {
  testName: "MyFailingTest",
  failCount: 2,
  lastFailedOn: "2026-06-10",
  jobName: "JobA",
  reasons: [{ text: "FATAL boom", lastDate: "2026-06-10", screenshotLink: null, logLink: null }],
  lastFailure: { server: "QAC01", almaVersion: null, buildNumber: null, logLink: null, screenshotLink: null },
};

describe("RecentFailuresPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.getAreaTestRailIds).mockResolvedValue({ areaName: "LOD", env: "qa", baseUrl: "", ids: {} } as any);
    vi.mocked(api.getAreaRecentFailuresGrouped).mockResolvedValue({ area: "LOD", windowDays: 10, reasonsMax: 4, items: [groupedItem] } as any);
    vi.mocked(api.getAreaLatestFailedTests).mockResolvedValue({
      area: "LOD", env: "qa", totalCount: 1,
      servers: [{ server: "QAC01", tests: [{ testName: "Srv_Test", server: "QAC01", testedOn: null, failureText: "FATAL x", logLink: null, screenshotLink: null, almaVersion: null, buildNumber: null }] }],
    } as any);
    vi.mocked(api.getAreaFailuresByReason).mockResolvedValue({
      area: "LOD", windowDays: 10, env: "qa",
      reasons: [{ reasonText: "FATAL shared reason", failCount: 2, tests: [groupedItem, { ...groupedItem, testName: "Other" }] }],
    } as any);
  });

  it("renders the header and the four view tabs", async () => {
    renderPage();
    expect(await screen.findByText("Recent Failures")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "All" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "By Server" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "By Job" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "By Reason" })).toBeInTheDocument();
  });

  it("renders failure cards from mocked data on the All tab", async () => {
    renderPage();
    expect(await screen.findByText("MyFailingTest")).toBeInTheDocument();
  });

  it("loads the By Server tab with collapsed accordions by default", async () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: "By Server" }));
    const summary = await screen.findByRole("button", { name: /QAC01/i });
    expect(summary).toHaveAttribute("aria-expanded", "false");
  });

  it("loads the By Reason tab with collapsed accordions by default", async () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: "By Reason" }));
    const summary = await screen.findByRole("button", { name: /FATAL shared reason/i });
    expect(summary).toHaveAttribute("aria-expanded", "false");
  });
});
