import { query, transaction } from "../config/db";
import type { PoolClient } from "pg";
import { conflict, notFound } from '../../../../shared/errors/graphqlErrors';

const GENERIC_RFP_TYPE_ID = 2;

export interface Opportunity {
  opportunityId: number;
  opportunityNumber: string | null;
  opportunityName: string | null;
  opportunityTypeId: number | null;
  sourceTypeId: number | null;
  clientId: number | null;
  stageId: number | null;
  subStageId: number | null;
  ownerId: number | null;
  assignedTo: number | null;
  priority: string | null;
  serviceLine: string | null;
  solicitationNumber: string | null;
  issuingAgency: string | null;
  procurementContact: string | null;
  queDueDate: string | null;
  submissionMethod: string | null;
  contractTerm: string | null;
  incumbentVendor: string | null;
  preBidMeeting: number | null;
  documentType: string | null;
  fileName: string | null;
  filePath: string | null;
  uploadedBy: number | null;
  uploadedDt: string | null;
  docSubmissionFormat: string | null;
  evaluationBasis: string | null;
  opportunityDescription: string | null;
  leadReceivedDate: string | null;
  expectedStartDate: string | null;
  expectedCloseDate: string | null;
  proposalDueDate: string | null;
  createdDt: string;
  createdBy: number | null;
  updatedDt: string | null;
  updatedBy: number | null;
  isActive: boolean;
  estimatedValue: number | null;
  estimatedValueUsd?: number | null;
  currencyId: number | null;
  rfpType: number | null;
  workflowComment?: string | null;
  workflowReasonCodeId?: number | null;
  clientName?: string | null;
  accountType?: string | null;
  sector?: string | null;
  website?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  streetAddress?: string | null;
  contacts?: { fullName: string; titleRole: string; email: string; phone: string; roleInDecision: number | null; roleInDecisionOther?: string | null }[];
  proposalQuestions?: string[];
  proposalQuestionIds?: number[];
  proposalQuestionCategories?: (string | null)[];
  proposalQuestionnaireTypeIds?: (number | null)[];
}

export interface OpportunityInput {
  proposalQuestionSelections?: { questionId: number | null; question: string; category?: string | null; questionnaireTypeId?: number | null }[];
  opportunityName?: string | null;
  opportunityTypeId?: number | null;
  sourceTypeId?: number | null;
  clientId?: number | null;
  stageId?: number | null;
  subStageId?: number | null;
  ownerId?: number | null;
  assignedTo?: number | null;
  priority?: string | null;
  serviceLine?: string | null;
  solicitationNumber?: string | null;
  issuingAgency?: string | null;
  procurementContact?: string | null;
  queDueDate?: string | null;
  submissionMethod?: string | null;
  contractTerm?: string | null;
  incumbentVendor?: string | null;
  preBidMeeting?: number | null;
  documentType?: string | null;
  fileName?: string | null;
  filePath?: string | null;
  uploadedBy?: number | null;
  uploadedDt?: string | null;
  docSubmissionFormat?: string | null;
  evaluationBasis?: string | null;
  opportunityDescription?: string | null;
  leadReceivedDate?: string | null;
  expectedStartDate?: string | null;
  expectedCloseDate?: string | null;
  proposalDueDate?: string | null;
  estimatedValue?: number | null;
  estimatedValueUsd?: number | null;
  currencyId?: number | null;
  rfpType?: number | null;
  createdBy?: number | null;
  updatedBy?: number | null;
}

export interface RfpIntakeOpportunityInput {
  clientId?: number | null;
  opportunityDescription?: string | null;
  contractTerm?: string | null;
  incumbentVendor?: string | null;
  preBidmeeting?: number | null;
  leadReceivedDate?: string | null;
  opportunityName: string;
  ownerId: number;
  currencyId: number;
  estimatedValue: number;
  sourceTypeId: number;
  rfpType: number;
  priority?: string | null;
  serviceLine?: string | null;
  solicitationNumber?: string | null;
  issuingAgency?: string | null;
  procurementContact?: string | null;
  queDueDate?: string | null;
  proposalDueDate?: string | null;
  submissionMethod?: string | null;
  fileName?: string | null;
  documentType?: string | null;
  docSubmissionFormat?: string | null;
  evaluationBasis?: string | null;
  questions: string[];
  questionSelections?: RfpQuestionSelectionInput[];
  client: RfpIntakeClientInput;
  contacts: RfpIntakeContactInput[];
}

export interface RfpQuestionSelectionInput {
  questionId: number;
  question: string;
  category?: string | null;
  questionnaireTypeId?: number | null;
}

export type RfpIntakeOpportunityUpdateInput = RfpIntakeOpportunityInput;

export interface RfpIntakeClientInput {
  clientName: string;
  accountType: string;
  sector: string;
  website?: string | null;
  city: string;
  state: string;
  country: string;
  streetAddress?: string | null;
}

export interface RfpIntakeContactInput {
  fullName: string;
  titleRole: string;
  email: string;
  phone: string;
  roleInDecision: number;
  roleInDecisionOther?: string | null;
}

const SELECT_COLUMNS = `
  opportunity_id AS "opportunityId",
  opportunity_number AS "opportunityNumber",
  opportunity_name AS "opportunityName",
  opportunity_type_id AS "opportunityTypeId",
  source_type_id AS "sourceTypeId",
  client_id AS "clientId",
  stage_id AS "stageId",
  sub_stage_id AS "subStageId",
  owner_id AS "ownerId",
  assigned_to AS "assignedTo",
  priority,
  service_line AS "serviceLine",
  solicitation_number AS "solicitationNumber",
  issuing_agency AS "issuingAgency",
  procurement_contact AS "procurementContact",
  que_duedate AS "queDueDate",
  submission_method AS "submissionMethod",
  contract_term AS "contractTerm",
  incumbent_vendor AS "incumbentVendor",
  pre_bidmeeting AS "preBidMeeting",
  document_type AS "documentType",
  file_name AS "fileName",
  file_path AS "filePath",
  uploaded_by AS "uploadedBy",
  uploaded_dt AS "uploadedDt",
  doc_submission_format AS "docSubmissionFormat",
  evaluation_basis AS "evaluationBasis",
  opportunity_description AS "opportunityDescription",
  lead_received_date AS "leadReceivedDate",
  expected_start_date AS "expectedStartDate",
  expected_close_date AS "expectedCloseDate",
  proposal_due_date AS "proposalDueDate",
  created_dt AS "createdDt",
  created_by AS "createdBy",
  updated_dt AS "updatedDt",
  updated_by AS "updatedBy",
  is_active AS "isActive",
  estimated_value AS "estimatedValue",
  estimated_value_usd AS "estimatedValueUsd",
  currency_id AS "currencyId",
  opportunity_type_id AS "rfpType"
`;

const OPPORTUNITY_LIST_COLUMNS = `
  ${SELECT_COLUMNS},
  (SELECT client_name FROM mst_client WHERE client_id = o.client_id) AS "clientName",
  (SELECT account_type FROM mst_client WHERE client_id = o.client_id) AS "accountType",
  (SELECT sector FROM mst_client WHERE client_id = o.client_id) AS sector,
  (SELECT website FROM mst_client WHERE client_id = o.client_id) AS website,
  (SELECT city FROM mst_client WHERE client_id = o.client_id) AS city,
  (SELECT state FROM mst_client WHERE client_id = o.client_id) AS state,
  (SELECT country FROM mst_client WHERE client_id = o.client_id) AS country,
  (SELECT street_address FROM mst_client WHERE client_id = o.client_id) AS "streetAddress",
  COALESCE((SELECT JSON_AGG(JSON_BUILD_OBJECT(
    'fullName', COALESCE(full_name, ''), 'titleRole', COALESCE(title_role, ''),
    'email', COALESCE(email, ''), 'phone', COALESCE(phone, ''),
    'roleInDecision', role_in_decision,
    'roleInDecisionOther', role_in_decision_other
  ) ORDER BY contact_sequence NULLS LAST, client_contact_id)
    FROM tbl_client_contact_person
    WHERE client_id = o.client_id AND is_active = TRUE), '[]'::JSON) AS contacts,
  COALESCE((SELECT ARRAY_AGG(questiontext ORDER BY qa_id)
    FROM tbl_opportunity_questions_answers
    WHERE opportunity_id = o.opportunity_id AND is_active = TRUE), ARRAY[]::TEXT[]) AS "proposalQuestions",
  COALESCE((SELECT ARRAY_AGG(question_id ORDER BY qa_id)
    FROM tbl_opportunity_questions_answers
    WHERE opportunity_id = o.opportunity_id AND is_active = TRUE),
    ARRAY[]::INTEGER[]) AS "proposalQuestionIds",
  COALESCE((SELECT ARRAY_AGG(question_category ORDER BY qa_id)
    FROM tbl_opportunity_questions_answers
    WHERE opportunity_id = o.opportunity_id AND is_active = TRUE),
    ARRAY[]::TEXT[]) AS "proposalQuestionCategories",
  COALESCE((SELECT ARRAY_AGG(questionnaire_type_id ORDER BY qa_id)
    FROM tbl_opportunity_questions_answers
    WHERE opportunity_id = o.opportunity_id AND is_active = TRUE),
    ARRAY[]::INTEGER[]) AS "proposalQuestionnaireTypeIds",
  (SELECT comment FROM tbl_opportunity_engage_tracker
   WHERE opportunity_id = o.opportunity_id ORDER BY tracker_id DESC LIMIT 1) AS "workflowComment",
  (SELECT reason_code_id FROM tbl_opportunity_engage_tracker
   WHERE opportunity_id = o.opportunity_id ORDER BY tracker_id DESC LIMIT 1) AS "workflowReasonCodeId"
`;

