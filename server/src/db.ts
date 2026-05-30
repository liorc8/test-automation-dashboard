import oracledb from "oracledb";

oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;

let pool: oracledb.Pool | null = null;
let thickModeInitialized = false;

function getDbConfig() {
  const user = process.env.DB_USER;
  const password = process.env.DB_PASSWORD;
  const connectString = process.env.DB_CONNECT_STRING;

  if (!user || !password || !connectString) {
    throw new Error(
      "Missing DB env vars: DB_USER / DB_PASSWORD / DB_CONNECT_STRING"
    );
  }

  return { user, password, connectString };
}

async function getPool(): Promise<oracledb.Pool> {
  if (pool) return pool;

  if (!thickModeInitialized) {
    thickModeInitialized = true;
    const libDir = process.env.ORACLE_CLIENT_LIB_DIR;
    if (libDir) {
      try {
        oracledb.initOracleClient({ libDir });
      } catch (err) {
        console.error("⚠️ Failed to initialize Thick Mode.", err);
      }
    } else {
      console.warn("⚠️ ORACLE_CLIENT_LIB_DIR not set — running in Thin mode.");
    }
  }

  const dbConfig = getDbConfig();

  pool = await oracledb.createPool({
    ...dbConfig,
    poolMin: 1,
    poolMax: 5,
    poolIncrement: 1,
  });

  return pool;
}

export async function execute(
  sql: string,
  binds: Record<string, any> = {},
  options: oracledb.ExecuteOptions = {}
) {
  const p = await getPool();
  const connection = await p.getConnection();

  try {
    return await connection.execute(sql, binds, options);
  } finally {
    await connection.close();
  }
}

export async function checkConnection() {
  try {
    console.log("Attempting to connect to Oracle DB...");
    await execute("SELECT 1 AS OK FROM dual");
    console.log("✅ Successfully connected to Oracle Database!");
    return true;
  } catch (err) {
    console.error("❌ Database connection failed:", err);
    return false;
  }
}

export async function closePool() {
  if (!pool) return;
  await pool.close(10);
  pool = null;
}
