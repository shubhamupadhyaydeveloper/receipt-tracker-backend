# Receipt Tracker Backend — Claude Skills Reference

A quick-start guide for Claude (and developers) working in this repo.

---

## Project at a Glance

| Item | Value |
|------|-------|
| Runtime | Node.js + TypeScript (strict) |
| Framework | Fastify 5 |
| Database | PostgreSQL via Neon (pg Pool) |
| Auth | Firebase Admin SDK (Bearer token) |
| AI | Gemini 2.5 Flash Lite (receipt OCR) |
| Images | ImageKit CDN |
| Payments | Razorpay (session-based mobile→web flow) |
| Deploy | Vercel (`vercel.json`) |
| Tests | Vitest |

---

## Directory Map

```
src/
├── app.ts                # Fastify app: CORS, rate-limit, auth hook, route registration
├── server.ts             # Entry point — listen on port 3001
├── db/
│   ├── index.ts          # pg Pool (max 10 conns, SSL for Neon)
│   ├── types.ts          # UserProfile, Receipt, PaymentSession interfaces
│   └── schema/           # Raw SQL — run manually or via migration runner
├── firebase/index.ts     # Firebase Admin SDK init (singleton)
├── routes/
│   ├── auth.ts           # POST /api/auth/sync  — upsert Firebase user
│   ├── receipt-scan.ts   # POST /api/receipt-scan  — Gemini OCR
│   ├── create-receipts.ts # POST /api/create-receipt  — manual entry + ImageKit upload
│   ├── receipts.ts       # GET/PUT/DELETE /api/receipts[/:id]
│   ├── dashboard.ts      # GET /api/dashboard
│   ├── reports.ts        # GET /api/reports/summary|monthly-trend|gst
│   ├── export.ts         # POST /api/export  — CSV via ImageKit signed URL
│   ├── payment.ts        # Razorpay session flow
│   └── user.ts           # GET/PUT /api/user/profile
├── lib/
│   ├── mapReceipt.ts     # Raw DB row → frontend Receipt shape
│   └── storeImage.ts     # ImageKit upload wrapper
└── types/
    └── payloads.ts       # Request body interfaces
```

---

## Auth Flow

```
Mobile app ──Bearer token──► preHandler hook ──verifyIdToken──► Firebase
                                                            └──► SELECT user_profiles
                                                                 request.neonUser set
```

Payment routes (`/create-order-session`, `/verify-session`) are **exempt** from Firebase auth — they use a one-time 10-minute `sessionId` stored in `payment_sessions`.

---

## Key Patterns

### Adding a new route
1. Create `src/routes/my-route.ts` as a Fastify plugin function.
2. Define Zod schemas at the top of the file for all request inputs.
3. Register it in `src/app.ts`: `app.register(myRoute, { prefix: '/api' })`.
4. Access auth via `request.neonUser` (DB record) or `request.firebaseUser` (decoded token).

### DB queries
- Use parameterised queries only — `db.query('... WHERE id = $1', [id])`.
- No ORM — raw SQL via `pg` Pool.
- Always scope queries by `user_id = $N` to prevent cross-user data leakage.

### Validation
- Use `z.object(...).safeParse(request.body/query)` for all inputs.
- Return `400` with `{ error: issues.map(i => i.message).join('; ') }` on failure.

### Error handling
- DB errors propagate to Fastify's default 500 handler (logged, no details exposed).
- Use `request.log.error({ err }, 'message')` — never `console.log` in production code.
- Never send internal error details to the client.

---

## Environment Variables (required)

```
DATABASE_URL                  # Neon connection string
FIREBASE_PROJECT_ID
FIREBASE_CLIENT_EMAIL
FIREBASE_PRIVATE_KEY          # include literal \n escapes; code replaces them
GEMINI_API_KEY
RAZORPAY_KEY_ID
RAZORPAY_KEY_SECRET
IMAGEKIT_PUBLIC_KEY
IMAGEKIT_PRIVATE_KEY
IMAGEKIT_URL_ENDPOINT

# Optional
CORS_ORIGIN                   # e.g. https://yourdomain.com (defaults to * in dev)
NODE_ENV                      # set to "production" on Vercel
```

---

## Common Commands

```bash
npm run dev          # nodemon + ts-node (port 3001)
npm run build        # tsc → build/
npm start            # node build/app.js
npm test             # vitest run
npm run test:coverage
npx tsc --noEmit     # type-check without emitting
```

---

## Payment Flow (mobile → web)

```
1. Mobile:  POST /api/payment/create-session      → { sessionId }  (Firebase auth required)
2. Mobile:  open Chrome with ?session=<sessionId>
3. Web:     POST /api/payment/create-order-session → Razorpay orderId  (sessionId auth)
4. Web:     Razorpay checkout
5. Web:     POST /api/payment/verify-session       → plan upgraded  (HMAC verified)
```

---

## Plans & Pricing

| Plan | Amount | Duration |
|------|--------|----------|
| monthly | ₹149 (14900 paise) | 1 month |
| yearly | ₹2499 (249900 paise) | 1 year |

---

## Receipt Categories (enum — used in DB, Gemini schema, and Zod)

```
Food & Dining | Software Subscription | Electronics | Travel | Health & Fitness | Other
```

---

## Test Infrastructure

- Tests live in `src/__tests__/`
- Mock DB via `vi.mock('../db')` — no real DB needed for unit tests
- Firebase auth bypassed via `buildTestApp.ts` hook
- Mock helpers: `MOCK_USER`, `MOCK_RECEIPT_ROW` in `helpers/mockData.ts`
- Run a single test file: `npx vitest run src/__tests__/receipts.test.ts`

---

## Production Checklist (before deploying)

- [ ] `NODE_ENV=production` set in Vercel env vars
- [ ] `CORS_ORIGIN` set to the actual frontend domain
- [ ] All required env vars populated in Vercel dashboard
- [ ] DB schema migrations applied (run SQL files in `src/db/schema/` in order)
- [ ] Rate limit tuned (`max` in `app.ts`) for expected traffic
- [ ] Razorpay webhook configured if needed for async payment events

---

## Known Limitations / TODOs

- **Excel export** sends CSV bytes with `.xlsx` extension — client must handle as CSV
- **Rate limiting** is global (not per-user) — consider upgrading to per-IP or per-user key
- **No DB migration runner** — SQL files are applied manually
- **No soft-delete** on receipts — deletes are permanent
- **Usage counter reset** (`receipts_scanned_this_month`) relies on a monthly cron job or manual reset; no automatic trigger exists in code
