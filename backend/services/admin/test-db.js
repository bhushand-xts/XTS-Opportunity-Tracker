const { Client } = require("pg");

const client = new Client({
    host: "localhost",
    port: 5432,
    database: "admin_db",
    user: "postgres",
    password: "root",
    connectionTimeoutMillis: 10000
});

client.connect()
    .then(() => {
        console.log("✅ PostgreSQL connected successfully");

        return client.query(`
            SELECT current_database(), current_user
        `);
    })
    .then((result) => {
        console.log("Database details:");
        console.log(result.rows);

        return client.end();
    })
    .then(() => {
        console.log("✅ Connection closed");
    })
    .catch((error) => {
        console.error("❌ DATABASE ERROR:");
        console.error(error);
        process.exit(1);
    });