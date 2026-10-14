import * as repository from "../repositories/opportunity.repository";
import * as validator from "../validators/opportunity.validator";
import * as userService from "../integrations/userService";

import {
  notFound,
  conflict,
  validationFailed
} from "../../../../shared/errors/graphqlErrors";

import type {
  OpportunityInput
} from "../repositories/opportunity.repository";

const SALES_HEAD_ROLE_ID = 20;
const ESTIMATION_TEAM_ROLE_ID = 22;
const SALES_REP_ROLE_ID = 24;
const CEO_ROLE_ID = 23;

function validateProposalQuestions(input: OpportunityInput) {
  if (input.proposalQuestionSelections === undefined) return;
  if (!Array.isArray(input.proposalQuestionSelections) || input.proposalQuestionSelections.some(selection =>
    !selection.question?.trim() ||
    (selection.questionId !== null && (!Number.isInteger(selection.questionId) || selection.questionId <= 0)))) {
    throw validationFailed("Questions must contain text and valid master question IDs.");
  }
}

async function list(ctx: any) {
  const userId = ctx?.user?.id;
  if (!Number.isInteger(userId) || userId <= 0) {
    throw conflict("A signed-in user is required to view opportunities.");
  }
  const user = await userService.findUser(userId);
  if (user?.roleId === SALES_REP_ROLE_ID) return repository.findOwnedBy(userId);
  if (user?.roleId === SALES_HEAD_ROLE_ID) return repository.findAll();
  if (user?.roleId === CEO_ROLE_ID) return repository.findByWorkflowStage(2, [4, 5, 6], true);
  if (user?.roleId === ESTIMATION_TEAM_ROLE_ID) return repository.findByWorkflowStage(3, [7], true);
  throw conflict("You do not have permission to view this workflow.");
}

async function get(opportunityId: number, ctx: any) {
  const userId = ctx?.user?.id;
  if (!Number.isInteger(userId) || userId <= 0) throw conflict("A signed-in user is required.");
  const user = await userService.findUser(userId);
  const opportunity = await repository.findById(opportunityId);

  if (!opportunity) {
    throw notFound("Opportunity not found");
  }
  const isSalesRepresentativeOwner = user?.roleId === SALES_REP_ROLE_ID && opportunity.createdBy === userId;
  const isRoleReviewer = (user?.roleId === CEO_ROLE_ID && (
    (opportunity.stageId === 2 && [4, 5, 6].includes(opportunity.subStageId ?? 0)) ||
    (opportunity.stageId === 3 && opportunity.subStageId === 7) ||
    (opportunity.stageId === 4 && [8, 9].includes(opportunity.subStageId ?? 0)) ||
    (opportunity.stageId === 5 && opportunity.subStageId === 10))) ||
    (user?.roleId === ESTIMATION_TEAM_ROLE_ID && (
      (opportunity.stageId === 3 && opportunity.subStageId === 7) ||
      (opportunity.stageId === 4 && [8, 9].includes(opportunity.subStageId ?? 0)) ||
      (opportunity.stageId === 5 && opportunity.subStageId === 10)));
  if (!isSalesRepresentativeOwner && user?.roleId !== SALES_HEAD_ROLE_ID && !isRoleReviewer) {
    throw conflict("You do not have permission to view this opportunity.");
  }

  return opportunity;
}

async function create(
  input: OpportunityInput,
  ctx: any
) {
  validateProposalQuestions(input);
  validator.validateCreateOpportunity(input);

  const userId = ctx?.user?.id;
  if (!Number.isInteger(userId) || userId <= 0) throw conflict("A signed-in Sales Representative or Sales Head is required.");
  const creator = await userService.findUser(userId);
  if (![SALES_REP_ROLE_ID, SALES_HEAD_ROLE_ID].includes(creator?.roleId ?? 0)) {
    throw conflict("Only a signed-in Sales Representative or Sales Head can create this opportunity.");
  }
  await validateActiveOwner(input.ownerId);
  return repository.create({
    ...input,
    stageId: 1,
    subStageId: 1,
    assignedTo: null,
  }, userId);
}

