# Costpilot

CostPilot records expenses and organizes them into personal and shared workspaces. The core release includes Clerk sign-in, expense management, platform/project records, invitations and exports. Provider automation, AI analysis and payments are disabled pending separate acceptance.
Launch readiness: [closure plan](docs/governance/LAUNCH_PLAN.md) and [current audit](audits/2026-11-04_Codex_LaunchReadiness_Audit.md). Public launch remains blocked by the recorded gaps. See the [branch handoff and configuration guide](docs/governance/LAUNCH_HANDOFF.md). See [execution evidence](audits/2026-11-04_Codex_LaunchExecution_Audit.md) and the [release runbook](docs/governance/RELEASE_RUNBOOK.md).


## Tech Stack

| Layer | Technology |
|-------|------------|
| Package Manager | pnpm 9.x with workspaces |
| Language | TypeScript 5.9+ |
| API Server | Express 5 |
| Database | PostgreSQL 16 + Drizzle ORM |
| Auth | Clerk |
| Payments | Disabled preview (Stripe source retained) |
| AI | Disabled preview (provider source retained) |
| Mobile | Expo 58 + React Native 0.88 |
| Web UI | React 19 + Vite 7 + TailwindCSS 4 |
| Code Generation | Orval (from OpenAPI spec) |
| Validation | Zod 4.x |

## Project Structure

```
costpilot/
├── lib/                     # Shared packages
│   ├── api-spec/           # OpenAPI specification
│   ├── api-zod/            # Generated Zod schemas & types
│   └── db/                 # Drizzle ORM schema & client
├── artifacts/               # Deployable applications
│   ├── api-server/         # REST API server
│   ├── ai-tracker/         # Web dashboard
│   └── mobile-app/         # React Native mobile app
└── docker-compose.yml      # Local development services
```

## Setup

### Prerequisites
- Node.js 22.13+ (Node 22 is used in CI/production)
- pnpm 9.x
- Docker (for PostgreSQL/Redis)

### Installation

```bash
pnpm install
pnpm --filter @workspace/api-spec run codegen  # Generate API types
```

### Environment Variables

Copy `.env.example` to ignored `.env` for the API. Configure `DATABASE_URL`, `CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SIGNING_SECRET`, `ALLOWED_ORIGINS` and a persistent 64-hex-character `ENCRYPTION_KEY` (or `KMS_MASTER_KEY`). API startup validates these values; production requires origins and the webhook secret. Load the root environment into the process before starting the API (for example Node's `--env-file` support); it is not automatically loaded by the package start script.

Copy each client's `.env.example` to its own ignored `.env.local`. Web uses `VITE_CLERK_PUBLISHABLE_KEY` and `VITE_API_ORIGIN`; mobile uses `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` and `EXPO_PUBLIC_API_ORIGIN`. Use one matching Clerk instance and enable Clerk Native API for mobile. A physical device needs a reachable LAN/HTTPS API origin. Client origins have no `/api` suffix. Mobile refuses requests without an explicit origin. No credentials are required for disabled provider features.

For public builds, follow the [release runbook](docs/governance/RELEASE_RUNBOOK.md), including GitHub Pages variables, approved contacts and live identity/device acceptance.

### Database Setup

```bash
# Start PostgreSQL and Redis
docker-compose up -d

# Apply committed migrations to the configured local database
pnpm --filter @workspace/db run migrate
```

## Development

| Command | Description |
|---------|-------------|
| `pnpm --filter @workspace/api-server run dev` | Build/start API server (PORT defaults to 8080; load environment first) |
| `pnpm --filter @workspace/ai-tracker run dev` | Start web dashboard (Vite dev server) |
| `pnpm --filter mobile-app run start` | Start Expo development server |
| `pnpm run typecheck` | Type-check all packages |
| `pnpm --filter @workspace/api-spec run codegen` | Regenerate API hooks and Zod schemas |
| `pnpm --filter @workspace/db run push` | Push DB schema changes |
| `pnpm run build` | Build all packages |

## Production

```bash
# Build and start API server
pnpm --filter @workspace/api-server run build
pnpm --filter @workspace/api-server run start

# Build web app
pnpm --filter @workspace/ai-tracker run build
pnpm --filter @workspace/ai-tracker run serve
```

## Architecture Notes

- **Monorepo**: Workspace-managed packages with shared versioning
- **API-first**: OpenAPI spec is the single source of truth; Orval generates both client hooks and server types
- **Zod validation**: All API inputs/outputs validated via generated Zod schemas
- **Drizzle ORM**: Type-safe PostgreSQL queries with schema defined in `lib/db/src/schema/`
- **Supply-chain security**: pnpm `minimumReleaseAge` set to 1 day for all packages
- **No explicit API server dev script**: Currently runs build + start; hot reload planned