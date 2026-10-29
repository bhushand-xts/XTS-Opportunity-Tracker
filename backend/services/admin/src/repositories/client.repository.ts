import { recordPreviousVersion } from '../../../../shared/trackerHistory';
import type { PoolClient } from 'pg';

import { query, transaction } from '../config/db';

// ALL SQL for clients (mst_client) and their contact people
// (tbl_client_contact_person). Updates and deletes archive the previous row
// in the same transaction. Creation writes only to the main tables.

export interface Client {
  id: number;
  clientName: string;
  accountType: string | null;
  sector: string | null;
  website: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  streetAddress: string | null;
  isActive: boolean;
  createdDt: string;
  createdBy: number | null;
  updatedDt: string | null;
  updatedBy: number | null;
}

export interface ClientHistory {
  trackerId: number;
  clientId: number;
  clientName: string;
  accountType: string | null;
  sector: string | null;
  website: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  streetAddress: string | null;
  isActive: boolean;
  createdDt: string;
  createdBy: number | null;
  updatedDt: string | null;
  updatedBy: number | null;
}

export interface ClientContact {
  id: number;
  clientId: number;
  fullName: string;
  titleRole: string | null;
  email: string | null;
  phone: string | null;
  roleInDecision: number | null;
  roleInDecisionOther: string | null;
  contactSequence: number | null;
  isActive: boolean;
  createdDt: string;
  createdBy: number | null;
  updatedDt: string | null;
  updatedBy: number | null;
}

export interface ClientContactInput {
  fullName: string;
  titleRole?: string | null;
  email?: string | null;
  phone?: string | null;
  roleInDecision?: number | null;
  roleInDecisionOther?: string | null;
}

export interface ClientInput {
  clientName: string;
  accountType?: string | null;
  sector?: string | null;
  website?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  streetAddress?: string | null;
  isActive?: boolean;
  contacts?: ClientContactInput[];
  createdBy?: number | null;
  updatedBy?: number | null;
}

const SELECT_COLUMNS = `
  client_id AS id,
  client_name AS "clientName",
  account_type AS "accountType",
  sector,
  website,
  city,
  state,
  country,
  street_address AS "streetAddress",
  is_active AS "isActive",
  created_dt AS "createdDt",
  created_by AS "createdBy",
  updated_dt AS "updatedDt",
  updated_by AS "updatedBy"
`;

const CONTACT_COLUMNS = `
  client_contact_id AS id,
  client_id AS "clientId",
  full_name AS "fullName",
  title_role AS "titleRole",
  email,
  phone,
  role_in_decision AS "roleInDecision",
  role_in_decision_other AS "roleInDecisionOther",
  contact_sequence AS "contactSequence",
  is_active AS "isActive",
  created_dt AS "createdDt",
  created_by AS "createdBy",
  updated_dt AS "updatedDt",
  updated_by AS "updatedBy"
`;

async function findAll(): Promise<Client[]> {
  return query<Client>(`SELECT ${SELECT_COLUMNS} FROM mst_client ORDER BY client_name`);
}

async function findById(id: number): Promise<Client | null> {
  const rows = await query<Client>(`SELECT ${SELECT_COLUMNS} FROM mst_client WHERE client_id = $1`, [id]);
  return rows[0] || null;
}

async function findByName(clientName: string, excludeId?: number): Promise<Client | null> {
  const rows = excludeId
    ? await query<Client>(
        `SELECT ${SELECT_COLUMNS} FROM mst_client WHERE LOWER(client_name) = LOWER($1) AND client_id <> $2`,
        [clientName, excludeId]
      )
    : await query<Client>(`SELECT ${SELECT_COLUMNS} FROM mst_client WHERE LOWER(client_name) = LOWER($1)`, [
        clientName,
      ]);
  return rows[0] || null;
}

async function findContactsByClient(clientId: number): Promise<ClientContact[]> {
  return query<ClientContact>(
    `SELECT ${CONTACT_COLUMNS} FROM tbl_client_contact_person
     WHERE client_id = $1 AND is_active = TRUE
     ORDER BY contact_sequence NULLS LAST, client_contact_id`,
    [clientId]
  );
}

async function recordTracker(client: PoolClient, id: number): Promise<void> {
  await recordPreviousVersion(client, 'mst_client', id);
}

async function recordContactTracker(client: PoolClient, contactId: number): Promise<void> {
  await recordPreviousVersion(client, 'tbl_client_contact_person', contactId);
}

// Newest change first.
async function findHistory(clientId: number): Promise<ClientHistory[]> {
  return query<ClientHistory>(
    `SELECT
       tracker_id AS "trackerId",
       client_id AS "clientId",
       client_name AS "clientName",
       account_type AS "accountType",
       sector,
       website,
       city,
       state,
       country,
       street_address AS "streetAddress",
       is_active AS "isActive",
       created_dt AS "createdDt",
       created_by AS "createdBy",
       updated_dt AS "updatedDt",
       updated_by AS "updatedBy"
     FROM mst_client_tracker
     WHERE client_id = $1
     ORDER BY tracker_id DESC`,
    [clientId]
  );
}

