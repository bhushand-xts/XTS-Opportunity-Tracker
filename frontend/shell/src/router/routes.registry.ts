// The route contract's other half: the shell only needs to know which
// top-level path prefix belongs to which remote. Everything under that
// prefix is the remote's own RouteManifest (see mfe-*/src/routes.ts).
export const remoteEntryPoints = [
  { name: "opportunityPipeline", pathPrefix: "/opportunities", label: "Opportunity & Pipeline" },
  { name: "estimationRates", pathPrefix: "/estimation", label: "Estimation & Rate Master" },
  { name: "approvalsGates", pathPrefix: "/approvals", label: "Approvals & Gates" },
  { name: "documents", pathPrefix: "/documents", label: "Documents & Attachments" },
  { name: "rfpIntake", pathPrefix: "/rfp", label: "RFP Intake & Response" },
] as const;
