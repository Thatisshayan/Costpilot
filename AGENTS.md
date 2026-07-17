# Costpilot — Agent Rules

This file is the first-stop instruction set for any agent working in this repository.

## Mandatory Read Order

Before planning, editing, or reporting completion, every agent must read:

1. [README.md](./README.md)
2. [GROUND-TRUTH.md](./GROUND-TRUTH.md) (if exists) — source of truth for project state
3. `.env.example` — all environment variables and their purposes
4. The monorepo structure: `lib/api-spec/`, `lib/api-zod/`, `lib/db/` (shared packages)
5. The latest implementation notes (check for phase documents like `COSTPILOTJUNECOMPLETIONSPRINT.md`)

If the task involves the database, API, or mobile, read:

1. `lib/db/` — Drizzle ORM schema definitions (PostgreSQL tables)
2. `lib/api-spec/` — OpenAPI specification (single source of truth for API contract)
3. `lib/api-zod/` — Generated Zod schemas and types (auto-generated from OpenAPI)
4. `artifacts/api-server/` — Express REST API implementation
5. `artifacts/mobile-app/` — React Native codebase

## Repo Structure

```
costpilot/
├── lib/                          # Shared packages (pnpm workspace)
│   ├── api-spec/                 # OpenAPI specification (YAML)
│   │   └── openapi.yaml          # Single source of truth for API
│   ├── api-zod/                  # Generated Zod schemas + TypeScript types
│   │   ├── generated/            # Auto-generated (do not edit)
│   │   └── src/                  # Hand-written utilities
│   └── db/                       # Drizzle ORM + schema
│       ├── src/schema/           # PostgreSQL table definitions
│       └── drizzle/              # Migration files
├── artifacts/
│   ├── api-server/               # Express REST API server (port 3001)
│   │   ├── src/
│   │   │   ├── routes/           # API endpoint handlers
│   │   │   ├── services/         # Business logic (OpenAI, billing, etc.)
│   │   │   └── middleware/       # Auth, validation, error handling
│   │   └── package.json          # Dependencies + build scripts
│   ├── ai-tracker/               # React web dashboard (Vite)
│   │   ├── src/
│   │   │   ├── pages/            # Route pages
│   │   │   ├── components/       # React components
│   │   │   └── lib/              # Utilities
│   │   └── package.json
│   └── mobile-app/               # React Native Expo app
│       ├── app/                  # Expo Router structure
│       ├── src/
│       │   ├── screens/
│       │   └── components/
│       └── package.json
├── docker-compose.yml            # PostgreSQL + Redis for local dev
├── pnpm-workspace.yaml           # Workspace definition
└── pnpm-lock.yaml                # Lock file (commit this)
```

## Key Conventions

- **API-first design**: `lib/api-spec/openapi.yaml` is the single source of truth; never let implementation drift from spec
- **Code generation**: Run `pnpm --filter @workspace/api-spec run codegen` to regenerate Zod schemas and client hooks from OpenAPI
- **Monorepo packages**: All three artifacts (`api-server`, `ai-tracker`, `mobile-app`) import from `lib/api-zod/` and `lib/db/`
- **Database**: Drizzle ORM with PostgreSQL; migrations in `lib/db/drizzle/`; always run `pnpm --filter @workspace/db run push` after schema changes
- **Authentication**: Clerk (handled in middleware)
- **Payments**: Stripe (webhooks in api-server)
- **AI insights**: OpenAI GPT models called from `artifacts/api-server/src/services/`
- **Validation**: All API inputs validated via generated Zod schemas (from OpenAPI spec)

## Development Workflow

### First-time Setup

```bash
pnpm install                                              # Install all dependencies
pnpm --filter @workspace/api-spec run codegen            # Generate Zod schemas
pnpm --filter @workspace/db run push                     # Create database tables
```

### Local Development

```bash
# Terminal 1: Start PostgreSQL + Redis
docker-compose up -d

# Terminal 2: API server (watches for changes)
pnpm --filter @workspace/api-server run dev              # Port 3001

# Terminal 3: Web dashboard (Vite dev server)
pnpm --filter @workspace/ai-tracker run dev              # Port 5173

# Terminal 4: Mobile Expo (optional)
pnpm --filter @workspace/mobile-app run start
```

### Making API Changes

1. **Edit the spec**: `lib/api-spec/openapi.yaml`
2. **Generate types**: `pnpm --filter @workspace/api-spec run codegen`
3. **Update the implementation**: `artifacts/api-server/src/routes/` (handlers will type-check against generated Zod)
4. **Update consumers**: `ai-tracker` and `mobile-app` automatically use new hooks (no manual update needed)

### Database Schema Changes

1. **Edit schema**: `lib/db/src/schema/`
2. **Push to database**: `pnpm --filter @workspace/db run push`
3. **Generate types**: Generated automatically; TypeScript will catch drift

### Type-checking All Packages

```bash
pnpm run typecheck                    # Runs tsc across all packages
```

## Completion Standard

An agent must not mark work complete until:

- Code changes are applied and tested locally (`pnpm run dev` in relevant artifact)
- API spec (if touched) matches implementation; run `pnpm --filter @workspace/api-spec run codegen` after edits
- Database schema (if touched) is pushed: `pnpm --filter @workspace/db run push`
- All affected packages type-check: `pnpm run typecheck` passes
- Tests pass (if test suite exists): `pnpm --filter @workspace/{api-server,ai-tracker,mobile-app} run test`
- The final report distinguishes completed work, deferred work, and pre-existing issues

## Architecture Notes

- **pnpm workspaces**: All artifacts are independent Node.js projects sharing `lib/` packages
- **Supply-chain security**: pnpm has `minimumReleaseAge: 1d` set globally — all new package versions are waited 24 hours before adoption
- **Clerk auth**: All artifacts delegate authentication to Clerk (no custom session management)
- **Stripe**: Webhook signature verification in API middleware; payment state in PostgreSQL
- **OpenAI**: Called from `api-server` only; results cached in PostgreSQL to avoid re-querying

## Known Gaps & Deferred Items

- [ ] **API server dev script**: Currently runs `build` then `start`; hot reload via nodemon or tsx is planned
- [ ] **E2E tests**: No end-to-end test suite yet (api-server + db + api-tracker integration)
- [ ] **Deployment**: No documented deployment pipeline (Railway? Vercel? AWS?) — deployment is out of scope for this sprint

## Support & Troubleshooting

- **"pnpm workspace not found"**: Ensure you're at the repo root, not in a subdirectory
- **"Cannot find module @workspace/..."**: Run `pnpm install` in the root
- **"Zod schema out of sync"**: OpenAPI spec changed; run `pnpm --filter @workspace/api-spec run codegen`
- **"Database connection failed"**: Ensure PostgreSQL is running via `docker-compose up` and `DATABASE_URL` is correct in `.env`
- **"Clerk keys missing"**: Copy `.env.example` to `.env` and fill in Clerk secrets
