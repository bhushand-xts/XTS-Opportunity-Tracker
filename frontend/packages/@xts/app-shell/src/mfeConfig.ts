export interface MFEConfig {
  enabled: boolean;
  name: string;
  icon: string;
  port: number;
}

export const MFE_CONFIG: Record<string, MFEConfig> = {
  admin: {
    enabled: true,
    name: "Admin",
    icon: "👤",
    port: 3001,
  },
  opportunity: {
    enabled: false,
    name: "Opportunities",
    icon: "💼",
    port: 3002,
  },
  solution: {
    enabled: false,
    name: "Solutions",
    icon: "⚙️",
    port: 3003,
  },
  approval: {
    enabled: false,
    name: "Approvals",
    icon: "✅",
    port: 3004,
  },
  dashboard: {
    enabled: false,
    name: "Dashboard",
    icon: "📊",
    port: 3005,
  },
};

export const ENABLED_MFES = Object.entries(MFE_CONFIG)
  .filter(([, config]) => config.enabled)
  .map(([key]) => key);
