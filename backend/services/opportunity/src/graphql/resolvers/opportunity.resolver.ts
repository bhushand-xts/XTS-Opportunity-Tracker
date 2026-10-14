import * as service from "../../services/opportunity.service";

function formDate(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  if (!(value instanceof Date)) return value;
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

export const opportunityResolvers = {
  Opportunity: {
    leadReceivedDate: (opportunity: { leadReceivedDate: Date | string | null }) => formDate(opportunity.leadReceivedDate),
    queDueDate: (opportunity: { queDueDate: Date | string | null }) => formDate(opportunity.queDueDate),
    proposalDueDate: (opportunity: { proposalDueDate: Date | string | null }) => formDate(opportunity.proposalDueDate),
  },
  Query: {
    opportunityClientCreateAllowed: async (_: unknown, __: unknown, ctx: any) => service.canCreateClient(ctx),
    opportunityClients: async (_: unknown, __: unknown, ctx: any) => service.listClients(ctx),
    opportunities: async (_: unknown, __: unknown, ctx: any) => service.list(ctx),

    opportunity: async (
      _: unknown,
      args: { opportunityId: number },
      ctx: any
    ) => service.get(args.opportunityId, ctx)
  },

  Mutation: {
    updateOpportunityClient: async (_: unknown, args: { clientId: number; client: any; contacts: any[] }, ctx: any) =>
      service.updateClient(args.clientId, args.client, args.contacts, ctx),
    createOpportunityClient: async (_: unknown, args: { client: any; contacts: any[] }, ctx: any) =>
      service.createClient(args.client, args.contacts, ctx),
    createRfpIntakeOpportunity: async (_: unknown, args: { input: any }, ctx: any) =>
      service.createRfpIntakeOpportunity(args.input, ctx),

    updateRfpIntakeOpportunity: async (_: unknown, args: { opportunityId: number; input: any }, ctx: any) =>
      service.updateRfpIntakeOpportunity(args.opportunityId, args.input, ctx),

    transitionOpportunity: async (_: unknown, args: {
      opportunityId: number;
      action: "REQUEST_CHANGES" | "HOLD" | "APPROVE" | "RESUBMIT";
      comment?: string | null;
      opportunityDescription?: string | null;
    }, ctx: any) => service.transitionWorkflow(
      args.opportunityId, args.action, args.comment ?? null, args.opportunityDescription ?? null, ctx
    ),

    createOpportunity: async (
      _: unknown,
      args: { input: any },
      ctx: any
    ) => service.create(args.input, ctx),

    updateOpportunity: async (
      _: unknown,
      args: {
        opportunityId: number;
        input: any;
      },
      ctx: any
    ) =>
      service.update(
        args.opportunityId,
        args.input,
        ctx
      )
  }
};

export default opportunityResolvers;