async function createRfpIntakeOpportunity(input: repository.RfpIntakeOpportunityInput, ctx: any) {
  if (![1, 2].includes(input.rfpType)) {
    throw validationFailed("Select Questionnaire or Generic RFP.");
  }
  if (!input.opportunityName?.trim()) {
    throw validationFailed("Opportunity Name is required.");
  }

  if (!Array.isArray(input.questions) || input.questions.length === 0) {
    throw validationFailed("Select at least one proposal section.");
  }

  if (input.questions.some((question) => !question?.trim())) {
    throw validationFailed("The selected proposal sections are invalid.");
  }
  if (input.questionSelections?.some((selection) =>
    !Number.isInteger(selection.questionId) || selection.questionId <= 0 || !selection.question?.trim()
  )) {
    throw validationFailed("The selected proposal section IDs are invalid.");
  }
  if (!input.client?.clientName?.trim() || !input.client.accountType?.trim() || !input.client.sector?.trim() ||
      !input.client.city?.trim() || !input.client.state?.trim() || !input.client.country?.trim()) {
    throw validationFailed("Complete the client details before saving the opportunity.");
  }
  if ((input.client.streetAddress?.length ?? 0) > 20) {
    throw validationFailed("Client street address must be 20 characters or fewer.");
  }
  if (!Array.isArray(input.contacts) || input.contacts.length === 0 || input.contacts.some((contact) =>
    !contact.fullName?.trim() || !contact.titleRole?.trim() || !contact.email?.trim() ||
    !contact.phone?.trim() || !Number.isInteger(contact.roleInDecision) || contact.roleInDecision <= 0
  )) {
    throw validationFailed("Complete at least one valid client contact before saving the opportunity.");
  }
  if (!Number.isInteger(input.ownerId) || input.ownerId <= 0) {
    throw validationFailed("A valid opportunity owner is required.");
  }
  if (!Number.isInteger(input.currencyId) || input.currencyId <= 0) {
    throw validationFailed("A valid currency is required.");
  }
  if (!Number.isFinite(input.estimatedValue) || input.estimatedValue <= 0) {
    throw validationFailed("Estimated value must be greater than zero.");
  }
  if (!Number.isInteger(input.sourceTypeId) || input.sourceTypeId <= 0 ||
      !Number.isInteger(input.rfpType) || input.rfpType <= 0) {
    throw validationFailed("A valid opportunity source and RFP type are required.");
  }

  const userId = ctx?.user?.id;
  if (!Number.isInteger(userId) || userId <= 0) {
    throw conflict("A signed-in user is required to create an opportunity");
  }
  const creator = await userService.findUser(userId);
  if (![SALES_REP_ROLE_ID, SALES_HEAD_ROLE_ID].includes(creator?.roleId ?? 0)) {
    throw conflict("Only a signed-in Sales Representative or Sales Head can create this opportunity.");
  }
  await validateActiveOwner(input.ownerId);
  return repository.finalizeRfpIntakeOpportunity(input, userId, null);
}

async function updateRfpIntakeOpportunity(
  opportunityId: number,
  input: repository.RfpIntakeOpportunityUpdateInput,
  ctx: any
) {
  if (![1, 2].includes(input.rfpType)) {
    throw validationFailed("Select Questionnaire or Generic RFP.");
  }
  if (!input.opportunityName?.trim() || !input.client?.clientName?.trim() ||
      !input.client.accountType?.trim() || !input.client.sector?.trim() ||
      !input.client.city?.trim() || !input.client.state?.trim() || !input.client.country?.trim()) {
    throw validationFailed("Complete the opportunity and client details before saving.");
  }
  if ((input.client.streetAddress?.length ?? 0) > 20) {
    throw validationFailed("Client street address must be 20 characters or fewer.");
  }
  if (!Array.isArray(input.contacts) || input.contacts.length === 0 || input.contacts.some((contact) =>
    !contact.fullName?.trim() || !contact.titleRole?.trim() || !contact.email?.trim() ||
    !contact.phone?.trim() || !Number.isInteger(contact.roleInDecision) || contact.roleInDecision <= 0
  )) {
    throw validationFailed("Complete at least one valid client contact before saving the opportunity.");
  }
  if (!Array.isArray(input.questions) || input.questions.length === 0 || input.questions.some((question) => !question?.trim())) {
    throw validationFailed("Select at least one valid proposal section before saving the opportunity.");
  }
  if (input.questionSelections?.some((selection) =>
    !Number.isInteger(selection.questionId) || selection.questionId <= 0 || !selection.question?.trim()
  )) {
    throw validationFailed("The selected proposal section IDs are invalid.");
  }
  if (!Number.isInteger(input.ownerId) || input.ownerId <= 0 ||
      !Number.isInteger(input.currencyId) || input.currencyId <= 0 ||
      !Number.isFinite(input.estimatedValue) || input.estimatedValue <= 0 ||
      !Number.isInteger(input.sourceTypeId) || input.sourceTypeId <= 0 ||
      !Number.isInteger(input.rfpType) || input.rfpType <= 0) {
    throw validationFailed("Complete the required opportunity fields before saving.");
  }

  const userId = ctx?.user?.id;
  if (!Number.isInteger(userId) || userId <= 0) throw conflict("A signed-in user is required.");
  const user = await userService.findUser(userId);
  if (![SALES_REP_ROLE_ID, SALES_HEAD_ROLE_ID].includes(user?.roleId ?? 0)) {
    throw conflict("Only Sales Representatives and Sales Heads can edit opportunities.");
  }
  const current = await repository.findById(opportunityId);
  if (!current) throw notFound("Opportunity not found.");
  assertCanEdit(current, userId, user?.roleId);
  if (input.ownerId !== current.ownerId) throw conflict("The opportunity owner cannot be changed during review.");

  const updated = await repository.updateRfpIntakeOpportunity(opportunityId, input, userId);
  if (!updated) throw notFound("Opportunity not found.");
  return updated;
}

