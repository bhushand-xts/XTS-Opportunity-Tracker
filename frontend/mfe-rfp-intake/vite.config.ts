import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import federation from "@module-federation/vite";

// Runtime contract: this is the "remote" half of Module Federation. The
// shell's vite.config.ts holds the matching "host" half (remotes: {...}).
export default defineConfig({
  plugins: [
    react(),
    federation({
      name: "rfpIntake",
      filename: "remoteEntry.js",
      exposes: {
        "./Module": "./src/Module.tsx",
      },
      shared: ["react", "react-dom", "@apollo/client", "graphql"],
    }),
  ],
  build: {
    target: "esnext",
    modulePreload: false,
    cssCodeSplit: false,
  },
  server: { port: 5001 },
});
