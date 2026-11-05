-- opportunity_number used to be built with an explicit nextval('tbl_opportunity_opportunity_id_seq')
-- call inside the same INSERT that relies on opportunity_id's own SERIAL default on that identical
-- sequence -- so every successful row consumed two sequence values (one for opportunity_id, one for
-- opportunity_number) and opportunity_id permanently skipped a number on every single insert.
--
-- opportunity_number now comes from its own per-fiscal-year counter, independent of opportunity_id,
-- formatted OT-<FY start>-<FY end>-NNNN (e.g. OT-26-27-0001 for the year starting 1 Apr 2026,
-- OT-27-28-0001 from 1 Apr 2027). This also makes opportunity_id a plain gapless SERIAL again.
--
-- Existing rows keep their old "OPP-YYYY-NNNNNN" numbers unchanged; only new rows use this format.

CREATE TABLE IF NOT EXISTS tbl_opportunity_number_counter (
  fiscal_year VARCHAR(5) PRIMARY KEY,
  last_number INTEGER NOT NULL DEFAULT 0
);

CREATE OR REPLACE FUNCTION fn_next_opportunity_number() RETURNS TEXT AS $$
DECLARE
  fy_start INTEGER;
  fy_label TEXT;
  seq_no INTEGER;
BEGIN
  fy_start := CASE WHEN EXTRACT(MONTH FROM CURRENT_DATE) >= 4
    THEN EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER
    ELSE EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER - 1 END;
  fy_label := LPAD((fy_start % 100)::TEXT, 2, '0') || '-' || LPAD(((fy_start + 1) % 100)::TEXT, 2, '0');

  INSERT INTO tbl_opportunity_number_counter(fiscal_year, last_number)
  VALUES (fy_label, 1)
  ON CONFLICT (fiscal_year) DO UPDATE SET last_number = tbl_opportunity_number_counter.last_number + 1
  RETURNING last_number INTO seq_no;

  RETURN 'OT-' || fy_label || '-' || LPAD(seq_no::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;
