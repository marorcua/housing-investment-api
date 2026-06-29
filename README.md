# Housing Investment API

REST API for tracking real estate investments — properties, tenants, loans, and Spanish tax (Hacienda) compliance.

Built with [Hono](https://hono.dev/), [Drizzle ORM](https://orm.drizzle.team/), and [Turso](https://turso.tech/) (libSQL/SQLite).

## Setup

```bash
cp .env.example .env   # configure your variables
npm install
npm run dev            # starts on http://localhost:3000
```

## Database

By default the API uses a local SQLite file (`local.db`). To use Turso (remote), set the env vars below.

Initialize the database tables:

```bash
npm run db:push
```

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | Server port |
| `TURSO_CONNECTION_URL` | — | Turso database URL (omit for local SQLite) |
| `TURSO_AUTH_TOKEN` | — | Turso auth token |
| `JWT_SECRET` | auto-generated | Secret for JWT signing |
| `API_PASSWORD` | `admin` | Login password |

## Auth

All data endpoints require a JWT. Obtain one via:

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"password": "admin"}'
```

Use the returned token in subsequent requests:

```bash
curl http://localhost:3000/properties \
  -H "Authorization: Bearer <token>"
```

## API Routes

| Method | Path | Description |
|---|---|---|
| `POST` | `/auth/login` | Login, returns JWT |
| `GET` | `/properties` | List properties |
| `GET` | `/properties/:id` | Get property |
| `POST` | `/properties` | Create property |
| `PATCH` | `/properties/:id` | Update property |
| `DELETE` | `/properties/:id` | Delete property |
| `GET` | `/revenues/property/:id` | List revenues for property |
| `POST` | `/revenues` | Create revenue |
| `PATCH` | `/revenues/:id` | Update revenue |
| `DELETE` | `/revenues/:id` | Delete revenue |
| `GET` | `/expenses/property/:id` | List expenses |
| `POST` | `/expenses` | Create expense |
| `PATCH` | `/expenses/:id` | Update expense |
| `DELETE` | `/expenses/:id` | Delete expense |
| `GET` | `/tenants/property/:id` | List tenants |
| `POST` | `/tenants` | Create tenant |
| `PATCH` | `/tenants/:id` | Update tenant |
| `DELETE` | `/tenants/:id` | Delete tenant |
| `GET` | `/loans/property/:id` | List loans |
| `POST` | `/loans` | Create loan |
| `PATCH` | `/loans/:id` | Update loan |
| `DELETE` | `/loans/:id` | Delete loan |
| `GET` | `/recurring-expenses/property/:id` | List recurring expenses |
| `POST` | `/recurring-expenses` | Create recurring expense |
| `PATCH` | `/recurring-expenses/:id` | Update recurring expense |
| `DELETE` | `/recurring-expenses/:id` | Delete recurring expense |
| `GET` | `/hacienda/summary/:propertyId` | Tax summary for property |
| `GET` | `/hacienda-global` | Aggregated data across all properties |

## Testing

```bash
npm test            # run once (with coverage)
npm run test:watch  # watch mode
```

Coverage thresholds: 80% statements/functions/lines, 75% branches.

Tests use a mocked database via Vitest — no real database needed. See `vitest.setup.ts` for the mock setup.

## Database Backups

Automatic daily backups run at 3:00am via a LaunchAgent, keeping 7 days of backups.

```bash
# Manual backup
npm run db:backup

# Backups are stored in:
ls backups/
```

Backups are stored in `backups/` as `local.db.YYYY-MM-DD`. Old backups are auto-pruned after 7 days.

The LaunchAgent is already installed. To reinstall or move the project:

```bash
launchctl unload ~/Library/LaunchAgents/com.housing-investment.db-backup.plist
# update paths in scripts/com.housing-investment.db-backup.plist
cp scripts/com.housing-investment.db-backup.plist ~/Library/LaunchAgents/
launchctl load ~/Library/LaunchAgents/com.housing-investment.db-backup.plist
```

## CI

GitHub Actions runs on every push:

1. `npm run build` — TypeScript compilation check
2. `npx vitest run --coverage` — unit tests with coverage

The web project's CI also checks out this API repo and runs end-to-end Playwright tests against an isolated `test.db`.

## Tech Stack

- **Runtime:** Node.js + TypeScript
- **Framework:** Hono
- **Database:** Turso (libSQL/SQLite) via Drizzle ORM
- **Validation:** Zod
- **Auth:** JWT via `jose`
- **Testing:** Vitest
