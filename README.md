# SupplyPulse

**Supplier risk intelligence** — AI-assisted scanning of news, filings, and financial signals that produces a **0–100 supplier health score**, trajectory charts, thresholds, and **email plus Slack** alerts. The product is a **Next.js** web app deployed on **Netlify** with **Supabase** (auth + data) and **Stripe** billing.

Demo / production deployments use the Netlify URL you configure per environment (see [Environment variables](#environment-variables)).

---

## Repository layout

| Path | Purpose |
|------|---------|
| [`supplypulse-frontend/`](supplypulse-frontend/) | Next.js 16 (App Router), React 19, Tailwind CSS |
| [`supplypulse-frontend/netlify/functions/`](supplypulse-frontend/netlify/functions/) | Serverless APIs: scoring agent, suppliers, Stripe, alerts, cron |
| [`netlify.toml`](netlify.toml) | Netlify build, plugin, `/api/*` → functions, scheduled scan |

The Netlify site is built with **`build.base = supplypulse-frontend`**; functions live under that directory per `netlify.toml`.

---

## Prerequisites

- **Node.js** 20+ recommended (aligned with [`package.json`](supplypulse-frontend/package.json) engines expectations)
- **npm** (or compatible client)
- **Supabase** project (URL + anon key for the app; service role key for functions)
- **Netlify CLI** (`npm i -g netlify-cli`) if you want serverless functions and redirects locally

Optional depending on features you enable:

- **OpenAI** API key — scoring pipeline
- **Tavily** and/or **Serper** — web search tooling for the agent
- **Stripe** — checkout, webhooks, plan mapping
- **Resend** — outbound alert emails

---

## Getting started

### 1. Install dependencies

From the repository root:

```bash
cd supplypulse-frontend
npm install
```

### 2. Environment variables

Create **`supplypulse-frontend/.env.local`** (never commit real secrets).

**Required for the Next.js app**

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL (host only; no `/rest/v1` suffix). Alias: `NEXT_APP_SUPABASE_URL` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon (public) key. Alias: `NEXT_APP_SUPABASE_ANON_KEY` |
| `NEXT_PUBLIC_SITE_URL` | Public site origin with protocol (e.g. `https://your-site.netlify.app`). Used for auth email redirects |
| `NEXT_PUBLIC_API_URL` | Optional. If unset, browser calls **`/.netlify/functions/*`** on the same origin. Set this when the API lives on another host/path (must expose `/api/*` as routed in production) |

**Required for Netlify Functions** (local: `.env` in repo root **or** `netlify dev`/`netlify env`; production: Netlify UI)

| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | Same project URL as above |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (server only) |
| `SUPABASE_ANON_KEY` | Used by `auth-login` / `auth-signup` helpers |
| `APP_URL` | Site origin for CORS/checkout return URLs (`https://...`) |
| `URL` | Netlify provides this automatically; used by scheduled scans to call functions |
| `SCHEDULED_SECRET` | Shared secret header for invoking `score-supplier` from `scheduled-scan` |

**Billing (Stripe)**

| Variable | Description |
|----------|-------------|
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Signing secret for webhook function |
| `STRIPE_PRICE_PRO` / `STRIPE_PRICE_ENTERPRISE` | Price IDs mapped to tiers in `stripe-tiers.js` |

**AI and search**

| Variable | Description |
|----------|-------------|
| `OPENAI_API_KEY` | Required for synthesis / extraction in the scoring agent |
| `TAVILY_API_KEY` | Optional search provider |
| `SERPER_API_KEY` | Optional Google search |

**Alerts**

| Variable | Description |
|----------|-------------|
| `RESEND_API_KEY` | Sends email alerts when set with `ALERT_TO_EMAIL` |
| `ALERT_FROM_EMAIL` / `ALERT_TO_EMAIL` | Resend sender and destination |

Optional `NEXT_PUBLIC_APP_URL` appears in server-side email helpers for links — prefer aligning with production URL.

---

## Development

### UI only (fast iteration)

Runs Next.js on port **3000** and frees a stuck listener on Windows when needed (`scripts/dev.js`).

```bash
cd supplypulse-frontend
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

**Note:** With `NEXT_PUBLIC_API_URL` unset, the UI requests **`/.netlify/functions/*`**. Those routes are served by Netlify (or **`netlify dev`**), not by `next dev` alone — use Netlify CLI below for scoring, suppliers, Stripe, etc.

### Full stack (Next.js + serverless locally)

From the **repository root** (where [`netlify.toml`](netlify.toml) lives):

```bash
netlify dev
```

This wires the Next app from `supplypulse-frontend`, functions, environment, and redirects (including **`/api/*` → functions**).

---

## Scripts (`supplypulse-frontend`)

| Command | Description |
|---------|-------------|
| `npm run dev` | Next.js dev server (see above) |
| `npm run build` | Production build |
| `npm run start` | Start production server locally after `npm run build` |
| `npm run lint` | ESLint |

---

## Deployment (Netlify)

1. Connect the Git repository to Netlify.
2. Ensure build settings match [`netlify.toml`](netlify.toml): **base directory** `supplypulse-frontend`, build command `npm run build`.
3. Set all required environment variables in the Netlify site (especially Supabase service role and AI/Stripe secrets).
4. **Scheduled function:** [`scheduled-scan`](supplypulse-frontend/netlify/functions/scheduled-scan.js) runs on the cron defined in `netlify.toml` (`0 6 * * *` UTC unless you change it).

---

## Architecture overview

- **Auth:** Supabase Auth with SSR via [`@supabase/ssr`](https://supabase.com/docs/guides/auth/server-side/nextjs); session-sensitive routing in [`supplypulse-frontend/middleware.ts`](supplypulse-frontend/middleware.ts).
- **Data:** PostgreSQL via Supabase; serverless handlers use the **service role** client for privileged operations.
- **Scoring:** `score-supplier` runs an agent loop (search tools + OpenAI), persists scores/signals, and can trigger **`sendAlert`** (Resend + per-supplier Slack webhook URL stored in DB).
- **Stripe:** Checkout, billing portal, and webhook handlers update subscription tier in Supabase.

---

## License / product notice

Risk scores are **indicators only** — not financial, legal, or investment advice. Operators should disclose that appropriately in-product (see deployed marketing/legal copy).

---

## Further reading

- Frontend-specific shorthand: [`supplypulse-frontend/README.md`](supplypulse-frontend/README.md)
