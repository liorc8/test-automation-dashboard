import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import * as api from "../../services/apiService";
import DashboardPage from "../DashboardPage";

vi.mock("../../services/apiService", () => ({
  getAreas: vi.fn(),
  getAreasDashboard: vi.fn(),
  getAllAreasDailyTrends: vi.fn(),
  searchTests: vi.fn(),
  getAreaDailyTrend: vi.fn(),
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <DashboardPage />
    </MemoryRouter>,
  );
}

describe("DashboardPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.mocked(api.getAllAreasDailyTrends).mockResolvedValue({ env: "qa", daysBack: 8, areas: {} } as any);
    vi.mocked(api.getAreaDailyTrend).mockResolvedValue({ areaName: "PRM", env: "qa", daysBack: 8, points: [] } as any);
    vi.mocked(api.searchTests).mockResolvedValue([] as any);
  });

  it("shows a loading indicator before data resolves", () => {
    vi.mocked(api.getAreas).mockReturnValue(new Promise(() => {}) as any);
    vi.mocked(api.getAreasDashboard).mockReturnValue(new Promise(() => {}) as any);
    renderPage();
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });

  it("renders an area card from mocked data", async () => {
    vi.mocked(api.getAreas).mockResolvedValue([{ id: "PRM", name: "PRM" }] as any);
    vi.mocked(api.getAreasDashboard).mockResolvedValue({
      env: "qa",
      daysBack: 8,
      items: [
        { area: "PRM", last: { passed: 8, failed: 2, total: 10, passRate: 80 }, health: { healthy: 7, medium: 1, bad: 1, dead: 1 } },
      ],
    } as any);

    renderPage();
    expect(await screen.findByText("PRM")).toBeInTheDocument();
  });

  it("hides areas that have zero tests", async () => {
    vi.mocked(api.getAreas).mockResolvedValue([{ id: "PRM", name: "PRM" }] as any);
    vi.mocked(api.getAreasDashboard).mockResolvedValue({
      env: "qa",
      daysBack: 8,
      items: [
        { area: "PRM", last: { passed: 0, failed: 0, total: 0, passRate: 0 }, health: { healthy: 0, medium: 0, bad: 0, dead: 0 } },
      ],
    } as any);

    renderPage();
    await screen.findByText("Automation Dashboard");
    expect(screen.queryByText("PRM")).toBeNull();
  });
});
