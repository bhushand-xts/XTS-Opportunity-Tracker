-- Keep client records and their audit history able to store full addresses.
ALTER TABLE mst_client
  ALTER COLUMN street_address TYPE VARCHAR(500);

ALTER TABLE mst_client_tracker
  ALTER COLUMN street_address TYPE VARCHAR(500);
