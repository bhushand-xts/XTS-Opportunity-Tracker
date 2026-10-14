import path from "node:path";
import { fileURLToPath } from "node:url";
import { mergeConfig } from "vite";
import type { StorybookConfig } from "@storybook/react-vite";

// Storybook v10 loads main.ts as genuine ESM — no __dirname global.
const dirname = path.dirname(fileURLToPath(import.meta.url));

const config: StorybookConfig = {
  // All stories live under src/stories/ (ui/ and composite/), grouped away
  // from component source rather than co-located next to each component.
  stories: ["../src/stories/**/*.stories.@(ts|tsx)"],
  addons: ["@storybook/addon-docs", "@storybook/addon-a11y"],
  framework: {
    name: "@storybook/react-vite",
    options: {},
  },
  async viteFinal(viteConfig) {
    return mergeConfig(viteConfig, {
      resolve: {
        alias: {
          "@": path.resolve(dirname, "../src"),
        },
      },
      css: {
        // Explicit path — Vite's default postcss discovery isn't reliable
        // to assume here, and this repo's shared postcss/tailwind config
        // lives 4 levels up at the workspace root, not next to this package.
        postcss: path.resolve(dirname, "../../../../postcss.config.js"),
      },
    });
  },
};

export default config;
