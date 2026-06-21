import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import SearchWithHistory from "../SearchWithHistory";

const KEY = "searchHistory:test";

function seed(items: string[]) {
  localStorage.setItem(KEY, JSON.stringify(items));
}

describe("SearchWithHistory", () => {
  beforeEach(() => localStorage.clear());

  it("calls onSearch as the user types", () => {
    const onSearch = vi.fn();
    render(<SearchWithHistory value="" onSearch={onSearch} storageKey={KEY} placeholder="Search…" />);
    fireEvent.change(screen.getByPlaceholderText("Search…"), { target: { value: "x" } });
    expect(onSearch).toHaveBeenCalledWith("x");
  });

  it("shows the history dropdown on focus", () => {
    seed(["alpha", "beta"]);
    render(<SearchWithHistory value="" onSearch={() => {}} storageKey={KEY} placeholder="Search…" />);
    fireEvent.focus(screen.getByPlaceholderText("Search…"));
    const list = screen.getByTestId("search-history-list");
    expect(list).toHaveTextContent("alpha");
    expect(list).toHaveTextContent("beta");
  });

  it("applies a history term when clicked", () => {
    seed(["alpha"]);
    const onSearch = vi.fn();
    render(<SearchWithHistory value="" onSearch={onSearch} storageKey={KEY} placeholder="Search…" />);
    fireEvent.focus(screen.getByPlaceholderText("Search…"));
    fireEvent.click(screen.getByText("alpha"));
    expect(onSearch).toHaveBeenCalledWith("alpha");
  });

  it("removes a single history item via its X button without closing the dropdown", () => {
    seed(["alpha", "beta"]);
    render(<SearchWithHistory value="" onSearch={() => {}} storageKey={KEY} placeholder="Search…" />);
    fireEvent.focus(screen.getByPlaceholderText("Search…"));
    fireEvent.click(screen.getByLabelText("Remove alpha from history"));

    const list = screen.getByTestId("search-history-list");
    expect(list).not.toHaveTextContent("alpha");
    expect(list).toHaveTextContent("beta");
    expect(JSON.parse(localStorage.getItem(KEY)!)).toEqual(["beta"]);
  });
});
