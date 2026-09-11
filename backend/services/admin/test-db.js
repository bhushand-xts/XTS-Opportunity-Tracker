const { Client } = require("pg");

const client = new Client({
  host: "172.16.80.28",
  port: 5432,
  database: "admin_db",
  user: "opportunityuser",
  password: "opportunityTracker",
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