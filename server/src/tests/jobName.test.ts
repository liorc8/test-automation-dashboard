import { extractJobName, jobNameFromLinks } from "../utils/jobName";

describe("extractJobName", () => {
  it("extracts the first /job/<name> segment", () => {
    expect(
      extractJobName("http://il-almaqa-jenkins03:8080/view/LOD/job/SQA-EU01-LOD_Authority/ws/Logs/x.log")
    ).toBe("SQA-EU01-LOD_Authority");
  });

  it("returns the first job for nested folder jobs", () => {
    expect(extractJobName("http://host/job/Folder/job/Inner/12/artifact")).toBe("Folder");
  });

  it("returns null when there is no /job/ segment", () => {
    expect(extractJobName("http://host/artifact/screenshot.png")).toBeNull();
  });

  it("returns null for empty input", () => {
    expect(extractJobName(null)).toBeNull();
    expect(extractJobName(undefined)).toBeNull();
    expect(extractJobName("")).toBeNull();
  });
});

describe("jobNameFromLinks", () => {
  it("prefers the log link over the screenshot link", () => {
    expect(
      jobNameFromLinks("http://host/job/FromLog/1/log", "http://host/job/FromShot/1/shot.png")
    ).toBe("FromLog");
  });

  it("falls back to the screenshot link when the log link has no job", () => {
    expect(jobNameFromLinks("http://host/no-job/here", "http://host/job/FromShot/1/x")).toBe("FromShot");
  });

  it("returns null when neither has a job", () => {
    expect(jobNameFromLinks(null, null)).toBeNull();
  });
});
