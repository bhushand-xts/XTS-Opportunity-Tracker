import * as service from "../../services/opportunity.service";

function formDate(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  if (!(value instanceof Date)) return value;
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

export const opportunityResolvers = {
  Opportunity: {
    responses: (opportunity: { opportunityId: number }, _: unknown, ctx: any) => service.getResponses(opportunity.opportunityId, ctx),
    stageHistory: (opportunity: { opportunityId: number }, _: unknown, ctx: any) => service.getStageHistory(opportunity.opportunityId, ctx),
    createdDt: (opportunity: { createdDt: Date | string }) => opportunity.createdDt instanceof Date ? opportunity.createdDt.toISOString() : opportunity.createdDt,
    estimation: (opportunity: { opportunityId: number }, _: unknown, ctx: any) => service.getEstimation(opportunity.opportunityId, ctx),
    allowedActions: (opportunity: Parameters<typeof service.allowedActions>[0], _: unknown, ctx: any) => service.allowedActions(opportunity, ctx),
    leadReceivedDate: (opportunity: { leadReceivedDate: Date | string | null }) => formDate(opportunity.leadReceivedDate),
    queDueDate: (opportunity: { queDueDate: Date | string | null }) => formDate(opportunity.queDueDate),
    proposalDueDate: (opportunity: { proposalDueDate: Date | string | null }) => formDate(opportunity.proposalDueDate),
    uploadedDt: (opportunity: { uploadedDt: Date | string | null }) => opportunity.uploadedDt instanceof Date ? opportunity.uploadedDt.toISOString() : opportunity.uploadedDt,
  },
  OpportunityStageHistory: {
    reachedAt: (event: { reachedAt: Date | string }) => event.reachedAt instanceof Date ? event.reachedAt.toISOString() : event.reachedAt,
  },
  Query: {
    opportunityClientCreateAllowed: async (_: unknown, __: unknown, ctx: any) => service.canCreateClient(ctx),
    opportunityClientUpdateAllowed: async (_: unknown, __: unknown, ctx: any) => service.canUpdateClient(ctx),
    opportunityClients: async (_: unknown, __: unknown, ctx: any) => service.listClients(ctx),
    opportunities: async (_: unknown, args: { queue?: string }, ctx: any) => service.list(ctx, args.queue),

    opportunity: async (
      _: unknown,
      args: { opportunityId: number },
      ctx: any
    ) => service.get(args.opportunityId, ctx)
  },

  Mutation: {
    saveOpportunityAnswer: async (_: unknown, args: { opportunityId: number; responseId: number; revision: number; answer: string }, ctx: any) =>
      service.saveAnswer(args.opportunityId, args.responseId, args.revision, args.answer, ctx),
    saveOpportunityEstimation: async (_: unknown, args: { opportunityId: number; estimation: Parameters<typeof service.saveEstimation>[1] }, ctx: any) => service.saveEstimation(args.opportunityId, args.estimation, ctx),
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
      action: Parameters<typeof service.transitionWorkflow>[1];
      comment?: string | null;
      opportunityDescription?: string | null;
      reasonCodeId?: number | null;
    }, ctx: any) => service.transitionWorkflow(
      args.opportunityId, args.action, args.comment ?? null, args.opportunityDescription ?? null, ctx, args.reasonCodeId
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
