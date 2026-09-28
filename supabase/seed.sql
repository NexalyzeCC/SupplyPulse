-- Local dev fixtures. Requires a user created via `supabase auth` or the studio.
-- Replace the UUID with your local test user's id.
\set uid '00000000-0000-0000-0000-000000000001'

INSERT INTO suppliers (id, user_id, name, country, category, criticality, alert_threshold)
VALUES
  (gen_random_uuid(), :'uid', 'Acme Components Ltd', 'China',   'Electronics', 'critical', 50),
  (gen_random_uuid(), :'uid', 'Northwind Textiles',  'Vietnam', 'Textiles',    'high',     40),
  (gen_random_uuid(), :'uid', 'Baltic Logistics AS', 'Estonia', 'Logistics',   'medium',   35)
ON CONFLICT DO NOTHING;

INSERT INTO user_subscriptions (user_id, tier, status)
VALUES (:'uid', 'pro', 'active')
ON CONFLICT (user_id) DO UPDATE SET tier = 'pro', status = 'active';
