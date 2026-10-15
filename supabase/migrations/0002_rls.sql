-- -- Scores and signals have no user_id of their own; scope them through suppliers.
-- ALTER TABLE suppliers         ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE supplier_scores   ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE supplier_signals  ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE alert_log         ENABLE ROW LEVEL SECURITY;

-- DROP POLICY IF EXISTS user_owns_suppliers ON suppliers;
-- CREATE POLICY user_owns_suppliers ON suppliers
--   FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- DROP POLICY IF EXISTS user_reads_own_scores ON supplier_scores;
-- CREATE POLICY user_reads_own_scores ON supplier_scores
--   FOR SELECT USING (EXISTS (
--     SELECT 1 FROM suppliers s
--     WHERE s.id = supplier_scores.supplier_id AND s.user_id = auth.uid()
--   ));

-- DROP POLICY IF EXISTS user_reads_own_signals ON supplier_signals;
-- CREATE POLICY user_reads_own_signals ON supplier_signals
--   FOR SELECT USING (EXISTS (
--     SELECT 1 FROM supplier_scores sc
--     JOIN suppliers s ON s.id = sc.supplier_id
--     WHERE sc.id = supplier_signals.score_id AND s.user_id = auth.uid()
--   ));

-- DROP POLICY IF EXISTS user_reads_own_alerts ON alert_log;
-- CREATE POLICY user_reads_own_alerts ON alert_log
--   FOR SELECT USING (EXISTS (
--     SELECT 1 FROM suppliers s
--     WHERE s.id = alert_log.supplier_id AND s.user_id = auth.uid()
--   ));

-- 0002_rls.sql — intentionally a no-op.
--
-- This migration was written to add RLS in case the baseline lacked it. It
-- does not: 0001_baseline already enables RLS on all seven tables and defines
-- equivalent policies (users_own_suppliers, users_own_scores,
-- users_own_signals, users_own_alerts, "Users manage own profile",
-- user_reads_own_subscription).
--
-- suppliers.user_id is TEXT — a leftover from the Netlify Identity era — so
-- those policies compare against auth.uid()::text. Re-creating them with a
-- bare auth.uid() fails: "operator does not exist: text = uuid".
--
-- Kept as a numbered placeholder so 0003-0006 keep their sequence.

SELECT 1;

