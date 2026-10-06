import { useStore } from "@xts/design-system";
import type { ProposalSection } from "@xts/design-system";

// Mock-backed today, shaped like the Apollo hooks these become once
// backend/services/opportunity implements the proposed schema — see
// backend/docs/PROPOSAL_OUTLINE_CONTRACT.md.

/** Mirrors: query proposalSections(opportunityId: Int!): [ProposalSection!]! */
export function useProposalSections(opportunityId: string) {
  const { proposalSections } = useStore();
  return {
    sections: proposalSections
      .filter((s) => s.opportunityId === opportunityId)
      .sort((a, b) => a.number - b.number),
    loading: false,
    error: undefined as Error | undefined,
  };
}

/** Mirrors: mutation createProposalSection(input: CreateProposalSectionInput!): ProposalSection! */
export function useAddProposalSection() {
  const { addProposalSection } = useStore();
  const mutate = (entry: Omit<ProposalSection, "id">) => Promise.resolve(addProposalSection(entry));
  return [mutate, { loading: false }] as const;
}

/** Mirrors: mutation addProposalSectionsFromRequirements(opportunityId: Int!, titles: [String!]!): [ProposalSection!]! */
export function useAddProposalSectionsBulk() {
  const { addProposalSectionsBulk } = useStore();
  const mutate = (entries: Omit<ProposalSection, "id">[]) => Promise.resolve(addProposalSectionsBulk(entries));
  return [mutate, { loading: false }] as const;
}

/** Mirrors: mutation updateProposalSection(id: Int!, input: UpdateProposalSectionInput!): ProposalSection! */
export function useUpdateProposalSection() {
  const { updateProposalSection } = useStore();
  const mutate = (id: string, patch: Partial<ProposalSection>) => Promise.resolve(updateProposalSection(id, patch));
  return [mutate, { loading: false }] as const;
}

/** Mirrors: mutation withdrawProposalSection(id: Int!): ProposalSection! */
export function useWithdrawProposalSection() {
  const { withdrawProposalSection } = useStore();
  const mutate = (id: string) => Promise.resolve(withdrawProposalSection(id));
  return [mutate, { loading: false }] as const;
}
