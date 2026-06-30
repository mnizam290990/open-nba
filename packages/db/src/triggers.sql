-- Append-only enforcement for audit_log table.
-- This trigger fires BEFORE any UPDATE or DELETE on audit_log and raises an
-- exception, making the table effectively immutable after insert.

CREATE OR REPLACE FUNCTION audit_log_prevent_mutation()
  RETURNS trigger LANGUAGE plpgsql AS
$$
BEGIN
  RAISE EXCEPTION
    'audit_log is append-only — UPDATE and DELETE are not permitted (event_id: %)',
    OLD.event_id;
END;
$$;

DROP TRIGGER IF EXISTS audit_log_no_update ON audit_log;
CREATE TRIGGER audit_log_no_update
  BEFORE UPDATE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION audit_log_prevent_mutation();

DROP TRIGGER IF EXISTS audit_log_no_delete ON audit_log;
CREATE TRIGGER audit_log_no_delete
  BEFORE DELETE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION audit_log_prevent_mutation();
