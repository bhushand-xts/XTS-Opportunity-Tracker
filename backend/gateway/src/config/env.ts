import dotenv from "dotenv";

dotenv.config();

export const env = {
  port: Number(
    process.env.GATEWAY_PORT || 5001
  ),

  services: {
    admin:
      process.env.ADMIN_SERVICE_URL ||
      "http://localhost:4001/graphql"
  }
};