async function saveClientContact(
  client: PoolClient,
  clientId: number,
  contact: RfpIntakeContactInput,
  contactSequence: number,
  userId: number
): Promise<void> {
  const existingContact = await client.query<{ clientContactId: number }>(
    `SELECT client_contact_id AS "clientContactId"
     FROM tbl_client_contact_person
     WHERE client_id = $1 AND LOWER(email) = LOWER($2) AND is_active = TRUE
     ORDER BY client_contact_id
     LIMIT 1
     FOR UPDATE`,
    [clientId, contact.email.trim()]
  );
  const existingContactId = existingContact.rows[0]?.clientContactId;
  if (existingContactId) {
    await client.query(
      `UPDATE tbl_client_contact_person_tracker
       SET is_current = FALSE
       WHERE client_contact_id = $1 AND is_current = TRUE`,
      [existingContactId]
    );
  }

  const savedContact = existingContactId
    ? await client.query<{ clientContactId: number }>(
        `UPDATE tbl_client_contact_person
         SET full_name = $1, title_role = $2, email = $3, phone = $4,
             role_in_decision = $5, updated_dt = CURRENT_TIMESTAMP,
             updated_by = $6, is_active = TRUE, role_in_decision_other = $8, contact_sequence = $9
         WHERE client_contact_id = $7
         RETURNING client_contact_id AS "clientContactId"`,
        [contact.fullName.trim(), contact.titleRole.trim(), contact.email.trim(), contact.phone.trim(),
          contact.roleInDecision, userId, existingContactId, contact.roleInDecision === 10 ? contact.roleInDecisionOther?.trim() || null : null, contactSequence]
      )
    : await client.query<{ clientContactId: number }>(
        `INSERT INTO tbl_client_contact_person
           (client_id, full_name, title_role, email, phone, role_in_decision,
            contact_sequence, created_by, is_active, role_in_decision_other)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE, $9)
         RETURNING client_contact_id AS "clientContactId"`,
        [clientId, contact.fullName.trim(), contact.titleRole.trim(), contact.email.trim(),
          contact.phone.trim(), contact.roleInDecision, contactSequence, userId, contact.roleInDecision === 10 ? contact.roleInDecisionOther?.trim() || null : null]
      );

  await client.query(
    `INSERT INTO tbl_client_contact_person_tracker
       (client_contact_id, client_id, full_name, title_role, email, phone, role_in_decision, role_in_decision_other,
        contact_sequence, created_dt, created_by, updated_dt, updated_by, is_current)
     SELECT client_contact_id, client_id, full_name, title_role, email, phone, role_in_decision, role_in_decision_other,
            contact_sequence, created_dt, created_by, updated_dt, updated_by, TRUE
     FROM tbl_client_contact_person WHERE client_contact_id = $1`,
    [savedContact.rows[0].clientContactId]
  );
}

async function recordProposalQuestionSnapshot(client: PoolClient, qaId: number, isCurrent = true): Promise<void> {
  await client.query(
    `UPDATE tbl_opportunity_questions_answers_tracker
     SET is_current = FALSE WHERE qa_id = $1 AND is_current = TRUE`,
    [qaId]
  );
  await client.query(
    `INSERT INTO tbl_opportunity_questions_answers_tracker
       (qa_id, opportunity_id, opportunity_type_id, question_id, questiontext, question_category, questionnaire_type_id, answertext,
        answered_by, answered_dt, created_dt, created_by, updated_dt, updated_by, is_current)
     SELECT qa_id, opportunity_id, opportunity_type_id, question_id, questiontext, question_category, questionnaire_type_id, answertext,
            answered_by, answered_dt, created_dt, created_by, updated_dt, updated_by, ${isCurrent ? 'TRUE' : 'FALSE'}
     FROM tbl_opportunity_questions_answers WHERE qa_id = $1`,
    [qaId]
  );
}

export interface OpportunityResponse {
  id: number;
  title: string;
  category: string | null;
  answer: string;
  revision: number;
}

// The tracker already records every saved question/answer version.
const RESPONSE_COLUMNS = `q.qa_id AS id, q.questiontext AS title, q.question_category AS category,
  COALESCE(q.answertext, '') AS answer,
  (SELECT COUNT(*)::INTEGER FROM tbl_opportunity_questions_answers_tracker h WHERE h.qa_id = q.qa_id) AS revision`;

export async function findResponses(opportunityId: number): Promise<OpportunityResponse[]> {
  return query<OpportunityResponse>(`SELECT ${RESPONSE_COLUMNS}
    FROM tbl_opportunity_questions_answers q
    WHERE q.opportunity_id = $1 AND q.is_active = TRUE ORDER BY q.qa_id`, [opportunityId]);
}

export async function saveAnswer(opportunityId: number, responseId: number, revision: number, answer: string, userId: number): Promise<void> {
  await transaction(async client => {
    // Match the lock order used when opportunity edits synchronise questions.
    const opportunity = await client.query(`SELECT opportunity_id FROM tbl_opportunity
      WHERE opportunity_id = $1 AND is_active = TRUE FOR UPDATE`, [opportunityId]);
    if (!opportunity.rows.length) throw notFound('Opportunity not found.');
    const result = await client.query<OpportunityResponse>(`SELECT ${RESPONSE_COLUMNS}
      FROM tbl_opportunity_questions_answers q
      WHERE q.opportunity_id = $1 AND q.qa_id = $2 AND q.is_active = TRUE FOR UPDATE OF q`, [opportunityId, responseId]);
    const current = result.rows[0];
    if (!current) throw notFound('This question is no longer available for this opportunity.');
    if (current.revision !== revision) throw conflict('This answer or question has changed. Refresh the opportunity before saving again.');
    if (current.answer === answer) return;
    await client.query(`UPDATE tbl_opportunity_questions_answers
      SET answertext = $3, answered_by = $4, answered_dt = CURRENT_TIMESTAMP,
          updated_by = $4, updated_dt = CURRENT_TIMESTAMP
      WHERE opportunity_id = $1 AND qa_id = $2 AND is_active = TRUE`, [opportunityId, responseId, answer, userId]);
    await recordProposalQuestionSnapshot(client, responseId);
  });
}

async function archiveAndRemoveProposalQuestion(client: PoolClient, qaId: number, userId: number | null): Promise<void> {
  await client.query(`UPDATE tbl_opportunity_questions_answers SET is_active = FALSE,
    updated_dt = CURRENT_TIMESTAMP, updated_by = $2 WHERE qa_id = $1`, [qaId, userId]);
  await recordProposalQuestionSnapshot(client, qaId, false);
  await client.query('DELETE FROM tbl_opportunity_questions_answers WHERE qa_id = $1', [qaId]);
}

interface PersistedRfpQuestionSelection {
  questionId: number | null;
  question: string;
  category: string;
  questionnaireTypeId?: number | null;
}

