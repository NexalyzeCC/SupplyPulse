-- supplier_signals was created with only score_id — no supplier_id — even
-- though types.ts declares one. persistScore.js now writes it, so add the
-- column and backfill it from each signal's parent score.

ALTER TABLE supplier_signals
  ADD COLUMN IF NOT EXISTS supplier_id uuid REFERENCES suppliers(id) ON DELETE CASCADE;

UPDATE supplier_signals s
SET    supplier_id = sc.supplier_id
FROM   supplier_scores sc
WHERE  s.score_id = sc.id AND s.supplier_id IS NULL;

CREATE INDEX IF NOT EXISTS supplier_signals_supplier_idx
  ON supplier_signals (supplier_id, created_at DESC);