type WorkflowAction = repository.OpportunityWorkflowAction;

function assertCanEdit(opportunity: repository.Opportunity, userId: number, roleId: number | null | undefined) {
  const salesRepCanEdit = roleId === SALES_REP_ROLE_ID && opportunity.createdBy === userId &&
    opportunity.stageId === 1 && opportunity.subStageId === 2;
  const salesHeadCanEdit = roleId === SALES_HEAD_ROLE_ID && (
    (opportunity.stageId === 1 && opportunity.subStageId === 2 && opportunity.createdBy === userId) ||
    (opportunity.stageId === 1 && [1, 3].includes(opportunity.subStageId ?? 0)) ||
    (opportunity.stageId === 2 && opportunity.subStageId === 5)
  );
  if (!salesRepCanEdit && !salesHeadCanEdit) throw conflict("You cannot edit this opportunity at its current workflow step.");
}

async function resubmitBySalesRepresentative(
  opportunityId: number,
  opportunity: repository.Opportunity,
  userId: number,
  userRoleId: number | null | undefined,
  comment: string | null,
  opportunityDescription: string | null
) {
  const returnedFromSalesHead = opportunity.stageId === 1 && opportunity.subStageId === 2;
  if (![SALES_REP_ROLE_ID, SALES_HEAD_ROLE_ID].includes(userRoleId ?? 0) || opportunity.createdBy !== userId || !returnedFromSalesHead) {
    throw conflict("Only the creator can resubmit an opportunity with requested changes.");
  }
  return repository.transitionWorkflow(opportunityId, 1, 1, null, userId, comment?.trim() || null, opportunityDescription?.trim() || null);
}

async function reviewBySalesHead(
  opportunityId: number,
  opportunity: repository.Opportunity,
  userId: number,
  userRoleId: number | null | undefined,
  action: WorkflowAction,
  comment: string | null
) {
  if (userRoleId !== SALES_HEAD_ROLE_ID || opportunity.stageId !== 1 ||
      ![1, 3].includes(opportunity.subStageId ?? 0)) {
    throw conflict("Only a Sales Head can review an opportunity pending review or on hold.");
  }

  if (action === "REQUEST_CHANGES") {
    if (!comment?.trim()) throw validationFailed("Add the changes requested for the Sales Representative.");
    return repository.transitionWorkflow(opportunityId, 1, 2, opportunity.createdBy, userId, comment.trim());
  }
  if (action === "HOLD") {
    return repository.transitionWorkflow(opportunityId, 1, 3, null, userId, comment?.trim() || null);
  }
  if (action === "APPROVE") {
    return repository.transitionWorkflow(opportunityId, 2, 4, null, userId, comment?.trim() || null);
  }
  throw validationFailed("Unknown opportunity workflow action.");
}