function getRfpQuestionSelections(input: RfpIntakeOpportunityInput): PersistedRfpQuestionSelection[] {
  if (input.questionSelections?.length) {
    return input.questionSelections.map((selection) => ({
      questionId: selection.questionId,
      question: selection.question.trim(),
      category: selection.category?.trim() || 'Other',
      questionnaireTypeId: selection.questionnaireTypeId,
    }));
  }
  return input.questions.map((question) => ({ questionId: null, question: question.trim(), category: 'Other' }));
}


async function saveProposalQuestion(
  client: PoolClient,
  opportunityId: number,
  selection: PersistedRfpQuestionSelection,
  userId: number,
  opportunityTypeId = GENERIC_RFP_TYPE_ID
): Promise<void> {
  const existing = await client.query<{
    qaId: number;
    questionId: number | null;
    question: string;
    category: string | null;
    opportunityTypeId: number | null;
    questionnaireTypeId: number | null;
  }>(
        `SELECT qa_id AS "qaId", question_id AS "questionId", questiontext AS question,
          question_category AS category, questionnaire_type_id AS "questionnaireTypeId",
            opportunity_type_id AS "opportunityTypeId"
     FROM tbl_opportunity_questions_answers
     WHERE opportunity_id = $1 AND is_active = TRUE
       AND (($2::INTEGER IS NOT NULL AND question_id = $2)
         OR ($2::INTEGER IS NULL AND question_id IS NULL AND questiontext = $3))
     ORDER BY CASE WHEN question_id = $2 THEN 0 ELSE 1 END, qa_id
     LIMIT 1`,
    [opportunityId, selection.questionId, selection.question]
  );
  const questionnaireTypeId = opportunityTypeId === 1
    ? selection.questionnaireTypeId ?? existing.rows[0]?.questionnaireTypeId ?? 1
    : null;
  if (existing.rows[0]) {
    const current = existing.rows[0];
    if (current.opportunityTypeId !== opportunityTypeId ||
      current.question !== selection.question ||
      current.category !== selection.category ||
      (current.questionnaireTypeId ?? null) !== questionnaireTypeId ||
        (selection.questionId !== null && current.questionId !== selection.questionId)) {
      await client.query(
        `UPDATE tbl_opportunity_questions_answers
       SET opportunity_type_id = $2, question_id = COALESCE($3, question_id),
         questiontext = $4, question_category = $5, updated_dt = CURRENT_TIMESTAMP, updated_by = $6,
         questionnaire_type_id = $7
         WHERE qa_id = $1`,
      [current.qaId, opportunityTypeId, selection.questionId, selection.question, selection.category, userId, questionnaireTypeId]
      );
      await recordProposalQuestionSnapshot(client, current.qaId);
    }
    return;
  }

  const inserted = await client.query<{ qaId: number }>(
    `INSERT INTO tbl_opportunity_questions_answers
       (opportunity_id, opportunity_type_id, question_id, questiontext, question_category, answertext, created_by, is_active, questionnaire_type_id)
     VALUES ($1, $2, $3, $4, $5, NULL, $6, TRUE, $7)
     RETURNING qa_id AS "qaId"`,
    [opportunityId, opportunityTypeId, selection.questionId, selection.question, selection.category, userId, questionnaireTypeId]
  );
  await recordProposalQuestionSnapshot(client, inserted.rows[0].qaId);
}

async function findClients() {
  return query(`SELECT c.client_id AS "clientId",
    COALESCE(NULLIF(TRIM(c.client_name), ''), 'Client ' || c.client_id::TEXT) AS "clientName",
    c.account_type AS "accountType", c.sector, c.website, c.city, c.state, c.country,
    c.street_address AS "streetAddress",
    COALESCE((SELECT JSON_AGG(JSON_BUILD_OBJECT('fullName', COALESCE(full_name, ''), 'titleRole', COALESCE(title_role, ''),
      'email', COALESCE(email, ''), 'phone', COALESCE(phone, ''), 'roleInDecision', role_in_decision, 'roleInDecisionOther', role_in_decision_other)
      ORDER BY contact_sequence NULLS LAST, client_contact_id)
      FROM tbl_client_contact_person WHERE client_id = c.client_id AND is_active = TRUE), '[]'::JSON) AS contacts
    FROM mst_client c ORDER BY c.client_name NULLS LAST, c.client_id`);
}

export async function createClient(input: RfpIntakeClientInput, contacts: RfpIntakeContactInput[], userId: number) {
  return transaction(async client => {
    const result = await client.query<{ clientId: number }>(
      `INSERT INTO mst_client (client_name, account_type, sector, website, city, state, country,
        street_address, created_by, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE) RETURNING client_id AS "clientId"`,
      [input.clientName.trim(), input.accountType.trim(), input.sector.trim(), input.website?.trim() || null,
        input.city.trim(), input.state.trim(), input.country.trim(), input.streetAddress?.trim() || null, userId]);
    const clientId = result.rows[0].clientId;
    await client.query(
      `INSERT INTO mst_client_tracker
       (client_id, client_name, account_type, sector, website, city, state, country,
        street_address, created_dt, created_by, updated_dt, updated_by, is_active)
       SELECT client_id, client_name, account_type, sector, website, city, state, country,
        street_address, created_dt, created_by, updated_dt, updated_by, TRUE FROM mst_client WHERE client_id = $1`, [clientId]);
    for (const [index, contact] of contacts.entries()) {
      await saveClientContact(client, clientId, contact, index + 1, userId);
    }
    return clientId;
  });
}

export async function updateClient(clientId: number, input: RfpIntakeClientInput, contacts: RfpIntakeContactInput[], userId: number) {
  return transaction(async client => {
    const existing = await client.query('SELECT client_id FROM mst_client WHERE client_id = $1 FOR UPDATE', [clientId]);
    if (!existing.rows.length) throw new Error('Client not found.');
    await client.query(
      `UPDATE mst_client SET client_name = $1, account_type = $2, sector = $3, website = $4,
       city = $5, state = $6, country = $7, street_address = $8,
       updated_dt = CURRENT_TIMESTAMP, updated_by = $9 WHERE client_id = $10`,
      [input.clientName.trim(), input.accountType.trim(), input.sector.trim(), input.website?.trim() || null,
        input.city.trim(), input.state.trim(), input.country.trim(), input.streetAddress?.trim() || null, userId, clientId]);
    await client.query(
      `INSERT INTO mst_client_tracker
       (client_id, client_name, account_type, sector, website, city, state, country,
        street_address, created_dt, created_by, updated_dt, updated_by, is_active)
       SELECT client_id, client_name, account_type, sector, website, city, state, country,
        street_address, created_dt, created_by, updated_dt, updated_by, is_active
       FROM mst_client WHERE client_id = $1`, [clientId]);
    const removed = await client.query<{ clientContactId: number }>(
      `UPDATE tbl_client_contact_person SET is_active = FALSE, updated_dt = CURRENT_TIMESTAMP, updated_by = $3
       WHERE client_id = $1 AND is_active = TRUE AND NOT (LOWER(email) = ANY($2::TEXT[]))
       RETURNING client_contact_id AS "clientContactId"`, [clientId, contacts.map(contact => contact.email.trim().toLowerCase()), userId]);
    for (const contact of removed.rows) {
      await client.query('UPDATE tbl_client_contact_person_tracker SET is_current = FALSE WHERE client_contact_id = $1 AND is_current = TRUE', [contact.clientContactId]);
      await client.query(
        `INSERT INTO tbl_client_contact_person_tracker
         (client_contact_id, client_id, full_name, title_role, email, phone, role_in_decision, role_in_decision_other,
          contact_sequence, created_dt, created_by, updated_dt, updated_by, is_current)
         SELECT client_contact_id, client_id, full_name, title_role, email, phone, role_in_decision, role_in_decision_other,
          contact_sequence, created_dt, created_by, updated_dt, updated_by, TRUE
         FROM tbl_client_contact_person WHERE client_contact_id = $1`, [contact.clientContactId]);
    }
    for (const [index, contact] of contacts.entries()) await saveClientContact(client, clientId, contact, index + 1, userId);
    return clientId;
  });
}

async function findAll(): Promise<Opportunity[]> {
  return query<Opportunity>(
    `SELECT ${OPPORTUNITY_LIST_COLUMNS}
     FROM tbl_opportunity o
     WHERE o.is_active = TRUE
     ORDER BY o.opportunity_id DESC`
  );
}

