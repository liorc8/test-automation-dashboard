import { buildServerFilter } from "../services/envFilter";

describe("buildServerFilter", () => {
  it("builds an IN list for qa servers", () => {
    const f = buildServerFilter("qa");
    expect(f).toContain("UPPER(SERVER) IN (");
    expect(f).toContain("'QAC01'");
  });

  it("builds an IN list for sandbox servers", () => {
    const f = buildServerFilter("sandbox");
    expect(f).toContain("UPPER(SERVER) IN (");
    expect(f).toContain("'SQA02_NA03'");
  });

  it("builds a NOT IN list for release (everything that is not qa/sandbox)", () => {
    const f = buildServerFilter("release");
    expect(f).toContain("UPPER(SERVER) NOT IN (");
    expect(f).toContain("'QAC01'");
  });
});