// Soft-deletes every currently-active contact for this client, then inserts
// the submitted list fresh (sequence = its position in the array). Simpler
// and more robust than id-matching individual contacts for edit-in-place,
// Previous contacts are archived before being retired; replacements are new
// current rows and do not receive tracker entries on creation.
async function replaceContacts(
  client: PoolClient,
  clientId: number,
  contacts: ClientContactInput[],
  userId: number | null
): Promise<void> {
  const existing = await client.query<{ client_contact_id: number }>(
    `SELECT client_contact_id FROM tbl_client_contact_person WHERE client_id = $1 AND is_active = TRUE`,
    [clientId]
  );
  for (const row of existing.rows) {
    await recordContactTracker(client, row.client_contact_id);
    await client.query(
      `UPDATE tbl_client_contact_person SET is_active = FALSE, updated_dt = CURRENT_TIMESTAMP, updated_by = $2
       WHERE client_contact_id = $1`,
      [row.client_contact_id, userId]
    );
  }

  let sequence = 1;
  for (const contact of contacts) {
    await client.query<{ client_contact_id: number }>(
      `INSERT INTO tbl_client_contact_person
         (client_id, full_name, title_role, email, phone, role_in_decision, role_in_decision_other,
          contact_sequence, created_by, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE)
       RETURNING client_contact_id`,
      [
        clientId,
        contact.fullName.trim(),
        contact.titleRole?.trim() || null,
        contact.email?.trim() || null,
        contact.phone?.trim() || null,
        contact.roleInDecision ?? null,
        contact.roleInDecisionOther?.trim() || null,
        sequence++,
        userId,
      ]
    );
  }
}

async function create(input: ClientInput, userId: number | null): Promise<Client> {
  return transaction(async (client) => {
    const result = await client.query<Client>(
      `INSERT INTO mst_client (client_name, account_type, sector, website, city, state, country, street_address, is_active, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, COALESCE($9, TRUE), $10)
       RETURNING ${SELECT_COLUMNS}`,
      [
        input.clientName.trim(),
        input.accountType?.trim() || null,
        input.sector?.trim() || null,
        input.website?.trim() || null,
        input.city?.trim() || null,
        input.state?.trim() || null,
        input.country?.trim() || null,
        input.streetAddress?.trim() || null,
        input.isActive ?? null,
        userId,
      ]
    );
    const clientId = result.rows[0].id;
    if (input.contacts?.length) {
      await replaceContacts(client, clientId, input.contacts, userId);
    }
    return result.rows[0];
  });
}

async function update(id: number, input: Partial<ClientInput>, userId: number | null): Promise<Client> {
  return transaction(async (client) => {
    await recordTracker(client, id);
    const result = await client.query<Client>(
      `UPDATE mst_client SET
         client_name = COALESCE($1, client_name),
         account_type = CASE WHEN $2::boolean THEN $3 ELSE account_type END,
         sector = CASE WHEN $4::boolean THEN $5 ELSE sector END,
         website = CASE WHEN $6::boolean THEN $7 ELSE website END,
         city = CASE WHEN $8::boolean THEN $9 ELSE city END,
         state = CASE WHEN $10::boolean THEN $11 ELSE state END,
         country = CASE WHEN $12::boolean THEN $13 ELSE country END,
         street_address = CASE WHEN $14::boolean THEN $15 ELSE street_address END,
         is_active = COALESCE($16, is_active),
         updated_dt = CURRENT_TIMESTAMP,
         updated_by = $17
       WHERE client_id = $18
       RETURNING ${SELECT_COLUMNS}`,
      [
        input.clientName?.trim() ?? null,
        'accountType' in input,
        input.accountType?.trim() || null,
        'sector' in input,
        input.sector?.trim() || null,
        'website' in input,
        input.website?.trim() || null,
        'city' in input,
        input.city?.trim() || null,
        'state' in input,
        input.state?.trim() || null,
        'country' in input,
        input.country?.trim() || null,
        'streetAddress' in input,
        input.streetAddress?.trim() || null,
        input.isActive ?? null,
        userId,
        id,
      ]
    );
    if (input.contacts !== undefined) {
      await replaceContacts(client, id, input.contacts, userId);
    }
    return result.rows[0];
  });
}

// The client row (and its contacts) are deleted, but their history is kept:
// a final snapshot is written for each first — mirroring
// reason-codes.repository.ts's remove().
async function remove(id: number, userId: number | null): Promise<void> {
  await transaction(async (client) => {
    // Use the same parent-before-contacts lock order as update().
    await recordTracker(client, id);
    const contacts = await client.query<{ client_contact_id: number }>(
      `SELECT client_contact_id FROM tbl_client_contact_person WHERE client_id = $1`,
      [id]
    );
    for (const row of contacts.rows) {
      await recordContactTracker(client, row.client_contact_id);
    }
    await client.query('DELETE FROM tbl_client_contact_person WHERE client_id = $1', [id]);
    await client.query('DELETE FROM mst_client WHERE client_id = $1', [id]);
  });
}

export {
  findAll,
  findById,
  findByName,
  findContactsByClient,
  findHistory,
  create,
  update,
  remove,
};