async function findOwnedBy(ownerId: number): Promise<Opportunity[]> {
  return query<Opportunity>(
    `SELECT ${OPPORTUNITY_LIST_COLUMNS} FROM tbl_opportunity o
     WHERE o.created_by = $1 AND o.is_active = TRUE ORDER BY o.opportunity_id DESC`,
    [ownerId]
  );
}

async function findOwnedByUsers(ownerIds: number[]): Promise<Opportunity[]> {
  if (ownerIds.length === 0) return [];
  return query<Opportunity>(
    `SELECT ${OPPORTUNITY_LIST_COLUMNS}
     FROM tbl_opportunity o
     WHERE o.owner_id = ANY($1::INTEGER[]) AND o.is_active = TRUE
     ORDER BY o.opportunity_id DESC`,
      [ownerIds]
  );
}

async function findAssignedTo(userId: number): Promise<Opportunity[]> {
  return query<Opportunity>(
    `SELECT ${OPPORTUNITY_LIST_COLUMNS}
     FROM tbl_opportunity o
     WHERE o.assigned_to = $1 AND o.is_active = TRUE
     ORDER BY o.opportunity_id DESC`,
    [userId]
  );
}

async function findByWorkflowStage(stageId: number, subStageIds: number[], includeEstimation = false): Promise<Opportunity[]> {
  return query<Opportunity>(
    `SELECT ${OPPORTUNITY_LIST_COLUMNS} FROM tbl_opportunity o
     WHERE ((o.stage_id = $1 AND o.sub_stage_id = ANY($2::INTEGER[]))
       OR ($3::BOOLEAN AND ((o.stage_id = 3 AND o.sub_stage_id = 7)
         OR (o.stage_id = 4 AND o.sub_stage_id IN (8, 9))
         OR (o.stage_id = 5 AND o.sub_stage_id = 10)))) AND o.is_active = TRUE
     ORDER BY o.opportunity_id DESC`,
    [stageId, subStageIds, includeEstimation]
  );
}

async function findById(
  opportunityId: number
): Promise<Opportunity | null> {
  const rows = await query<Opportunity>(
    `SELECT ${OPPORTUNITY_LIST_COLUMNS}
     FROM tbl_opportunity o
     WHERE o.opportunity_id = $1 AND o.is_active = TRUE`,
    [opportunityId]
  );

  return rows[0] || null;
}

type UpdateWorkflow = Pick<Opportunity, 'stageId' | 'subStageId' | 'createdBy' | 'assignedTo'>;

// Saving corrections returns only the requested review to its pending step.
// All writes use the caller's transaction, including the review audit.
async function returnUpdatedOpportunityForReview(client: PoolClient, opportunityId: number,
  current: UpdateWorkflow, userId: number | null, audit: WorkflowAudit): Promise<UpdateWorkflow> {
  const salesChanges = current.stageId === 1 && current.subStageId === 2;
  const ceoChanges = current.stageId === 2 && current.subStageId === 5;
  if (!salesChanges && !ceoChanges) return current;
  if (salesChanges && current.createdBy !== userId) return current;
  const next = { ...current, subStageId: salesChanges ? 1 : 4, assignedTo: null };
  await client.query(`UPDATE tbl_opportunity SET sub_stage_id = $2, assigned_to = NULL,
    updated_by = $3, updated_dt = CURRENT_TIMESTAMP WHERE opportunity_id = $1`,
    [opportunityId, next.subStageId, userId]);
  await client.query(`UPDATE tbl_opportunity_engage_tracker SET is_current = FALSE
    WHERE opportunity_id = $1 AND is_current = TRUE`, [opportunityId]);
  await client.query(`INSERT INTO tbl_opportunity_engage_tracker
    (opportunity_id, stage_id, substage_id, updated_by, updated_dt, is_current, comment, reason_code_id, role_id, role_name)
    VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, TRUE, $5, NULL, $6, $7)`,
    [opportunityId, next.stageId, next.subStageId, userId,
      `Opportunity updated and sent to ${salesChanges ? 'Sales Head' : 'CEO'} for review.`, audit.roleId ?? null, audit.roleName ?? null]);
  return next;
}

async function updateRfpIntakeOpportunity(
  opportunityId: number,
  input: RfpIntakeOpportunityUpdateInput,
  userId: number,
  audit: WorkflowAudit = {}
): Promise<Opportunity | null> {
  return transaction(async (client) => {
    const existing = await client.query<UpdateWorkflow & { clientId: number }>(
      `SELECT client_id AS "clientId", stage_id AS "stageId", sub_stage_id AS "subStageId",
         created_by AS "createdBy", assigned_to AS "assignedTo"
       FROM tbl_opportunity
       WHERE opportunity_id = $1 AND is_active = TRUE
       FOR UPDATE`,
      [opportunityId]
    );
    const clientId = existing.rows[0]?.clientId;
    if (!clientId) return null;

    await client.query(
      `UPDATE mst_client
       SET client_name = $1, account_type = $2, sector = $3, website = $4,
           city = $5, state = $6, country = $7, street_address = $8,
           updated_dt = CURRENT_TIMESTAMP, updated_by = $9, is_active = TRUE
       WHERE client_id = $10`,
      [input.client.clientName.trim(), input.client.accountType, input.client.sector,
        input.client.website?.trim() || null, input.client.city, input.client.state,
        input.client.country, input.client.streetAddress?.trim() || null, userId, clientId]
    );
    await client.query(
      `UPDATE mst_client_tracker SET is_active = FALSE WHERE client_id = $1 AND is_active = TRUE`,
      [clientId]
    );
    await client.query(
      `INSERT INTO mst_client_tracker
         (client_id, client_name, account_type, sector, website, city, state, country,
          street_address, created_dt, created_by, updated_dt, updated_by, is_active)
       SELECT client_id, client_name, account_type, sector, website, city, state, country,
              street_address, created_dt, created_by, updated_dt, updated_by, TRUE
       FROM mst_client WHERE client_id = $1`,
      [clientId]
    );

    const activeEmails = input.contacts.map((contact) => contact.email.trim().toLowerCase());
    const removedContacts = await client.query<{ clientContactId: number }>(
      `UPDATE tbl_client_contact_person
       SET is_active = FALSE, updated_dt = CURRENT_TIMESTAMP, updated_by = $3
       WHERE client_id = $1 AND is_active = TRUE
         AND NOT (LOWER(email) = ANY($2::TEXT[]))
       RETURNING client_contact_id AS "clientContactId"`,
      [clientId, activeEmails, userId]
    );
    const removedContactIds = removedContacts.rows.map((contact) => contact.clientContactId);
    if (removedContactIds.length > 0) {
      await client.query(
        `UPDATE tbl_client_contact_person_tracker
         SET is_current = FALSE
         WHERE client_contact_id = ANY($1::INTEGER[]) AND is_current = TRUE`,
        [removedContactIds]
      );
      await client.query(
        `INSERT INTO tbl_client_contact_person_tracker
           (client_contact_id, client_id, full_name, title_role, email, phone, role_in_decision, role_in_decision_other,
            contact_sequence, created_dt, created_by, updated_dt, updated_by, is_current)
         SELECT client_contact_id, client_id, full_name, title_role, email, phone, role_in_decision, role_in_decision_other,
                contact_sequence, created_dt, created_by, updated_dt, updated_by, TRUE
         FROM tbl_client_contact_person WHERE client_contact_id = ANY($1::INTEGER[])`,
        [removedContactIds]
      );
    }
    await input.contacts.reduce<Promise<void>>(
      (previous, contact, index) => previous.then(() =>
        saveClientContact(client, clientId, contact, index + 1, userId)
      ),
      Promise.resolve()
    );

    const questionSelections = getRfpQuestionSelections(input);
    await syncProposalQuestions(client, opportunityId, {
      proposalQuestionSelections: questionSelections, rfpType: input.rfpType,
    }, userId);

    await client.query(
      `UPDATE tbl_opportunity
       SET opportunity_name = $1, source_type_id = $2, owner_id = $3, priority = $4,
           service_line = $5, solicitation_number = $6, issuing_agency = $7,
           procurement_contact = $8, que_duedate = $9, proposal_due_date = $10,
           submission_method = $11, file_name = $12, document_type = $13,
             doc_submission_format = $14, evaluation_basis = $15,
             estimated_value = $16, currency_id = $17, opportunity_type_id = $18,
             updated_by = $19, updated_dt = CURRENT_TIMESTAMP
           WHERE opportunity_id = $20 AND is_active = TRUE`,
      [input.opportunityName.trim(), input.sourceTypeId, input.ownerId,
        input.priority?.trim() || null, input.serviceLine?.trim() || null,
        input.solicitationNumber?.trim() || null, input.issuingAgency?.trim() || null,
        input.procurementContact?.trim() || null, input.queDueDate || null,
        input.proposalDueDate || null, input.submissionMethod?.trim() || null,
        input.fileName?.trim() || null, input.documentType?.trim() || null,
        input.docSubmissionFormat?.trim() || null, input.evaluationBasis?.trim() || null,
        input.estimatedValue, input.currencyId,
        input.rfpType, userId, opportunityId]
    );
    await client.query(`UPDATE tbl_opportunity SET opportunity_description = COALESCE($2, opportunity_description),
      contract_term = COALESCE($3, contract_term), incumbent_vendor = COALESCE($4, incumbent_vendor),
      pre_bidmeeting = COALESCE($5, pre_bidmeeting), lead_received_date = COALESCE($6::TIMESTAMP, lead_received_date) WHERE opportunity_id = $1`,
      [opportunityId, input.opportunityDescription ?? null, input.contractTerm ?? null,
        input.incumbentVendor ?? null, input.preBidmeeting ?? null, input.leadReceivedDate || null]);
    await returnUpdatedOpportunityForReview(client, opportunityId, existing.rows[0], userId, audit);
    await client.query(
      `UPDATE tbl_opportunity_tracker SET is_current = FALSE
       WHERE opportunity_id = $1 AND is_current = TRUE`,
      [opportunityId]
    );
    await client.query(
      `INSERT INTO tbl_opportunity_tracker
         (opportunity_id, opportunity_number, opportunity_name, opportunity_type_id, source_type_id,
          client_id, stage_id, sub_stage_id, owner_id, assigned_to, priority, service_line,
          solicitation_number, issuing_agency, procurement_contact, que_duedate, submission_method,
          contract_term, incumbent_vendor, pre_bidmeeting, document_type, file_name, file_path,
            uploaded_by, uploaded_dt, doc_submission_format, evaluation_basis, opportunity_description,
          lead_received_date, expected_start_date, expected_close_date, proposal_due_date, created_dt,
          created_by, updated_dt, updated_by, is_current, estimated_value, currency_id, estimated_value_usd)
       SELECT opportunity_id, opportunity_number, opportunity_name, opportunity_type_id, source_type_id,
          client_id, stage_id, sub_stage_id, owner_id, assigned_to, priority, service_line,
          solicitation_number, issuing_agency, procurement_contact, que_duedate, submission_method,
          contract_term, incumbent_vendor, pre_bidmeeting, document_type, file_name, file_path,
          uploaded_by, uploaded_dt, doc_submission_format, evaluation_basis, opportunity_description,
          lead_received_date, expected_start_date, expected_close_date, proposal_due_date, created_dt,
          created_by, updated_dt, updated_by, TRUE, estimated_value, currency_id, estimated_value_usd
       FROM tbl_opportunity WHERE opportunity_id = $1`,
      [opportunityId]
    );
    const result = await client.query<Opportunity>(
      `SELECT ${OPPORTUNITY_LIST_COLUMNS}
       FROM tbl_opportunity o WHERE o.opportunity_id = $1`,
      [opportunityId]
    );
    return result.rows[0] ?? null;
  });
}

