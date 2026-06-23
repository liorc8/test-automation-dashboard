import { expandLog } from "../services/logParserService";

describe("logParserService.expandLog", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  function mockFetch(text: string, ok = true) {
    global.fetch = jest.fn().mockResolvedValue({
      ok,
      text: async () => text,
    }) as unknown as typeof fetch;
  }

  it("returns the block from the test name line down to the FATAL line", async () => {
    const raw = [
      "preamble line",
      "Running TESTNAME_X now",
      "doing stuff",
      "FATAL something exploded",
      "trailing line",
    ].join("\n");
    mockFetch(raw);

    const result = await expandLog("http://jenkins/job/A/1/parse-success", "TESTNAME_X");

    expect(result.available).toBe(true);
    if (result.available) {
      expect(result.source).toBe("parsed");
      expect(result.lines).toEqual([
        "Running TESTNAME_X now",
        "doing stuff",
        "FATAL something exploded",
      ]);
    }
  });

  it("anchors on 'Java heap space' (OOM crash without a FATAL line)", async () => {
    const raw = [
      "preamble line",
      "Running TESTNAME_X now",
      "doing stuff",
      "java.lang.OutOfMemoryError: Java heap space",
      "trailing line",
    ].join("\n");
    mockFetch(raw);

    const result = await expandLog("http://jenkins/job/A/1/heap-space", "TESTNAME_X");

    expect(result.available).toBe(true);
    if (result.available) {
      expect(result.source).toBe("parsed");
      expect(result.lines).toEqual([
        "Running TESTNAME_X now",
        "doing stuff",
        "java.lang.OutOfMemoryError: Java heap space",
      ]);
    }
  });

  it("anchors on 'OutOfMemoryError'", async () => {
    const raw = [
      "Running TESTNAME_Y now",
      "allocating buffers",
      "java.lang.OutOfMemoryError: GC overhead limit exceeded",
    ].join("\n");
    mockFetch(raw);

    const result = await expandLog("http://jenkins/job/A/1/oom", "TESTNAME_Y");

    expect(result.available).toBe(true);
    if (result.available) {
      expect(result.source).toBe("parsed");
      expect(result.lines[result.lines.length - 1]).toContain("OutOfMemoryError");
    }
  });

  it("falls back to the last 100 lines when no FATAL is present", async () => {
    const raw = Array.from({ length: 150 }, (_, i) => `log line ${i + 1}`).join("\n");
    mockFetch(raw);

    const result = await expandLog("http://jenkins/job/A/1/fallback", "TESTNAME_X");

    expect(result.available).toBe(true);
    if (result.available) {
      expect(result.source).toBe("fallback");
      expect(result.lines).toHaveLength(100);
      expect(result.lines[0]).toBe("log line 51");
      expect(result.lines[99]).toBe("log line 150");
    }
  });

  it("returns a clean error when the log fetch fails (404/expired)", async () => {
    mockFetch("Not Found", false);

    const result = await expandLog("http://jenkins/job/A/1/expired", "TESTNAME_X");

    expect(result.available).toBe(false);
    if (!result.available) {
      expect(result.error).toMatch(/no longer available/i);
    }
  });
});
