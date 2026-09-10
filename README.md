# YourStore

Production-oriented multi-tenant SaaS for social-first merchant storefronts.

**Value proposition:** All your store products in one link.

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind CSS 4
- Clean architecture: UI → Application services → Domain → Repository ports → Infrastructure adapters
- Initial infrastructure target: Supabase (Auth, Postgres, Storage, RLS)
- Local/demo mode: in-memory adapters + Al Noor demo seed (no Supabase required)

## Architecture

```
src/
  app/                 # Next.js routes (marketing, auth, dashboard, public store, admin, API)
  application/         # Services + ports (interfaces)
  domain/              # Entities, rules, errors
  infrastructure/      # Memory + Supabase adapters, DI container, demo seed
  components/          # Design system + storefront/marketing UI
  features/            # Route-facing forms & server actions
  config/              # App + plan/entitlement config
  validations/         # Zod schemas
  i18n/                # Localization-ready message catalogs (+ RTL helper)
```

Business logic lives in services (`ProductService`, `StoreService`, `EntitlementService`, …). UI never talks to Supabase directly.

Swap adapters in `src/infrastructure/container.ts` when moving off memory/demo onto Supabase or a future NestJS API.

## Quick start

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

- Landing page: `/`
- Demo store: `/alnoor`
- Demo merchant login: `merchant@alnoor.demo` / any password (≥8 chars)
- Dashboard: `/dashboard`

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run typecheck` | TypeScript |
| `npm run lint` | ESLint |
| `npm test` | Vitest unit/integration tests |

## Internationalization

Supported UI locales: **English**, **Arabic** (RTL), **Turkish**.

- Visitor language switcher (cookie `ys_locale`)
- Store default language in store settings (`defaultLocale`)
- Public storefront UI follows cookie → store default → English
- Message catalogs live in `src/i18n/messages.ts`

## Supabase (production path)

1. Create a Supabase project.
2. Apply `supabase/migrations/20260908000000_init.sql` (schema + RLS).
3. Set env vars from `.env.example`.
4. Implement/wire `Supabase*Adapter` repositories in `src/infrastructure/supabase/` and select them from `createServices()` when `NEXT_PUBLIC_SUPABASE_URL` is present.

Until those adapters are wired, the app runs fully on memory/demo adapters so the architecture stays testable without vendor lock-in in the UI layer.

## Billing

`PaymentProvider` + `StubPaymentProvider` are in place. Configure Stripe keys and replace the stub with `StripePaymentProvider` for live checkout/webhooks. Plan limits are centralized in `src/config/plans.ts` and enforced by `EntitlementService`.

## MVP status

Implemented foundations:

- Auth abstraction + login/register flows
- Store create/settings + public storefront
- Products/categories CRUD (merchant)
- Search, share links, WhatsApp order messages, OG/SEO basics
- Analytics events + dashboard ranges
- Subscription/entitlement model
- Admin foundation page
- SQL migrations + RLS policies
- Design system + commercial landing page
- Demo store (Al Noor)

Intentionally deferred (architected, not fully built): marketplace, full checkout/orders UI, AI import, custom domains live provisioning, Stripe live webhooks.

## Deployment

Deployable to Vercel or any Node host:

```bash
npm run build
npm run start
```

Ensure environment variables are set per environment (development / staging / production). Never expose `SUPABASE_SERVICE_ROLE_KEY` or Stripe secrets to the client.
