# Costpilot

AI-powered cost tracking and budget management for cloud infrastructure. Monitor cloud spending, get intelligent insights, and automate cost optimization across multiple providers and projects.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Package Manager | pnpm 9.x with workspaces |
| Language | TypeScript 5.9+ |
| API Server | Express 5 |
| Database | PostgreSQL 16 + Drizzle ORM |
| Auth | Clerk |
| Payments | Stripe |
| AI | OpenAI (GPT models) |
| Mobile | Expo 56 + React Native 0.85 |
| Web UI | React 19 + Vite 7 + TailwindCSS 4 |
| Code Generation | Orval (from OpenAPI spec) |
| Validation | Zod v4 |

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
- Node.js 24+
- pnpm 9.x
- Docker (for PostgreSQL/Redis)

### Installation

```bash
pnpm install
pnpm --filter @workspace/api-spec run codegen  # Generate API types
```

### Environment Variables

Copy `.env.template` to `.env` and configure:

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:postgres@localhost:5432/costpilot` |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379` |
| `CLERK_SECRET_KEY` | Clerk secret key for auth | - |
| `CLERK_PUBLISHABLE_KEY` | Clerk publishable key | - |
| `STRIPE_SECRET_KEY` | Stripe secret key | - |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret | - |
| `OPENAI_API_KEY` | OpenAI API key for AI insights | - |
| `PORT` | API server port | `3001` |
| `ALLOWED_ORIGINS` | CORS allowed origins (comma-separated) | - |

### Database Setup

```bash
# Start PostgreSQL and Redis
docker-compose up -d

# Push schema to database
pnpm --filter @workspace/db run push
```

## Development

| Command | Description |
|---------|-------------|
| `pnpm --filter @workspace/api-server run dev` | Start API server (port 3001) |
| `pnpm --filter @workspace/ai-tracker run dev` | Start web dashboard (Vite dev server) |
| `pnpm --filter @workspace/mobile-app run start` | Start Expo development server |
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