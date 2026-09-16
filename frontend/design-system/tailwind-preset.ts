// Every app/MFE's tailwind.config.ts does: presets: [xtsPreset]
// Tailwind reads values from the CSS custom properties in tokens/*.css --
// change a token there, not a hex value here, so a rebrand or a dark-mode
// pass touches one file instead of five apps' worth of class names.

import type { Config } from "tailwindcss";

export const xtsPreset: Partial<Config> = {
  darkMode: ["class"],
  theme: {
    extend: {
      colors: {
        surface: "var(--xts-surface)",
        "surface-muted": "var(--xts-surface-muted)",
        ink: "var(--xts-ink)",
        border: "var(--xts-border)",
        accent: "var(--xts-accent)",
        // Named after the pipeline's own stages, not generic chart colors --
        // so a <StageBadge stage="won"> and its Tailwind class agree by name.
        stage: {
          identified: "var(--xts-stage-identified)",
          scoping: "var(--xts-stage-scoping)",
          estimation: "var(--xts-stage-estimation)",
          negotiation: "var(--xts-stage-negotiation)",
          won: "var(--xts-stage-won)",
          lost: "var(--xts-stage-lost)",
          hold: "var(--xts-stage-hold)",
        },
      },
      borderRadius: {
        DEFAULT: "var(--xts-radius)",
      },
    },
  },
};

export default xtsPreset;
