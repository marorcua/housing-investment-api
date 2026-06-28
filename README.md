# Housing Investment API

REST API for tracking real estate investments — properties, tenants, loans, and Spanish tax (Hacienda) compliance.

Built with [Hono](https://hono.dev/), [Drizzle ORM](https://orm.drizzle.team/), and [Turso](https://turso.tech/) (libSQL/SQLite).

## Setup

```bash
cp .env.example .env   # configure your variables
npm install
npm run dev            # starts on http://localhost:3000
```

## Environment Variables

| Variable | Description |
|---|---|
| `PORT` | Server port (default 3000) |
| `TURSO_CONNECTION_URL` | Turso database URL |
| `TURSO_AUTH_TOKEN` | Turso auth token |
| `JWT_SECRET` | Secret for JWT signing |
| `API_PASSWORD` | Login password (default: `admin`) |

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
npm test           # run once
npm run test:watch # watch mode
```

## Tech Stack

- **Runtime:** Node.js + TypeScript
- **Framework:** Hono
- **Database:** Turso (libSQL/SQLite) via Drizzle ORM
- **Validation:** Zod
- **Auth:** JWT via `jose`
- **Testing:** Vitest