async function finalizeRfpIntakeOpportunity(
  input: RfpIntakeOpportunityInput,
  userId: number,
  salesHeadId: number | null
): Promise<{ opportunityId: number; opportunityName: string; opportunityNumber: string }> {
  return transaction(async (client) => {
    await client.query("SELECT pg_advisory_xact_lock(hashtext(LOWER($1)))", [input.client.clientName]);

    const existingClient = await client.query<{ clientId: number }>(
      `SELECT client_id AS "clientId"
       FROM mst_client
       WHERE (($2::INTEGER IS NOT NULL AND client_id = $2)
         OR ($2::INTEGER IS NULL AND LOWER(client_name) = LOWER($1))) AND is_active = TRUE
       ORDER BY client_id
       LIMIT 1
       FOR UPDATE`,
      [input.client.clientName.trim(), input.clientId ?? null]
    );
    if (input.clientId && !existingClient.rows[0]) throw new Error("The selected client is no longer available.");
    const clientResult = input.clientId ? existingClient : existingClient.rows[0]
      ? await client.query<{ clientId: number }>(
          `UPDATE mst_client
           SET client_name = $1, account_type = $2, sector = $3, website = $4,
               city = $5, state = $6, country = $7, street_address = $8,
               updated_dt = CURRENT_TIMESTAMP, updated_by = $9, is_active = TRUE
           WHERE client_id = $10
           RETURNING client_id AS "clientId"`,
          [input.client.clientName.trim(), input.client.accountType, input.client.sector,
            input.client.website?.trim() || null, input.client.city, input.client.state,
            input.client.country, input.client.streetAddress?.trim() || null, userId,
            existingClient.rows[0].clientId]
        )
      : await client.query<{ clientId: number }>(
          `INSERT INTO mst_client
             (client_name, account_type, sector, website, city, state, country,
              street_address, created_by, is_active)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE)
           RETURNING client_id AS "clientId"`,
          [input.client.clientName.trim(), input.client.accountType, input.client.sector,
            input.client.website?.trim() || null, input.client.city, input.client.state,
            input.client.country, input.client.streetAddress?.trim() || null, userId]
        );
    const clientId = clientResult.rows[0].clientId;

    await client.query(
      `UPDATE mst_client_tracker SET is_active = FALSE WHERE client_id = $1 AND is_active = TRUE`,
      [clientId]
    );
    await client.query(
      `INSERT INTO mst_client_tracker
         (client_id, client_name, account_type, sector, website, city, state, country,
          street_address, created_dt, created_by, updated_dt, updated_by, is_active)
       SELECT client_id, client_name, account_type, sector, website, city, state, country,
              street_address, created_dt, created_by, updated_dt, updated_by, TRUE
       FROM mst_client WHERE client_id = $1`,
      [clientId]
    );

    const created = await client.query<{ opportunityId: number; opportunityName: string; opportunityNumber: string }>(
      `INSERT INTO tbl_opportunity
         (opportunity_number, opportunity_name, opportunity_type_id, source_type_id, client_id, stage_id, sub_stage_id,
          owner_id, assigned_to, currency_id, estimated_value, priority, service_line,
          solicitation_number, issuing_agency, procurement_contact, que_duedate, submission_method,
          file_name, document_type, doc_submission_format, evaluation_basis,
          proposal_due_date, created_by, is_active)
       VALUES (
         fn_next_opportunity_number(),
         $1, $10, $2, $3, 1, 1, $4, $5, $6, $7, $8, $9,
         $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, TRUE
       )
       RETURNING opportunity_id AS "opportunityId", opportunity_name AS "opportunityName",
                 opportunity_number AS "opportunityNumber"`,
      [input.opportunityName.trim(), input.sourceTypeId, clientId, input.ownerId, salesHeadId,
        input.currencyId, input.estimatedValue, input.priority?.trim() || null,
        input.serviceLine?.trim() || null, input.rfpType,
        input.solicitationNumber?.trim() || null, input.issuingAgency?.trim() || null,
        input.procurementContact?.trim() || null, input.queDueDate || null,
        input.submissionMethod?.trim() || null, input.fileName?.trim() || null,
        input.documentType?.trim() || null, input.docSubmissionFormat?.trim() || null,
        input.evaluationBasis?.trim() || null,
        input.proposalDueDate || null, userId]
    );
    const opportunity = created.rows[0];

    await client.query(`UPDATE tbl_opportunity SET opportunity_description = $2, contract_term = $3,
      incumbent_vendor = $4, pre_bidmeeting = $5, lead_received_date = $6 WHERE opportunity_id = $1`,
      [opportunity.opportunityId, input.opportunityDescription || null, input.contractTerm || null,
        input.incumbentVendor || null, input.preBidmeeting ?? null, input.leadReceivedDate || null]);

    await client.query(
      `INSERT INTO tbl_opportunity_tracker
         (opportunity_id, opportunity_number, opportunity_name, opportunity_type_id, source_type_id, client_id,
         stage_id, sub_stage_id, owner_id, assigned_to, priority, service_line,
         solicitation_number, issuing_agency, procurement_contact, que_duedate, submission_method,
        file_name, document_type, doc_submission_format, evaluation_basis,
         proposal_due_date, created_by, is_current, estimated_value, currency_id)
       VALUES ($1, $2, $3, $4, $5, $6, 1, 1, $7, $8, $9, $10,
         $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, TRUE, $22, $23)`,
      [opportunity.opportunityId, opportunity.opportunityNumber, opportunity.opportunityName,
        input.rfpType, input.sourceTypeId, clientId, input.ownerId, salesHeadId, input.priority?.trim() || null,
        input.serviceLine?.trim() || null, input.solicitationNumber?.trim() || null,
        input.issuingAgency?.trim() || null, input.procurementContact?.trim() || null,
        input.queDueDate || null, input.submissionMethod?.trim() || null,
        input.fileName?.trim() || null, input.documentType?.trim() || null,
        input.docSubmissionFormat?.trim() || null, input.evaluationBasis?.trim() || null,
        input.proposalDueDate || null,
        userId, input.estimatedValue, input.currencyId]
    );

    await client.query(
      `INSERT INTO tbl_opportunity_engage_tracker
         (opportunity_id, stage_id, substage_id, updated_by, updated_dt, is_current, comment)
       VALUES ($1, 1, 1, $2, CURRENT_TIMESTAMP, TRUE, NULL)`,
      [opportunity.opportunityId, userId]
    );

    await client.query(`UPDATE tbl_opportunity_tracker t SET opportunity_description = o.opportunity_description,
      contract_term = o.contract_term, incumbent_vendor = o.incumbent_vendor,
      pre_bidmeeting = o.pre_bidmeeting, lead_received_date = o.lead_received_date
      FROM tbl_opportunity o WHERE t.opportunity_id = o.opportunity_id AND o.opportunity_id = $1 AND t.is_current = TRUE`,
      [opportunity.opportunityId]);

    await (input.clientId ? [] : input.contacts).reduce<Promise<void>>(
      (previous, contact, index) => previous.then(() =>
        saveClientContact(client, clientId, contact, index + 1, userId)
      ),
      Promise.resolve()
    );

    await getRfpQuestionSelections(input).reduce<Promise<void>>(
      (previous, selection) => previous.then(() =>
        saveProposalQuestion(client, opportunity.opportunityId, selection, userId, input.rfpType)
      ),
      Promise.resolve()
    );

    return opportunity;
  });
}

