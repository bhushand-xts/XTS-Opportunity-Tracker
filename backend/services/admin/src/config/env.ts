import dotenv from "dotenv";

dotenv.config();

export const env = {
    port: Number(process.env.PORT || 5001),

    db: {
        host: process.env.DB_HOST || "127.0.0.1",
        port: Number(process.env.DB_PORT || 5432),
        database: process.env.DB_NAME || "postgres",
        user: process.env.DB_USER || "postgres",
        password: process.env.DB_PASSWORD || ""
    }
};