async function reviewByCeo(
  opportunityId: number,
  opportunity: repository.Opportunity,
  userId: number,
  userRoleId: number | null | undefined,
  action: WorkflowAction,
  comment: string | null
) {
  const canReview = opportunity.stageId === 2 && [4, 6].includes(opportunity.subStageId ?? 0);
  if (userRoleId !== CEO_ROLE_ID || !canReview) {
    throw conflict("Only a CEO can review a pending or held Go/No-Go opportunity.");
  }

  if (action === "REQUEST_CHANGES") {
    if (!comment?.trim()) throw validationFailed("Add the changes requested for the Sales Head.");
    return repository.transitionWorkflow(opportunityId, 2, 5, null, userId, comment.trim());
  }
  if (action === "HOLD") {
    return repository.transitionWorkflow(opportunityId, 2, 6, null, userId, comment?.trim() || null);
  }
  if (action === "APPROVE") {
    return repository.transitionWorkflow(opportunityId, 3, 7, null, userId, comment?.trim() || null);
  }
  throw validationFailed("Unknown CEO Go/No-Go action.");
}

async function transitionWorkflow(
  opportunityId: number,
  action: WorkflowAction,
  comment: string | null,
  opportunityDescription: string | null,
  ctx: any
) {
  const userId = ctx?.user?.id;
  if (!Number.isInteger(userId) || userId <= 0) throw conflict("A signed-in user is required.");
  const user = await userService.findUser(userId);
  const opportunity = await repository.findById(opportunityId);
  if (!opportunity) throw notFound("Opportunity not found.");

  if (action === "SUBMIT_ESTIMATE") {
    if (user?.roleId !== ESTIMATION_TEAM_ROLE_ID || opportunity.stageId !== 3 || opportunity.subStageId !== 7) {
      throw conflict("Only the Estimation Team can submit an in-progress estimate for approval.");
    }
    return repository.transitionWorkflow(opportunityId, 4, 8, null, userId, comment?.trim() || null);
  }
  if (user?.roleId === CEO_ROLE_ID && opportunity.stageId === 4 && [8, 9].includes(opportunity.subStageId ?? 0)) {
    if (action === "HOLD") return repository.transitionWorkflow(opportunityId, 4, 9, null, userId, comment?.trim() || null);
    if (action === "APPROVE") return repository.transitionWorkflow(opportunityId, 5, 10, null, userId, comment?.trim() || null);
    throw validationFailed("Use Hold or Approve for estimate review.");
  }
  if (action === "RESUBMIT") {
    if (user?.roleId === SALES_HEAD_ROLE_ID && opportunity.stageId === 2 && opportunity.subStageId === 5) {
      return repository.transitionWorkflow(opportunityId, 2, 4, null, userId, comment?.trim() || null);
    }
    return resubmitBySalesRepresentative(
      opportunityId, opportunity, userId, user?.roleId, comment, opportunityDescription
    );
  }
  if (user?.roleId === SALES_HEAD_ROLE_ID) {
    return reviewBySalesHead(opportunityId, opportunity, userId, user.roleId, action, comment);
  }
  if (user?.roleId === CEO_ROLE_ID) {
    return reviewByCeo(opportunityId, opportunity, userId, user.roleId, action, comment);
  }
  throw conflict("Only Sales Heads and CEOs can perform workflow actions.");
}

async function update(
  opportunityId: number,
  input: OpportunityInput,
  ctx: any
) {
  validateProposalQuestions(input);
  const current = await repository.findById(opportunityId);

  if (!current) {
    throw notFound("Opportunity not found");
  }

  if (input.stageId !== undefined || input.subStageId !== undefined || input.assignedTo !== undefined) {
    throw validationFailed("Use the workflow actions to change opportunity stage or assignment.");
  }

  validator.validateUpdateOpportunity({ ...current, ...Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined)) });

  const userId = ctx?.user?.id;
  if (!Number.isInteger(userId) || userId <= 0) throw conflict("A signed-in user is required.");
  const user = await userService.findUser(userId);
  assertCanEdit(current, userId, user?.roleId);
  if (input.ownerId !== undefined && input.ownerId !== current.ownerId) {
    throw conflict("The opportunity owner cannot be changed during review.");
  }

  const patch = Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined)
  ) as OpportunityInput;

  return repository.update(
    opportunityId,
    { ...current, ...patch },
    userId
  );
}

