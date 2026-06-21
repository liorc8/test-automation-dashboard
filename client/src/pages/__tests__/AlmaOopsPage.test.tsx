import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import * as api from "../../services/apiService";
import AlmaOopsPage from "../AlmaOopsPage";

vi.mock("../../services/apiService", () => ({
  getAlmaOops: vi.fn(),
  // FailureCard imports this; not exercised here but must exist on the mock.
  getExpandedLog: vi.fn(() => new Promise(() => {})),
}));

const oopsItem = {
  area: "LOD",
  testName: "Oops_Test_1",
  occurrences: 5,
  failCount: 5,
  lastFailedOn: "2026-06-10",
  jobName: null,
  reasons: [{ text: "FATAL Message appear", lastDate: "2026-06-10", screenshotLink: null, logLink: null }],
  lastFailure: { server: "QAC01", almaVersion: null, buildNumber: null, logLink: null, screenshotLink: null },
};

function renderPage() {
  return render(
    <MemoryRouter>
      <AlmaOopsPage />
    </MemoryRouter>,
  );
}

describe("AlmaOopsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("shows a loading indicator before data resolves", () => {
    vi.mocked(api.getAlmaOops).mockReturnValue(new Promise(() => {}) as any);
    renderPage();
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });

  it("renders failure cards with the occurrences badge from mocked data", async () => {
    vi.mocked(api.getAlmaOops).mockResolvedValue({ env: "qa", windowDays: 10, items: [oopsItem] } as any);

    renderPage();
    expect(await screen.findByText("Oops_Test_1")).toBeInTheDocument();
    expect(screen.getByText(/Occurred 5 times/i)).toBeInTheDocument();
  });

  it("shows an empty state when there are no rows", async () => {
    vi.mocked(api.getAlmaOops).mockResolvedValue({ env: "qa", windowDays: 10, items: [] } as any);
    renderPage();
    expect(await screen.findByText(/No Alma oops failures/i)).toBeInTheDocument();
  });

  it("filters the cards by the search query", async () => {
    const other = { ...oopsItem, testName: "Different_Test", area: "ERM" };
    vi.mocked(api.getAlmaOops).mockResolvedValue({ env: "qa", windowDays: 10, items: [oopsItem, other] } as any);

    renderPage();
    expect(await screen.findByText("Oops_Test_1")).toBeInTheDocument();
    expect(screen.getByText("Different_Test")).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText(/Search/i), { target: { value: "Different" } });

    expect(screen.queryByText("Oops_Test_1")).toBeNull();
    expect(screen.getByText("Different_Test")).toBeInTheDocument();
  });
});
