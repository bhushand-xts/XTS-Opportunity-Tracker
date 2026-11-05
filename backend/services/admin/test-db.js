// Quick DB connectivity check. Reads the same DB_* vars as the service.
//   cd backend/services/admin && node test-db.js
require("dotenv").config();
const { Client } = require("pg");

const client = new Client({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  connectionTimeoutMillis: 10000,
});

async function testDatabaseConnection() {
  try {
    await client.connect();

    console.log("✅ PostgreSQL connected successfully");

    const result = await client.query(
      "SELECT current_database(), current_user"
    );

    console.log("Database details:");
    console.log(result.rows);

  } catch (error) {
    console.error("❌ DATABASE CONNECTION FAILED");
    console.error(error.message);
  } finally {
    await client.end();
    console.log("🔌 Connection closed");
  }
}

testDatabaseConnection();
