export type EnvFilter = "qa" | "release" | "sandbox";

const QA_SERVERS = ["QAC01", "QAC02", "SQA03_NA03", "SQA_NA01", "SQA_EU01"];

const SANDBOX_SERVERS: string[] = [];

export function buildServerFilter(env: EnvFilter): string {
  if (env === "qa") {
    const inList = QA_SERVERS.map((s) => `'${s}'`).join(", ");
    return `AND UPPER(SERVER) IN (${inList})`;
  }
  if (env === "sandbox") {
    if (SANDBOX_SERVERS.length === 0) return "AND 1=0";
    const inList = SANDBOX_SERVERS.map((s) => `'${s}'`).join(", ");
    return `AND UPPER(SERVER) IN (${inList})`;
  }
  const allNonRelease = [...QA_SERVERS, ...SANDBOX_SERVERS].map((s) => `'${s}'`).join(", ");
  return `AND UPPER(SERVER) NOT IN (${allNonRelease})`;
}