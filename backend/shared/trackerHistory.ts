import type { PoolClient } from 'pg';

// Trackers contain previous versions only. The current version lives in the
// main table; creating a row must never call recordPreviousVersion.
// The stage, sub-stage and phase trackers expose the saved active status as
// is_current for compatibility with their history APIs. For opportunity,
// contact and question history, is_current marks a version and is always FALSE.
const trackers = {
  mst_stage: {
    tracker: 'mst_stage_tracker', id: 'stage_id',
    columns: 'stage_id, stage_name, description, gate, win_percentage, display_order, created_dt, created_by, updated_dt, updated_by, is_current',
    values: 'stage_id, stage_name, description, gate, win_percentage, display_order, COALESCE(created_dt, CURRENT_TIMESTAMP), created_by, updated_dt, updated_by, COALESCE(is_active, TRUE)',
  },
  mst_sub_stage: {
    tracker: 'mst_sub_stage_tracker', id: 'sub_stage_id',
    columns: 'sub_stage_id, stage_id, sub_stage_name, created_dt, created_by, updated_dt, updated_by, is_current',
    values: 'sub_stage_id, stage_id, sub_stage_name, COALESCE(created_dt, CURRENT_TIMESTAMP), created_by, updated_dt, updated_by, COALESCE(is_active, TRUE)',
  },
  mst_estimation_phases: {
    tracker: 'tbl_estimation_phases_tracker', id: 'phase_id',
    columns: 'phase_id, phase_name, phase_code, description, display_order, created_dt, created_by, updated_dt, updated_by, is_current',
    values: 'phase_id, phase_name, phase_code, description, display_order, COALESCE(created_dt, CURRENT_TIMESTAMP), created_by, updated_dt, updated_by, COALESCE(is_active, TRUE)',
  },
  mst_rate: {
    tracker: 'mst_rate_tracker', id: 'ratemaster_id',
    columns: 'ratemaster_id, role_name, role_code, currency_id, rate_type, default_rate, location, description, created_dt, created_by, updated_dt, updated_by, is_active',
  },
  tbl_reason_codes: {
    tracker: 'tbl_reason_codes_tracker', id: 'reason_code_id',
    columns: 'reason_code_id, reason_name, description, display_order, created_dt, created_by, updated_dt, updated_by, is_active',
    values: 'reason_code_id, reason_name, description, display_order, COALESCE(created_dt, CURRENT_TIMESTAMP), created_by, updated_dt, updated_by, COALESCE(is_active, TRUE)',
  },
  mst_client: {
    tracker: 'mst_client_tracker', id: 'client_id',
    columns: 'client_id, client_name, account_type, sector, website, city, state, country, street_address, created_dt, created_by, updated_dt, updated_by, is_active',
    values: 'client_id, client_name, account_type, sector, website, city, state, country, street_address, COALESCE(created_dt, CURRENT_TIMESTAMP), created_by, updated_dt, updated_by, COALESCE(is_active, TRUE)',
  },
  tbl_client_contact_person: {
    tracker: 'tbl_client_contact_person_tracker', id: 'client_contact_id',
    columns: 'client_contact_id, client_id, full_name, title_role, email, phone, role_in_decision, role_in_decision_other, contact_sequence, created_dt, created_by, updated_dt, updated_by, is_current',
    values: 'client_contact_id, client_id, full_name, title_role, email, phone, role_in_decision, role_in_decision_other, contact_sequence, COALESCE(created_dt, CURRENT_TIMESTAMP), created_by, updated_dt, updated_by, FALSE',
  },
  mst_rfp_questions: {
    tracker: 'mst_rfp_questions_tracker', id: 'question_id',
    columns: 'question_id, question, description, display_order, created_dt, created_by, updated_dt, updated_by, is_active',
    values: 'question_id, question, description, display_order, COALESCE(created_dt, CURRENT_TIMESTAMP), created_by, updated_dt, updated_by, COALESCE(is_active, TRUE)',
  },
  mst_permissions: {
    tracker: 'mst_permissions_tracker', id: 'permission_id',
    columns: 'permission_id, permission_name, permission_key, description, created_dt, created_by, updated_dt, updated_by, is_active',
  },
  mst_roles: {
    tracker: 'mst_roles_tracker', id: 'role_id',
    columns: 'role_id, role_name, role_code, description, created_dt, created_by, updated_dt, updated_by, is_active',
    values: 'role_id, role_name, role_code, description, COALESCE(created_dt, CURRENT_TIMESTAMP), created_by, updated_dt, updated_by, COALESCE(is_active, TRUE)',
  },
  tbl_opportunity: {
    tracker: 'tbl_opportunity_tracker', id: 'opportunity_id',
    columns: 'opportunity_id, opportunity_number, opportunity_name, opportunity_type_id, source_type_id, client_id, stage_id, sub_stage_id, owner_id, assigned_to, priority, service_line, solicitation_number, issuing_agency, procurement_contact, que_duedate, submission_method, contract_term, incumbent_vendor, pre_bidmeeting, document_type, file_name, file_path, uploaded_by, uploaded_dt, doc_submission_format, evaluation_basis, opportunity_description, lead_received_date, expected_start_date, expected_close_date, proposal_due_date, created_dt, created_by, updated_dt, updated_by, is_current, estimated_value, currency_id, estimated_value_usd',
    values: 'opportunity_id, opportunity_number, opportunity_name, opportunity_type_id, source_type_id, client_id, stage_id, sub_stage_id, owner_id, assigned_to, priority, service_line, solicitation_number, issuing_agency, procurement_contact, que_duedate, submission_method, contract_term, incumbent_vendor, pre_bidmeeting, document_type, file_name, file_path, uploaded_by, uploaded_dt, doc_submission_format, evaluation_basis, opportunity_description, lead_received_date, expected_start_date, expected_close_date, proposal_due_date, created_dt, created_by, updated_dt, updated_by, FALSE, estimated_value, currency_id, estimated_value_usd',
  },
  tbl_opportunity_questions_answers: {
    tracker: 'tbl_opportunity_questions_answers_tracker', id: 'qa_id',
    columns: 'qa_id, opportunity_id, opportunity_type_id, question_id, questiontext, question_category, questionnaire_type_id, answertext, answered_by, answered_dt, created_dt, created_by, updated_dt, updated_by, is_current',
    values: 'qa_id, opportunity_id, opportunity_type_id, question_id, questiontext, question_category, questionnaire_type_id, answertext, answered_by, answered_dt, created_dt, created_by, updated_dt, updated_by, FALSE',
  },
} satisfies Record<string, { tracker: string; id: string; columns: string; values?: string }>;

export async function recordPreviousVersion(client: PoolClient, table: keyof typeof trackers, id: number): Promise<void> {
  const config = trackers[table];
  // Names come from the fixed configuration above. Lock the source row so
  // concurrent writers archive successive versions rather than the same row.
  await client.query(`INSERT INTO ${config.tracker} (${config.columns})
    SELECT ${'values' in config ? config.values : config.columns}
    FROM ${table} WHERE ${config.id} = $1 FOR UPDATE`, [id]);
}