async function validateActiveOwner(ownerId: number | null | undefined) {
  if (!Number.isInteger(ownerId) || !ownerId || ownerId <= 0) throw validationFailed("Select an active opportunity owner.");
  const owner = await userService.findUser(ownerId);
  if (owner?.isActive !== true) throw validationFailed("The selected opportunity owner must be an active user.");
}

async function listClients(ctx: any) {
  const user = await userService.findUser(ctx?.user?.id);
  if (![SALES_REP_ROLE_ID, SALES_HEAD_ROLE_ID].includes(user?.roleId ?? 0)) throw conflict("A signed-in Sales Representative or Sales Head is required.");
  return repository.findClients();
}

export async function createClient(input: repository.RfpIntakeClientInput, contacts: repository.RfpIntakeContactInput[], ctx: any) {
  return saveDirectoryClient(null, input, contacts, ctx);
}

export async function updateClient(clientId: number, input: repository.RfpIntakeClientInput, contacts: repository.RfpIntakeContactInput[], ctx: any) {
  if (!Number.isInteger(clientId) || clientId <= 0) throw validationFailed('Select a valid client.');
  return saveDirectoryClient(clientId, input, contacts, ctx);
}

async function saveDirectoryClient(id: number | null, input: repository.RfpIntakeClientInput, contacts: repository.RfpIntakeContactInput[], ctx: any) {
  const userId = ctx?.user?.id;
  if (!Number.isInteger(userId) || userId <= 0) throw conflict("A signed-in user is required.");
  const user = await userService.findUser(userId);
  if (user?.isActive !== true || ![SALES_REP_ROLE_ID, SALES_HEAD_ROLE_ID].includes(user?.roleId ?? 0)) {
    throw conflict("Only Sales Representatives and Sales Heads can create or update clients.");
  }
  const fields: [string, string | null | undefined, number, boolean][] = [
    ['Client name', input.clientName, 255, true], ['Account type', input.accountType, 100, true],
    ['Sector', input.sector, 100, true], ['Website', input.website, 500, false],
    ['City', input.city, 100, true], ['State', input.state, 100, true],
    ['Country', input.country, 100, true], ['Street address', input.streetAddress, 20, false],
  ];
  for (const [label, value, max, required] of fields) {
    if ((required && !value?.trim()) || (value?.trim().length ?? 0) > max) {
      throw validationFailed(`${label} ${required ? 'is required and ' : ''}must be at most ${max} characters.`);
    }
  }
  if (input.website && !/^https?:\/\/\S+$/i.test(input.website.trim())) throw validationFailed("Enter a valid HTTP or HTTPS website URL.");
  if (!contacts.length) throw validationFailed("A primary contact is required.");
  const emails = new Set<string>();
  for (const contact of contacts) {
    if (!contact.fullName?.trim() || contact.fullName.trim().length > 255 ||
      !contact.titleRole?.trim() || contact.titleRole.trim().length > 150 ||
      !contact.email?.trim() || contact.email.trim().length > 255 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email.trim()) ||
      !contact.phone?.trim() || contact.phone.trim().length > 20 || !Number.isInteger(contact.roleInDecision) || contact.roleInDecision <= 0) {
      throw validationFailed("Complete each contact with a valid name, title, email, phone and decision role.");
    }
    if (contact.roleInDecision > 10 || (contact.roleInDecision === 10 && !contact.roleInDecisionOther?.trim()) || (contact.roleInDecisionOther?.trim().length ?? 0) > 255) {
      throw validationFailed('Select a valid decision role and provide text for Other.');
    }
    const email = contact.email.trim().toLowerCase();
    if (emails.has(email)) throw validationFailed("Contact emails must be unique within the client.");
    emails.add(email);
  }
  const clientId = id === null ? await repository.createClient(input, contacts, userId) : await repository.updateClient(id, input, contacts, userId);
  return (await repository.findClients()).find(client => client.clientId === clientId);
}

export async function canCreateClient(ctx: any) {
  const userId = ctx?.user?.id;
  if (!Number.isInteger(userId) || userId <= 0) return false;
  const user = await userService.findUser(userId);
  return user?.isActive === true && [SALES_REP_ROLE_ID, SALES_HEAD_ROLE_ID].includes(user.roleId ?? 0);
}

export {
  listClients,
  list,
  get,
  create,
  createRfpIntakeOpportunity,
  updateRfpIntakeOpportunity,
  transitionWorkflow,
  update
};