export type OpportunityWorkflowAction = 'REQUEST_CHANGES' | 'HOLD' | 'APPROVE' | 'REJECT' | 'RESUBMIT' | 'SUBMIT_ESTIMATE' | 'BID_SUBMITTED' | 'START_NEGOTIATION' | 'MARK_WON' | 'MARK_LOST' | 'OPPORTUNITY_HOLD' | 'RESUME_NEGOTIATION' | 'RESUME_PROPOSAL' | 'CLOSE_OPPORTUNITY';

export interface WorkflowAudit {
  reasonCodeId?: number | null;
  roleId?: number | null;
  roleName?: string | null;
}

export interface OpportunityStageHistory {
  id: number;
  stageId: number;
  subStageId: number;
  reachedAt: Date | string;
  updatedBy: number | null;
  comment: string | null;
}

export async function findStageHistory(opportunityId: number): Promise<OpportunityStageHistory[]> {
  return query<OpportunityStageHistory>(
    `SELECT tracker_id AS id, stage_id AS "stageId", substage_id AS "subStageId",
            updated_dt AS "reachedAt", updated_by AS "updatedBy", comment
     FROM tbl_opportunity_engage_tracker
     WHERE opportunity_id = $1
     ORDER BY updated_dt ASC, tracker_id ASC`,
    [opportunityId]
  );
}

export interface OpportunityEstimation {
  revision: number;
  rows: { id: string; workItem: string; hours: string; people: number; hourlyRate: string }[];
  assumptions: string;
  total: string;
}

export async function findEstimation(opportunityId: number): Promise<OpportunityEstimation | null> {
  const rows = await query<OpportunityEstimation>(
    'SELECT revision, rows, assumptions, total::TEXT AS total FROM tbl_opportunity_estimation_matrix WHERE opportunity_id = $1', [opportunityId]);
  return rows[0] ?? null;
}

export async function saveEstimation(opportunityId: number, estimation: OpportunityEstimation, userId: number) {
  return transaction(async client => {
    const opportunity = await client.query<{ stage_id: number; sub_stage_id: number }>(
      'SELECT stage_id, sub_stage_id FROM tbl_opportunity WHERE opportunity_id = $1 AND is_active = TRUE FOR UPDATE', [opportunityId]);
    if (opportunity.rows[0]?.stage_id !== 3 || opportunity.rows[0]?.sub_stage_id !== 7) throw new Error('The opportunity is no longer in estimation. Refresh before saving.');
    const result = await client.query(
      `INSERT INTO tbl_opportunity_estimation_matrix (opportunity_id, revision, rows, assumptions, total, updated_by)
       SELECT $1, 1, $2::JSONB, $3, $4, $5 WHERE $6 = 0 OR EXISTS
         (SELECT 1 FROM tbl_opportunity_estimation_matrix WHERE opportunity_id = $1)
       ON CONFLICT (opportunity_id) DO UPDATE SET revision = tbl_opportunity_estimation_matrix.revision + 1,
         rows = EXCLUDED.rows, assumptions = EXCLUDED.assumptions, total = EXCLUDED.total,
         updated_by = EXCLUDED.updated_by, updated_dt = CURRENT_TIMESTAMP
       WHERE tbl_opportunity_estimation_matrix.revision = $6 RETURNING revision`,
      [opportunityId, JSON.stringify(estimation.rows), estimation.assumptions, estimation.total, userId, estimation.revision]);
    if (!result.rows.length) throw new Error('The estimation changed. Refresh before saving.');
  });
}

async function transitionWorkflow(
  opportunityId: number,
  stageId: number,
  subStageId: number,
  assignedTo: number | null,
  userId: number,
  comment: string | null,
  opportunityDescription?: string | null,
  audit: WorkflowAudit = {},
  expected?: { stageId: number | null; subStageId: number | null }
): Promise<Opportunity | null> {
  return transaction(async (client) => {
    if (expected) {
      const current = await client.query<{ stageId: number; subStageId: number }>(
        'SELECT stage_id AS "stageId", sub_stage_id AS "subStageId" FROM tbl_opportunity WHERE opportunity_id = $1 AND is_active = TRUE FOR UPDATE', [opportunityId]);
      if (!current.rows[0] || current.rows[0].stageId !== expected.stageId || current.rows[0].subStageId !== expected.subStageId) throw new Error('This opportunity changed while you were reviewing it. Refresh before making a decision.');
    }
    const updated = await client.query<{ opportunityId: number }>(
      `UPDATE tbl_opportunity
       SET stage_id = $1, sub_stage_id = $2, assigned_to = $3,
           opportunity_description = COALESCE($4, opportunity_description),
           updated_by = $5, updated_dt = CURRENT_TIMESTAMP
       WHERE opportunity_id = $6 AND is_active = TRUE
       RETURNING opportunity_id AS "opportunityId"`,
      [stageId, subStageId, assignedTo, opportunityDescription ?? null, userId, opportunityId]
    );
    if (!updated.rows[0]) return null;

    await client.query(
      `UPDATE tbl_opportunity_tracker SET is_current = FALSE
       WHERE opportunity_id = $1 AND is_current = TRUE`,
      [opportunityId]
    );
    await client.query(
      `INSERT INTO tbl_opportunity_tracker
         (opportunity_id, opportunity_number, opportunity_name, opportunity_type_id, source_type_id,
          client_id, stage_id, sub_stage_id, owner_id, assigned_to, priority, service_line,
          solicitation_number, issuing_agency, procurement_contact, que_duedate, submission_method,
          contract_term, incumbent_vendor, pre_bidmeeting, document_type, file_name, file_path,
          uploaded_by, uploaded_dt, doc_submission_format, evaluation_basis, opportunity_description,
          lead_received_date, expected_start_date, expected_close_date, proposal_due_date, created_dt,
          created_by, updated_dt, updated_by, is_current, estimated_value, currency_id, estimated_value_usd)
       SELECT opportunity_id, opportunity_number, opportunity_name, opportunity_type_id, source_type_id,
          client_id, stage_id, sub_stage_id, owner_id, assigned_to, priority, service_line,
          solicitation_number, issuing_agency, procurement_contact, que_duedate, submission_method,
          contract_term, incumbent_vendor, pre_bidmeeting, document_type, file_name, file_path,
          uploaded_by, uploaded_dt, doc_submission_format, evaluation_basis, opportunity_description,
          lead_received_date, expected_start_date, expected_close_date, proposal_due_date, created_dt,
          created_by, updated_dt, updated_by, TRUE, estimated_value, currency_id, estimated_value_usd
       FROM tbl_opportunity WHERE opportunity_id = $1`,
      [opportunityId]
    );
    await client.query(
      `UPDATE tbl_opportunity_engage_tracker SET is_current = FALSE
       WHERE opportunity_id = $1 AND is_current = TRUE`,
      [opportunityId]
    );
    await client.query(
      `INSERT INTO tbl_opportunity_engage_tracker
         (opportunity_id, stage_id, substage_id, updated_by, updated_dt, is_current, comment,
          reason_code_id, role_id, role_name)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, TRUE, $5, $6, $7, $8)`,
      [opportunityId, stageId, subStageId, userId, comment, audit.reasonCodeId ?? null, audit.roleId ?? null, audit.roleName ?? null]
    );

    const rows = await client.query<Opportunity>(
      `SELECT ${SELECT_COLUMNS}, $2::TEXT AS "workflowComment"
       FROM tbl_opportunity WHERE opportunity_id = $1`,
      [opportunityId, comment]
    );
    return rows.rows[0] ?? null;
  });
}

