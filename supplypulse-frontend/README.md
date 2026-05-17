# SupplyPulse frontend

## The problem

Procurement and operations teams rarely get **early, structured warnings** when a supplier’s situation changes. News spreads across many sources; legal and financial filings are easy to miss; internal dashboards often update **after** a disruption starts. Teams end up reacting late, with incomplete context.

## The idea

**SupplyPulse** is a lightweight **supplier risk intelligence** product: add a supplier, run an automated scan that gathers public signals, and get a clear **health score**, supporting **signals**, a **recommended action framing**, and over time a **score history** so you can see deterioration *before* it becomes an operational crisis. Alerts (email / Slack webhook) kick in when a score drops relative to thresholds you configure.

This repository’s frontend is where users **sign up, subscribe, manage suppliers, view scores and alerts, and configure alerting** — backed by **Supabase** (auth + data) and **Netlify Functions** (scoring pipeline, Stripe, cron).

Full setup (environment variables, Netlify deployment, scheduling) lives in **`../README.md`**.

---

## Project structure

```text
supplypulse-frontend/
├── src/
│   ├── app/
│   │   ├── page.tsx                 # Marketing / landing (public)
│   │   ├── layout.tsx               # Root layout
│   │   ├── globals.css
│   │   ├── (auth)/                  # Login, signup, Supabase OAuth callback
│   │   │   ├── login/
│   │   │   ├── signup/
│   │   │   └── callback/route.ts
│   │   └── (app)/                   # Authenticated shell (dashboard, suppliers, alerts, profile)
│   │       ├── layout.tsx
│   │       ├── dashboard/
│   │       ├── suppliers/
│   │       │   ├── new/
│   │       │   └── [id]/            # Detail + edit routes
│   │       ├── alerts/
│   │       └── profile/
│   ├── components/
│   │   ├── layout/                  # Sidebar, shell, header, auth UI, theme
│   │   ├── dashboard/, suppliers/, alerts/, signals/
│   │   ├── profile/, charts/, common/
│   ├── hooks/                       # e.g. scan polling, theme
│   └── lib/
│       ├── api.ts                   # Builds URLs for Netlify `/api/*` or `/.netlify/functions/*`
│       ├── constants.ts, plans.ts
│       ├── types/
│       ├── supabase/                # Browser + server clients, env helpers
│       └── …                        # site origin, themes, utilities
├── netlify/functions/               # Serverless API (wired as /api/* in production)
│   ├── suppliers.js, alerts.js      # Supplier CRUD, alert prefs
│   ├── score-supplier.js            # Runs agent loop; persists scores / signals
│   ├── score-status.js, score-history.js
│   ├── auth-login.js, auth-signup.js
│   ├── create-checkout.js, billing-portal.js, stripe-webhook.js
│   ├── scheduled-scan.js           # Cron: invokes scoring for due suppliers
│   ├── delete-account.js
│   └── lib/                        # Agent tools (search, LLM extract/synthesize),
│                                    auth, Stripe, email templates, sanitization
├── public/
├── middleware.ts                    # Protected routes + auth session boundaries
├── scripts/                         # dev helpers (port cleanup, etc.)
└── package.json
```

---

## Quick reference

From this directory:

```bash
npm install
npm run dev          # Next.js on http://localhost:3000
npm run build
npm run lint
```

For **`/api/*`** and **`/.netlify/functions/*`** locally (scoring, suppliers API, Stripe), run **`netlify dev`** from the **repository root** — see **`../README.md`**.
