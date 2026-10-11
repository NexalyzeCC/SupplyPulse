CREATE TABLE IF NOT EXISTS scan_jobs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id   uuid NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL,
  status        text NOT NULL DEFAULT 'queued'
                CHECK (status IN ('queued','running','done','failed')),
  attempts      int  NOT NULL DEFAULT 0,
  force_refresh boolean NOT NULL DEFAULT false,
  scheduled_for timestamptz NOT NULL DEFAULT now(),
  started_at    timestamptz,
  finished_at   timestamptz,
  score_id      uuid,
  error         text,
  cost_usd      numeric(10,5),
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS scan_jobs_claim_idx    ON scan_jobs (status, scheduled_for);
CREATE INDEX IF NOT EXISTS scan_jobs_supplier_idx ON scan_jobs (supplier_id, created_at DESC);

-- Only one live job per supplier — a double-click must not double-bill the APIs.
CREATE UNIQUE INDEX IF NOT EXISTS scan_jobs_one_active_idx
  ON scan_jobs (supplier_id) WHERE status IN ('queued','running');

ALTER TABLE scan_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_reads_own_jobs ON scan_jobs
  FOR SELECT USING (user_id = auth.uid());

-- Atomic claim. supabase-js can't express FOR UPDATE SKIP LOCKED, so it lives
-- here; concurrent workers will never pick up the same job.
CREATE OR REPLACE FUNCTION public.claim_scan_job()
RETURNS SETOF scan_jobs
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  UPDATE scan_jobs
  SET    status = 'running', started_at = now(), attempts = attempts + 1
  WHERE  id = (
    SELECT id FROM scan_jobs
    WHERE  status = 'queued' AND scheduled_for <= now()
    ORDER  BY scheduled_for
    FOR UPDATE SKIP LOCKED
    LIMIT  1
  )
  RETURNING *;
END;
$$;
