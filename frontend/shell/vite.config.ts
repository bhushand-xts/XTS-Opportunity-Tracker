import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import federation from "@module-federation/vite";

// Each remote resolves from an env var in every real environment (dev/qa/
// prod each point at a different CloudFront distribution) and falls back
// to a local dev server URL so the shell runs standalone without all five
// remotes running.
const remoteUrl = (envKey: string, port: number) =>
  import.meta.env?.[`VITE_REMOTE_${envKey}_URL`] ?? `http://localhost:${port}/assets/remoteEntry.js`;

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: "shell",
      remotes: {
        opportunityPipeline: remoteUrl("OPPORTUNITYPIPELINE", 5002),
        estimationRates: remoteUrl("ESTIMATIONRATES", 5003),
        approvalsGates: remoteUrl("APPROVALSGATES", 5004),
        documents: remoteUrl("DOCUMENTS", 5005),
        rfpIntake: remoteUrl("RFPINTAKE", 5001)
      },
      shared: ["react", "react-dom", "@apollo/client", "graphql"],
    }),
  ],
  build: {
    target: "esnext",
    modulePreload: false,
  },
  server: { port: 5000 },
});
