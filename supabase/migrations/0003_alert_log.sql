ALTER TABLE alert_log ADD COLUMN IF NOT EXISTS score    integer;
ALTER TABLE alert_log ADD COLUMN IF NOT EXISTS channels text[] NOT NULL DEFAULT '{}';
ALTER TABLE alert_log ADD COLUMN IF NOT EXISTS sent_at  timestamptz NOT NULL DEFAULT now();

-- Migrate any legacy singular values before dropping the column.
UPDATE alert_log SET channels = ARRAY[channel]
  WHERE channel IS NOT NULL AND channels = '{}';

ALTER TABLE alert_log DROP COLUMN IF EXISTS channel;

CREATE UNIQUE INDEX IF NOT EXISTS alert_log_supplier_score_idx
  ON alert_log (supplier_id, score_id);
