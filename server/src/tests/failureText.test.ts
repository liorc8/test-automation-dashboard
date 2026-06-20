import { redactSensitive, cleanReason, buildFailureTextPreview } from "../utils/failureText";

describe("redactSensitive", () => {
  it("redacts password lines", () => {
    const out = redactSensitive("INFO x - Password for login is: hunter2");
    expect(out).toContain("***REDACTED***");
    expect(out).not.toContain("hunter2");
  });

  it("redacts bearer tokens", () => {
    const out = redactSensitive("Authorization: Bearer abc.def.ghi");
    expect(out).toContain("***REDACTED***");
  });

  it("leaves ordinary text untouched", () => {
    expect(redactSensitive("just a normal log line")).toBe("just a normal log line");
  });
});

describe("cleanReason", () => {
  it("trims and returns text", () => {
    expect(cleanReason("  boom  ")).toBe("boom");
  });

  it("returns null for empty / non-string", () => {
    expect(cleanReason("   ")).toBeNull();
    expect(cleanReason(null)).toBeNull();
    expect(cleanReason(123)).toBeNull();
  });
});

describe("buildFailureTextPreview", () => {
  it("returns the block ending at the FATAL line", () => {
    const text = ["a", "b", "FATAL kaboom", "c"].join("\n");
    const preview = buildFailureTextPreview(text, 25, 20);
    expect(preview).toContain("FATAL kaboom");
    expect(preview).not.toContain("\nc");
  });

  it("returns null for non-string input", () => {
    expect(buildFailureTextPreview(42)).toBeNull();
  });
});