async function create(
  input: OpportunityInput,
  userId: number
): Promise<Opportunity> {
  return transaction(async client => {
  const query = async <T = any>(sql: string, params?: any[]): Promise<T[]> => (await client.query(sql, params)).rows;
  const rows = await query<Opportunity>(
    `INSERT INTO tbl_opportunity
    (
      opportunity_number,
      opportunity_name,
      opportunity_type_id,
      source_type_id,
      client_id,
      stage_id,
      sub_stage_id,
      owner_id,
      assigned_to,
      priority,
      service_line,
      solicitation_number,
      issuing_agency,
      procurement_contact,
      que_duedate,
      submission_method,
      contract_term,
      incumbent_vendor,
      pre_bidmeeting,
      document_type,
      file_name,
      file_path,
      uploaded_by,
      uploaded_dt,
      doc_submission_format,
      evaluation_basis,
      opportunity_description,
      lead_received_date,
      expected_start_date,
      expected_close_date,
      proposal_due_date,
      created_by,
      is_active,
      estimated_value,
      currency_id,
      estimated_value_usd
    )
    VALUES
    (
      fn_next_opportunity_number(),
      $1,
      $2,
      $3,
      $4,
      $5,
      $6,
      $7,
      $8,
      $9,
      $10,
      $11,
      $12,
      $13,
      $14,
      $15,
      $16,
      $17,
      $18,
      $19,
      $20,
      $21,
      $22,
      $23,
      $24,
      $25,
      $26,
      $27,
      $28,
      $29,
      $30,
      $31,
      TRUE,
      $32,
      $33,
      $34
    )
    RETURNING ${SELECT_COLUMNS}`,
    [
      input.opportunityName?.trim() || null,
      input.rfpType ?? input.opportunityTypeId ?? null,
      input.sourceTypeId ?? null,
      input.clientId ?? null,
      input.stageId ?? null,
      input.subStageId ?? null,
      input.ownerId ?? null,
      input.assignedTo ?? null,
      input.priority?.trim() || null,
      input.serviceLine?.trim() || null,
      input.solicitationNumber?.trim() || null,
      input.issuingAgency?.trim() || null,
      input.procurementContact?.trim() || null,
      input.queDueDate ?? null,
      input.submissionMethod?.trim() || null,
      input.contractTerm?.trim() || null,
      input.incumbentVendor?.trim() || null,
      input.preBidMeeting ?? null,
      input.documentType?.trim() || null,
      input.fileName?.trim() || null,
      input.filePath?.trim() || null,
      input.uploadedBy ?? null,
      input.uploadedDt ?? null,
      input.docSubmissionFormat?.trim() || null,
      input.evaluationBasis?.trim() || null,
      input.opportunityDescription?.trim() || null,
      input.leadReceivedDate ?? null,
      input.expectedStartDate ?? null,
      input.expectedCloseDate ?? null,
      input.proposalDueDate ?? null,
      userId,
      input.estimatedValue ?? null,
      input.currencyId ?? null,
      input.estimatedValueUsd ?? null
    ]
  );

  const opportunity = rows[0];

  await query(
    `INSERT INTO tbl_opportunity_tracker
    (
      opportunity_id,
      opportunity_number,
      opportunity_name,
      opportunity_type_id,
      source_type_id,
      client_id,
      stage_id,
      sub_stage_id,
      owner_id,
      assigned_to,
      priority,
      service_line,
      solicitation_number,
      issuing_agency,
      procurement_contact,
      que_duedate,
      submission_method,
      contract_term,
      incumbent_vendor,
      pre_bidmeeting,
      document_type,
      file_name,
      file_path,
      uploaded_by,
      uploaded_dt,
      doc_submission_format,
      evaluation_basis,
      opportunity_description,
      lead_received_date,
      expected_start_date,
      expected_close_date,
      proposal_due_date,
      created_by,
      is_current,
      estimated_value,
      currency_id,
      estimated_value_usd
    )
    VALUES
    (
      $1,
      $2,
      $3,
      $4,
      $5,
      $6,
      $7,
      $8,
      $9,
      $10,
      $11,
      $12,
      $13,
      $14,
      $15,
      $16,
      $17,
      $18,
      $19,
      $20,
      $21,
      $22,
      $23,
      $24,
      $25,
      $26,
      $27,
      $28,
      $29,
      $30,
      $31,
      $32,
      $33,
      TRUE,
      $34,
      $35,
      $36
    )`,
    [
      opportunity.opportunityId,
      opportunity.opportunityNumber,
      opportunity.opportunityName,
      opportunity.opportunityTypeId,
      opportunity.sourceTypeId,
      opportunity.clientId,
      opportunity.stageId,
      opportunity.subStageId,
      opportunity.ownerId,
      opportunity.assignedTo,
      opportunity.priority,
      opportunity.serviceLine,
      opportunity.solicitationNumber,
      opportunity.issuingAgency,
      opportunity.procurementContact,
      opportunity.queDueDate,
      opportunity.submissionMethod,
      opportunity.contractTerm,
      opportunity.incumbentVendor,
      opportunity.preBidMeeting,
      opportunity.documentType,
      opportunity.fileName,
      opportunity.filePath,
      opportunity.uploadedBy,
      opportunity.uploadedDt,
      opportunity.docSubmissionFormat,
      opportunity.evaluationBasis,
      opportunity.opportunityDescription,
      opportunity.leadReceivedDate,
      opportunity.expectedStartDate,
      opportunity.expectedCloseDate,
      opportunity.proposalDueDate,
      userId,
      opportunity.estimatedValue,
      opportunity.currencyId,
      opportunity.estimatedValueUsd ?? null
    ]
  );

  await syncProposalQuestions(client, opportunity.opportunityId, input, userId);
  return (await query<Opportunity>(`SELECT ${OPPORTUNITY_LIST_COLUMNS} FROM tbl_opportunity o WHERE o.opportunity_id = $1`, [opportunity.opportunityId]))[0];
  });
}

