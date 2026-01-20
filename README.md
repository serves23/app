# FlowFile Starter

Minimal Supabase auth + Stripe subscriptions scaffold.

## Setup
- Copy `.env.local` and fill real values (use Stripe/Supabase test keys while building).
- Run the SQL schema in Supabase: `supabase/schema.sql` (SQL Editor).
- Install deps (already installed): `npm install`.

## Dev
- Start app: `npm run dev` then open http://localhost:3000.
- Stripe webhooks (local): `stripe listen --forward-to localhost:3000/api/stripe/webhook`.

## Notes
- Remove the Stripe `apiVersion` override in `app/app/server-actions.ts` and `app/api/stripe/webhook/route.ts` if your account API version differs.
- Auth routes: `/signup`, `/login`. App gate: `/app` (locks until subscription active).
