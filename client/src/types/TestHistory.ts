export type TestHistoryRow = {
    testedOn: string | null; // ISO-like string from backend
    endingTimeUnix: number | null;
    passed: boolean;
    server: string | null;
    buildNumber: number | null;
    almaVersion: string | null;
    failureText: string | null;
    logLink: string | null;
    screenshotLink: string | null;
};

export type TestHistoryResponse = {
    area: string;
    testName: string;
    env: "qa" | "release" | "sandbox";
    rows: TestHistoryRow[];
};
