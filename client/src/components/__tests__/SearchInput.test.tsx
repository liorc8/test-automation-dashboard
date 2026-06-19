import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import SearchInput from "../SearchInput";

describe("SearchInput", () => {
  it("renders the placeholder and no clear button when empty", () => {
    render(<SearchInput value="" onChange={() => {}} placeholder="Find tests" />);
    expect(screen.getByPlaceholderText("Find tests")).toBeInTheDocument();
    expect(screen.queryByLabelText(/clear search/i)).toBeNull();
  });

  it("shows a clear button when there is text and clears on click", () => {
    const onChange = vi.fn();
    render(<SearchInput value="abc" onChange={onChange} />);
    const clear = screen.getByLabelText(/clear search/i);
    expect(clear).toBeInTheDocument();
    fireEvent.click(clear);
    expect(onChange).toHaveBeenCalledWith("");
  });

  it("calls onChange when typing", () => {
    const onChange = vi.fn();
    render(<SearchInput value="" onChange={onChange} placeholder="Find" />);
    fireEvent.change(screen.getByPlaceholderText("Find"), { target: { value: "x" } });
    expect(onChange).toHaveBeenCalledWith("x");
  });
});
