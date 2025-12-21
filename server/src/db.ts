import oracledb from 'oracledb';
import dotenv from 'dotenv';

dotenv.config();

try {
  oracledb.initOracleClient({ libDir: 'C:\\oracle\\instantclient_21_1\\instantclient_23_0' });
} catch (err) {
  console.error('⚠️ Failed to initialize Thick Mode.', err);
}

oracledb.autoCommit = true;

const dbConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  connectString: process.env.DB_CONNECT_STRING,
};

export async function checkConnection() {
  let connection;

  try {
    console.log('Attempting to connect to Oracle DB...');
    connection = await oracledb.getConnection(dbConfig);
    console.log('✅ Successfully connected to Oracle Database!');
    return true;
  } catch (err) {
    console.error('❌ Database connection failed:', err);
    return false;
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error('Error closing connection:', err);
      }
    }
  }
}

