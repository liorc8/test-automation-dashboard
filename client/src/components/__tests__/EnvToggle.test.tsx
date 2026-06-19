import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import EnvToggle from "../EnvToggle";

describe("EnvToggle", () => {
  it("renders all three environment options", () => {
    render(<EnvToggle value="qa" onChange={() => {}} />);
    expect(screen.getByRole("button", { name: "QA" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Release" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sandbox" })).toBeInTheDocument();
  });

  it("calls onChange with the selected env", () => {
    const onChange = vi.fn();
    render(<EnvToggle value="qa" onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Release" }));
    expect(onChange).toHaveBeenCalledWith("release");
  });
});
