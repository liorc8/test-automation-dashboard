import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import TestHistoryPage from "../TestHistoryPage";

vi.mock("../../services/apiService", () => ({
  getAreaTestRailIds: vi.fn(async () => ({ areaName: "LOD", env: "qa", baseUrl: "", ids: {} })),
  getTestHistory: vi.fn(async () => ({
    area: "LOD",
    testName: "MyTest",
    env: "qa",
    rows: [
      {
        testedOn: "2026-06-10T10:00:00",
        endingTimeUnix: null,
        passed: false,
        server: "QAC01",
        buildNumber: 1,
        almaVersion: "v1",
        failureText: "INFO start\nDEBUG clicking button\nFATAL element not found: #submit\nINFO teardown",
        logLink: null,
        screenshotLink: null,
      },
      {
        testedOn: "2026-06-09T10:00:00",
        endingTimeUnix: null,
        passed: false,
        server: "QAC01",
        buildNumber: 1,
        almaVersion: "v1",
        failureText: "Timeout waiting for selector\nDEBUG retry attempt",
        logLink: null,
        screenshotLink: null,
      },
    ],
  })),
}));

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/area/LOD/test/MyTest/history?env=qa"]}>
      <Routes>
        <Route path="/area/:areaName/test/:testName/history" element={<TestHistoryPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("TestHistoryPage — log extraction", () => {
  it("shows ONLY the FATAL line from a multi-line failure log", async () => {
    renderPage();
    expect(await screen.findByText("FATAL element not found: #submit")).toBeInTheDocument();
    // The surrounding non-FATAL lines must not be rendered.
    expect(screen.queryByText(/DEBUG clicking button/)).toBeNull();
    expect(screen.queryByText(/INFO teardown/)).toBeNull();
  });

  it("falls back to the first line when no FATAL is present", async () => {
    renderPage();
    expect(await screen.findByText("Timeout waiting for selector")).toBeInTheDocument();
    expect(screen.queryByText(/DEBUG retry attempt/)).toBeNull();
  });
});
