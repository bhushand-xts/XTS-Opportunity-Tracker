import 'dotenv/config';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pool } from '../config/db';
import { recordPreviousVersion } from '../../../../shared/trackerHistory';

// Uses only synthetic rows in temporary tables. No public rows or sequences
// are changed. Run with TRACKER_DB_INTEGRATION=1 against the development DB.
const entities = [
  ['mst_stage', 'mst_stage_tracker', 'stage_id', 'stage_name'],
  ['mst_sub_stage', 'mst_sub_stage_tracker', 'sub_stage_id', 'sub_stage_name'],
  ['mst_estimation_phases', 'tbl_estimation_phases_tracker', 'phase_id', 'phase_name'],
  ['mst_rate', 'mst_rate_tracker', 'ratemaster_id', 'role_name'],
  ['tbl_reason_codes', 'tbl_reason_codes_tracker', 'reason_code_id', 'reason_name'],
  ['mst_client', 'mst_client_tracker', 'client_id', 'client_name'],
  ['tbl_client_contact_person', 'tbl_client_contact_person_tracker', 'client_contact_id', 'full_name'],
  ['mst_rfp_questions', 'mst_rfp_questions_tracker', 'question_id', 'question'],
  ['mst_permissions', 'mst_permissions_tracker', 'permission_id', 'permission_name'],
  ['mst_roles', 'mst_roles_tracker', 'role_id', 'role_name'],
  ['tbl_opportunity', 'tbl_opportunity_tracker', 'opportunity_id', 'opportunity_name'],
  ['tbl_opportunity_questions_answers', 'tbl_opportunity_questions_answers_tracker', 'qa_id', 'questiontext'],
] as const;

test('all 12 snapshot queries preserve previous values and audit fields through update and delete', {
  skip: process.env.TRACKER_DB_INTEGRATION !== '1',
}, async t => {
  const connection = await pool.connect();
  try {
    await connection.query('BEGIN');
    await connection.query("SET LOCAL statement_timeout = '10s'");
    const phaseLinks = await connection.query(`SELECT conname FROM pg_constraint WHERE contype = 'f'
      AND conrelid = to_regclass('public.tbl_estimation_phases_tracker') AND confrelid = to_regclass('public.mst_estimation_phases')`);
    t.diagnostic(`Public phase-history foreign keys requiring migration: ${phaseLinks.rows.length}`);
    let sequence = 0;
    for (const [table, tracker, id, field] of entities) {
      for (const name of [table, tracker]) {
        await connection.query(`CREATE TEMP TABLE ${name} (LIKE public.${name} INCLUDING DEFAULTS INCLUDING CONSTRAINTS) ON COMMIT DROP`);
        const serials = await connection.query("SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1 AND column_default LIKE 'nextval(%'", [name]);
        for (const { column_name: column } of serials.rows) {
          assert.match(column, /^[a-z_]+$/);
          const serial = `history_test_sequence_${sequence++}`;
          await connection.query(`CREATE TEMP SEQUENCE ${serial}`);
          await connection.query(`ALTER TABLE pg_temp.${name} ALTER COLUMN ${column} SET DEFAULT nextval('pg_temp.${serial}')`);
        }
      }
      if (table === 'mst_estimation_phases') {
        // Validate the deployment migration against a temporary FK, without
        // changing the public schema or committing the test transaction.
        await connection.query('ALTER TABLE pg_temp.mst_estimation_phases ADD PRIMARY KEY (phase_id)');
        await connection.query(`ALTER TABLE pg_temp.tbl_estimation_phases_tracker ADD CONSTRAINT history_test_fk
          FOREIGN KEY (phase_id) REFERENCES pg_temp.mst_estimation_phases (phase_id)`);
        const migration = readFileSync(resolve('../../database/migrations/20261028_phase_history_survives_deletion.sql'), 'utf8')
          .replace(/^BEGIN;\r?$/m, '').replace(/^COMMIT;\r?$/m, '');
        await connection.query(migration);
      }
      const metadata = await connection.query(`SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1 ORDER BY ordinal_position`, [table]);
      const row: Record<string, unknown> = { [id]: 10, [field]: 'Before' };
      for (const column of metadata.rows) {
        const name = column.column_name;
        if (name in row) continue;
        if (name === 'created_dt' || name === 'updated_dt') row[name] = '2026-10-01 10:00:00';
        else if (name === 'created_by' || name === 'updated_by') row[name] = 7;
        else if (name === 'is_active') row[name] = true;
        else if (column.is_nullable === 'NO' && column.column_default === null) {
          row[name] = column.data_type === 'boolean' ? true : /timestamp|date/.test(column.data_type) ? '2026-10-01' : '1';
        }
      }
      if (metadata.rows.some(column => column.column_name === 'rate_type')) row.rate_type = 'Hourly';
      const columns = Object.keys(row);
      await connection.query(`INSERT INTO pg_temp.${table} (${columns.join(', ')}) VALUES (${columns.map((_, i) => `$${i + 1}`).join(', ')})`, Object.values(row));
      assert.equal((await connection.query(`SELECT * FROM pg_temp.${tracker}`)).rows.length, 0);
      const before = (await connection.query(`SELECT * FROM pg_temp.${table}`)).rows[0];
      await recordPreviousVersion(connection, table, 10);
      await connection.query(`UPDATE pg_temp.${table} SET ${field} = 'After', updated_by = 8, updated_dt = '2026-10-02 11:00:00' WHERE ${id} = 10`);
      const after = (await connection.query(`SELECT * FROM pg_temp.${table}`)).rows[0];
      await recordPreviousVersion(connection, table, 10);
      await connection.query(`DELETE FROM pg_temp.${table} WHERE ${id} = 10`);
      const history = (await connection.query(`SELECT * FROM pg_temp.${tracker} ORDER BY updated_dt`)).rows;
      assert.equal(history.length, 2, table);
      for (const [index, previous] of [before, after].entries()) {
        for (const column of Object.keys(history[index])) {
          if (column in previous) assert.deepEqual(history[index][column], previous[column], `${table}.${column}`);
        }
        if ('is_current' in history[index]) {
          const legacyStatus = ['mst_stage', 'mst_sub_stage', 'mst_estimation_phases'].includes(table);
          assert.equal(history[index].is_current, legacyStatus ? previous.is_active : false, table);
        }
      }
      assert.equal((await connection.query(`SELECT * FROM pg_temp.${table}`)).rows.length, 0);
    }
  } finally {
    await connection.query('ROLLBACK');
    connection.release();
    await pool.end();
  }
});
