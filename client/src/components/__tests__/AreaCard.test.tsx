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
        trendData={[{ date: "2026-06-10", passed: 1, failed: 0, total: 1 }]}
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
});
