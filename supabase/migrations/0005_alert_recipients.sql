CREATE TABLE IF NOT EXISTS alert_recipients (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  supplier_id uuid REFERENCES suppliers(id) ON DELETE CASCADE,  -- NULL = all suppliers
  channel     text NOT NULL CHECK (channel IN ('email','slack')),
  destination text NOT NULL,
  enabled     boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS alert_recipients_user_idx ON alert_recipients (user_id, enabled);
CREATE UNIQUE INDEX IF NOT EXISTS alert_recipients_unique_idx
  ON alert_recipients (user_id, coalesce(supplier_id, '00000000-0000-0000-0000-000000000000'::uuid), channel, destination);

ALTER TABLE alert_recipients ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_owns_recipients ON alert_recipients
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Backfill: every existing user gets their account email as an org-wide recipient.
INSERT INTO alert_recipients (user_id, supplier_id, channel, destination)
SELECT u.id, NULL, 'email', u.email
FROM auth.users u
WHERE u.email IS NOT NULL
ON CONFLICT DO NOTHING;

-- New signups get one automatically. A user who never opens settings must
-- still receive their alerts.
CREATE OR REPLACE FUNCTION public.create_default_alert_recipient()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.email IS NOT NULL THEN
    INSERT INTO public.alert_recipients (user_id, supplier_id, channel, destination)
    VALUES (NEW.id, NULL, 'email', NEW.email)
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_alert_recipient ON auth.users;
CREATE TRIGGER on_auth_user_created_alert_recipient
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.create_default_alert_recipient();
