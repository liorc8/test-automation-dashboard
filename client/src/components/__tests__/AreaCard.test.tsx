import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AreaCard from "../AreaCard";

function renderCard() {
  return render(
    <MemoryRouter>
      <AreaCard
        areaName="LOD"
        displayName="Linked Open Data"
        passRate={85}
        total={20}
        passed={17}
        failed={3}
        env="qa"
        health={{ healthy: 7, medium: 5, bad: 3, dead: 5 }}
        // Providing trendData prevents the component's on-mount fetch.
        // The big % now reflects the LATEST day (last point): 17/20 = 85%.
        trendData={[
          { date: "2026-06-09", passed: 2, failed: 8, total: 10 },
          { date: "2026-06-10", passed: 17, failed: 3, total: 20 },
        ]}
      />
    </MemoryRouter>,
  );
}

describe("AreaCard", () => {
  it("renders the display name and pass rate", () => {
    renderCard();
    expect(screen.getByText("Linked Open Data")).toBeInTheDocument();
    expect(screen.getByText("85%")).toBeInTheDocument();
  });

  it("renders the health bucket labels with counts", () => {
    renderCard();
    expect(screen.getByText(/Healthy: 7/)).toBeInTheDocument();
    expect(screen.getByText(/Medium: 5/)).toBeInTheDocument();
    expect(screen.getByText(/Bad: 3/)).toBeInTheDocument();
    expect(screen.getByText(/Dead: 5/)).toBeInTheDocument();
  });

  it("shows the LAST day's pass rate, not the average of the trend", () => {
    // Averages would be ~57%/~50%; the latest day (3/4) must win → 75%.
    render(
      <MemoryRouter>
        <AreaCard
          areaName="LOD"
          displayName="Linked Open Data"
          passRate={99}
          total={4}
          passed={3}
          failed={1}
          env="qa"
          trendData={[
            { date: "2026-06-08", passed: 1, failed: 9, total: 10 },  // 10%
            { date: "2026-06-09", passed: 9, failed: 1, total: 10 },  // 90%
            { date: "2026-06-10", passed: 3, failed: 1, total: 4 },   // 75% (latest)
          ]}
        />
      </MemoryRouter>,
    );
    expect(screen.getByText("75%")).toBeInTheDocument();
    expect(screen.queryByText("99%")).toBeNull(); // not the prop/average
  });

  it("ignores trailing no-data days and uses the right-most day WITH data", () => {
    render(
      <MemoryRouter>
        <AreaCard
          areaName="LOD"
          displayName="Linked Open Data"
          passRate={0}
          total={0}
          passed={0}
          failed={0}
          env="qa"
          trendData={[
            { date: "2026-06-09", passed: 5, failed: 5, total: 10 },  // 50%
            { date: "2026-06-10", passed: 0, failed: 0, total: 0 },   // no data
          ]}
        />
      </MemoryRouter>,
    );
    expect(screen.getByText("50%")).toBeInTheDocument();
  });
});
