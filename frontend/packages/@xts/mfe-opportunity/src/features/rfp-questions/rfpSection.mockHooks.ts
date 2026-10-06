import { useStore } from "@xts/design-system";
import type { RfpSection } from "@xts/design-system";

// Mock-backed today, shaped like the Apollo hooks these become once
// backend/services/opportunity implements the proposed schema — see
// backend/docs/RFP_QUESTION_WORKFLOW_CONTRACT.md.

/** Mirrors: query rfpSections(opportunityId: Int!): [RfpSection!]! */
export function useRfpSections(opportunityId: string) {
  const { sections } = useStore();
  return {
    sections: sections
      .filter((s) => s.opportunityId === opportunityId)
      .sort((a, b) => a.displayOrder - b.displayOrder),
    loading: false,
    error: undefined as Error | undefined,
  };
}

/** Mirrors: mutation createRfpSection(input: CreateRfpSectionInput!): RfpSection! */
export function useAddRfpSection() {
  const { addSection } = useStore();
  const mutate = (entry: Omit<RfpSection, "id">) => Promise.resolve(addSection(entry));
  return [mutate, { loading: false }] as const;
}

/** Mirrors: mutation updateRfpSection(id: Int!, input: UpdateRfpSectionInput!): RfpSection! */
export function useUpdateRfpSection() {
  const { updateSection } = useStore();
  const mutate = (id: string, patch: Partial<RfpSection>) => Promise.resolve(updateSection(id, patch));
  return [mutate, { loading: false }] as const;
}

/** Mirrors: mutation deleteRfpSection(id: Int!): Boolean! */
export function useDeleteRfpSection() {
  const { deleteSection } = useStore();
  const mutate = (id: string) => Promise.resolve(deleteSection(id));
  return [mutate, { loading: false }] as const;
}
