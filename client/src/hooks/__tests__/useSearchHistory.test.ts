import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSearchHistory } from "../useSearchHistory";

const KEY = "searchHistory:test";

describe("useSearchHistory", () => {
  beforeEach(() => localStorage.clear());

  it("pushes newest first and persists to localStorage", () => {
    const { result } = renderHook(() => useSearchHistory(KEY));
    act(() => result.current.push("alpha"));
    act(() => result.current.push("beta"));

    expect(result.current.history).toEqual(["beta", "alpha"]);
    expect(JSON.parse(localStorage.getItem(KEY)!)).toEqual(["beta", "alpha"]);
  });

  it("keeps only the 10 most recent unique terms", () => {
    const { result } = renderHook(() => useSearchHistory(KEY));
    act(() => {
      for (let i = 1; i <= 12; i++) result.current.push(`term${i}`);
    });

    expect(result.current.history).toHaveLength(10);
    expect(result.current.history[0]).toBe("term12");
    expect(result.current.history).not.toContain("term1");
    expect(result.current.history).not.toContain("term2");
  });

  it("de-duplicates (case-insensitive) and promotes the repeated term", () => {
    const { result } = renderHook(() => useSearchHistory(KEY));
    act(() => result.current.push("alpha"));
    act(() => result.current.push("beta"));
    act(() => result.current.push("ALPHA"));

    expect(result.current.history).toEqual(["ALPHA", "beta"]);
  });

  it("removes a specific term and updates localStorage", () => {
    const { result } = renderHook(() => useSearchHistory(KEY));
    act(() => result.current.push("alpha"));
    act(() => result.current.push("beta"));
    act(() => result.current.remove("alpha"));

    expect(result.current.history).toEqual(["beta"]);
    expect(JSON.parse(localStorage.getItem(KEY)!)).toEqual(["beta"]);
  });

  it("ignores empty / whitespace terms", () => {
    const { result } = renderHook(() => useSearchHistory(KEY));
    act(() => result.current.push("   "));
    expect(result.current.history).toEqual([]);
  });
});