async function update(
  opportunityId: number,
  input: OpportunityInput,
  userId: number | null,
  audit: WorkflowAudit = {}
): Promise<Opportunity> {
  return transaction(async client => {
  const query = async <T = any>(sql: string, params?: any[]): Promise<T[]> => (await client.query(sql, params)).rows;
  const locked = await query<UpdateWorkflow>(`SELECT stage_id AS "stageId", sub_stage_id AS "subStageId",
    created_by AS "createdBy", assigned_to AS "assignedTo" FROM tbl_opportunity
    WHERE opportunity_id = $1 AND is_active = TRUE FOR UPDATE`, [opportunityId]);
  const current = locked[0];
  if (!current || input.stageId !== undefined && current.stageId !== input.stageId ||
      input.subStageId !== undefined && current.subStageId !== input.subStageId) {
    throw new Error('This opportunity changed while you were editing it. Refresh before saving.');
  }
  const rows = await query<Opportunity>(
    `UPDATE tbl_opportunity
     SET
       opportunity_name = $1,
       opportunity_type_id = $2,
       source_type_id = $3,
       client_id = $4,
       stage_id = $5,
       sub_stage_id = $6,
       owner_id = $7,
       assigned_to = $8,
       priority = $9,
       service_line = $10,
       solicitation_number = $11,
       issuing_agency = $12,
       procurement_contact = $13,
       que_duedate = $14,
       submission_method = $15,
       contract_term = $16,
       incumbent_vendor = $17,
       pre_bidmeeting = $18,
       document_type = $19,
       file_name = $20,
       file_path = $21,
       uploaded_by = $22,
       uploaded_dt = $23,
       doc_submission_format = $24,
       evaluation_basis = $25,
       opportunity_description = $26,
       lead_received_date = $27,
       expected_start_date = $28,
       expected_close_date = $29,
       proposal_due_date = $30,
       updated_dt = CURRENT_TIMESTAMP,
       updated_by = $31,
       estimated_value = $32,
       currency_id = $33,
       estimated_value_usd = $35
     WHERE opportunity_id = $34
     RETURNING ${SELECT_COLUMNS}`,
    [
      input.opportunityName?.trim() || null,
      input.rfpType ?? input.opportunityTypeId ?? null,
      input.sourceTypeId ?? null,
      input.clientId ?? null,
      current.stageId,
      current.subStageId,
      input.ownerId ?? null,
      current.assignedTo,
      input.priority?.trim() || null,
      input.serviceLine?.trim() || null,
      input.solicitationNumber?.trim() || null,
      input.issuingAgency?.trim() || null,
      input.procurementContact?.trim() || null,
      input.queDueDate ?? null,
      input.submissionMethod?.trim() || null,
      input.contractTerm?.trim() || null,
      input.incumbentVendor?.trim() || null,
      input.preBidMeeting ?? null,
      input.documentType?.trim() || null,
      input.fileName?.trim() || null,
      input.filePath?.trim() || null,
      input.uploadedBy ?? null,
      input.uploadedDt ?? null,
      input.docSubmissionFormat?.trim() || null,
      input.evaluationBasis?.trim() || null,
      input.opportunityDescription?.trim() || null,
      input.leadReceivedDate ?? null,
      input.expectedStartDate ?? null,
      input.expectedCloseDate ?? null,
      input.proposalDueDate ?? null,
      userId,
      input.estimatedValue ?? null,
      input.currencyId ?? null,
      opportunityId,
      input.estimatedValueUsd ?? null
    ]
  );

  const opportunity = rows[0];

  Object.assign(opportunity, await returnUpdatedOpportunityForReview(client, opportunityId, current, userId, audit));

  /*
   * Mark previous tracker record as not current
   */
  await query(
    `UPDATE tbl_opportunity_tracker
     SET
       is_current = FALSE
     WHERE opportunity_id = $1
       AND is_current = TRUE`,
    [opportunityId]
  );

  /*
   * Insert updated opportunity snapshot
   */
  await query(
    `INSERT INTO tbl_opportunity_tracker
    (
      opportunity_id,
      opportunity_number,
      opportunity_name,
      opportunity_type_id,
      source_type_id,
      client_id,
      stage_id,
      sub_stage_id,
      owner_id,
      assigned_to,
      priority,
      service_line,
      solicitation_number,
      issuing_agency,
      procurement_contact,
      que_duedate,
      submission_method,
      contract_term,
      incumbent_vendor,
      pre_bidmeeting,
      document_type,
      file_name,
      file_path,
      uploaded_by,
      uploaded_dt,
      doc_submission_format,
      evaluation_basis,
      opportunity_description,
      lead_received_date,
      expected_start_date,
      expected_close_date,
      proposal_due_date,
      created_by,
      updated_dt,
      updated_by,
      is_current,
      estimated_value,
      currency_id,
      estimated_value_usd
    )
    VALUES
    (
      $1,
      $2,
      $3,
      $4,
      $5,
      $6,
      $7,
      $8,
      $9,
      $10,
      $11,
      $12,
      $13,
      $14,
      $15,
      $16,
      $17,
      $18,
      $19,
      $20,
      $21,
      $22,
      $23,
      $24,
      $25,
      $26,
      $27,
      $28,
      $29,
      $30,
      $31,
      $32,
      $33,
      CURRENT_TIMESTAMP,
      $34,
      TRUE,
      $35,
      $36,
      $37
    )`,
    [
      opportunity.opportunityId,
      opportunity.opportunityNumber,
      opportunity.opportunityName,
      opportunity.opportunityTypeId,
      opportunity.sourceTypeId,
      opportunity.clientId,
      opportunity.stageId,
      opportunity.subStageId,
      opportunity.ownerId,
      opportunity.assignedTo,
      opportunity.priority,
      opportunity.serviceLine,
      opportunity.solicitationNumber,
      opportunity.issuingAgency,
      opportunity.procurementContact,
      opportunity.queDueDate,
      opportunity.submissionMethod,
      opportunity.contractTerm,
      opportunity.incumbentVendor,
      opportunity.preBidMeeting,
      opportunity.documentType,
      opportunity.fileName,
      opportunity.filePath,
      opportunity.uploadedBy,
      opportunity.uploadedDt,
      opportunity.docSubmissionFormat,
      opportunity.evaluationBasis,
      opportunity.opportunityDescription,
      opportunity.leadReceivedDate,
      opportunity.expectedStartDate,
      opportunity.expectedCloseDate,
      opportunity.proposalDueDate,
      opportunity.createdBy,
      userId,
      opportunity.estimatedValue,
      opportunity.currencyId,
      opportunity.estimatedValueUsd ?? null
    ]
  );

  await syncProposalQuestions(client, opportunityId, input, userId);
  return (await query<Opportunity>(`SELECT ${OPPORTUNITY_LIST_COLUMNS} FROM tbl_opportunity o WHERE o.opportunity_id = $1`, [opportunityId]))[0];
  });
}

async function syncProposalQuestions(client: PoolClient, opportunityId: number, input: OpportunityInput, userId: number | null) {
  if (input.proposalQuestionSelections === undefined) return;
  await client.query('SELECT opportunity_id FROM tbl_opportunity WHERE opportunity_id = $1 FOR UPDATE', [opportunityId]);
  const selections = input.proposalQuestionSelections;
  const existing = await client.query<{ qaId: number; questionId: number | null; question: string; isActive: boolean }>(
    `SELECT qa_id AS "qaId", question_id AS "questionId", questiontext AS question, is_active AS "isActive"
     FROM tbl_opportunity_questions_answers WHERE opportunity_id = $1 ORDER BY qa_id`, [opportunityId]);
  const retained = new Set<string>();
  for (const row of existing.rows) {
    const match = selections.find(selection => selection.questionId !== null
      ? selection.questionId === row.questionId
      : row.questionId === null && selection.question.trim() === row.question);
    const key = match ? match.questionId === null ? `text:${match.question.trim()}` : `master:${match.questionId}` : null;
    if (row.isActive !== false && key && !retained.has(key)) { retained.add(key); continue; }
    await archiveAndRemoveProposalQuestion(client, row.qaId, userId);
  }
  for (const selection of selections) {
    await saveProposalQuestion(client, opportunityId, {
      ...selection,
      category: selection.category?.trim() || 'Other',
    }, userId!, input.rfpType ?? input.opportunityTypeId ?? GENERIC_RFP_TYPE_ID);
  }
}

export {
  findAll,
  findClients,
  findOwnedBy,
  findOwnedByUsers,
  findAssignedTo,
  findByWorkflowStage,
  findById,
  finalizeRfpIntakeOpportunity,
  updateRfpIntakeOpportunity,
  transitionWorkflow,
  create,
  update
};
