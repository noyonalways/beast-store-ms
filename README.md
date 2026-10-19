# Beast Store Microservices

A microservices-based e-commerce backend built as a practical workshop project. Six Express + TypeScript services, each owning its own PostgreSQL database via Prisma, fronted by a config-driven API gateway.

## Architecture

```
                          ┌─────────────────┐
   Client ──── /api/* ───▶│   API Gateway   │  :4000
                          │  (auth + proxy) │
                          └────────┬────────┘
                                   │
        ┌──────────────┬───────────┼───────────┬──────────────┐
        ▼              ▼           ▼           ▼              ▼
   ┌─────────┐   ┌───────────┐ ┌───────┐  ┌────────┐   ┌───────────┐
   │ Product │   │ Inventory │ │ Auth  │  │  User  │   │   Email   │
   │  :4001  │   │   :4002   │ │ :4003 │  │ :4004  │   │   :4005   │
   └────┬────┘   └─────┬─────┘ └───┬───┘  └───┬────┘   └─────┬─────┘
        │              ▲           │          ▲              ▲
        │  create inv. │           │ register │              │ send
        └──────────────┘           └──────────┴──────────────┘
```

The gateway is the only public entry point. It authenticates requests and forwards them upstream, injecting verified user identity as headers. Product, auth, user and email services also make direct internal calls to each other for cross-service workflows.

## Services

| Service | Port | Database | Responsibility |
|---|---|---|---|
| **api-gateway** | 4000 | — | Single entry point, JWT auth, request routing/proxying, rate limiting |
| **product** | 4001 | `product_db` | Product catalog, creates a linked inventory record |
| **inventory** | 4002 | `inventory_db` | Stock levels and stock movement history |
| **auth** | 4003 | `auth_db` | Registration, login, JWT issuance, email verification, login history |
| **user** | 4004 | `user_db` | User profile records (linked to auth accounts) |
| **email** | 4005 | `email_db` | Sends transactional email via SMTP, stores an email log |

All services share one PostgreSQL instance but each keeps its own database and its own Prisma schema and migrations.

## Tech Stack

- **Runtime:** Node.js, TypeScript
- **Framework:** Express 5
- **ORM:** Prisma 7 (`@prisma/adapter-pg` driver adapter)
- **Database:** PostgreSQL 13
- **Auth:** `jsonwebtoken` (JWT), `bcryptjs` (password hashing)
- **Email:** Nodemailer over SMTP
- **Validation:** Zod
- **Gateway:** Axios (hand-rolled proxying), Helmet, express-rate-limit, Morgan
- **Package manager:** pnpm

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm
- Docker (for PostgreSQL, pgAdmin and MailHog)

### 1. Start infrastructure

```bash
docker compose up -d
```

This starts:

| Container | Port(s) | Purpose |
|---|---|---|
| `postgres` | 5432 | Database server |
| `pgadmin` | 5050, 5051 | Database admin UI (`admin@example.com` / `admin`) |
| `mailhog` | 1025, 8025 | Dev SMTP server (1025) and web inbox (8025) |

### 2. Create the databases

Each service expects its own database on the shared instance. Create them in pgAdmin or with `psql`:

```bash
docker exec -it postgres psql -U postgres -c \
  "CREATE DATABASE auth_db; CREATE DATABASE user_db; CREATE DATABASE email_db; CREATE DATABASE product_db; CREATE DATABASE inventory_db;"
```

### 3. Configure environment

Every service reads its config from a `.env` file in its own directory. Create one for each service using the variables below.

**`api-gateway/.env`**

```env
PORT=4000
AUTH_SERVICE_URL=http://localhost:4003
```

**`services/auth/.env`**

```env
PORT=4003
SERVICE_NAME=Auth-Service
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/auth_db?schema=public
JWT_SECRET=replace-with-a-long-random-secret
USER_SERVICE_URL=http://localhost:4004
EMAIL_SERVICE_URL=http://localhost:4005
```

**`services/user/.env`**

```env
PORT=4004
SERVICE_NAME=User-Service
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/user_db?schema=public
INVENTORY_SERVICE_URL=http://localhost:4002
```

**`services/email/.env`**

```env
PORT=4005
SERVICE_NAME=Email-Service
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/email_db?schema=public
DEFAULT_SENDER=dev@noyonrahman.com
SMTP_HOST=localhost
SMTP_PORT=1025
```

**`services/product/.env`**

```env
PORT=4001
SERVICE_NAME=Product-Service
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/product_db?schema=public
INVENTORY_SERVICE_URL=http://localhost:4002
```

**`services/inventory/.env`**

```env
PORT=4002
SERVICE_NAME=Inventory-Service
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/inventory_db?schema=public
```

> `SMTP_HOST`/`SMTP_PORT` point at MailHog, which needs no credentials. SMTP auth is intentionally disabled in the email service config for local development.

### 4. Install dependencies and run migrations

Run once per service directory (`api-gateway`, `services/auth`, `services/user`, `services/email`, `services/product`, `services/inventory`):

```bash
pnpm install
pnpm migrate:dev     # applies Prisma migrations (all services except api-gateway)
```

### 5. Start the services

Each service is started in its own terminal:

```bash
pnpm dev
```

Start them in this order so downstream dependencies are up: **postgres → email → user → auth → inventory → product → api-gateway**.

## API Reference

All public traffic goes through the gateway at `http://localhost:4000`. Protected routes require an `Authorization: Bearer <accessToken>` header — the gateway validates the token against the auth service and forwards the resolved identity to the upstream service.

### Gateway routes

| Method | Endpoint | Auth | Upstream |
|---|---|---|---|
| `GET` | `/health` | — | Gateway itself |
| `POST` | `/api/auth/register` | — | `POST :4003/auth/register` |
| `POST` | `/api/auth/login` | — | `POST :4003/auth/login` |
| `POST` | `/api/auth/verify-email` | — | `POST :4003/auth/verify-email` |
| `POST` | `/api/auth/verify-access-token` | — | `POST :4003/auth/verify-access-token` |
| `GET` | `/api/products` | — | `GET :4001/products` |
| `GET` | `/api/products/:id` | — | `GET :4001/products/:id` |
| `POST` | `/api/products` | ✅ | `POST :4001/products` |
| `PUT` | `/api/inventories/:id` | ✅ | `PUT :4002/inventories/:id` |
| `GET` | `/api/inventories/:id/details` | ✅ | `GET :4002/inventories/:id/details` |
| `GET` | `/api/users/:id` | ✅ | `GET :4004/users/:id` |

Routing is declarative — `api-gateway/src/routes.json` maps each path and method to an upstream service and an optional middleware chain.

```json
{
  "path": "/products",
  "methods": ["POST"],
  "middlewares": ["auth"]
}
```

### Key workflows

**Registration** — `POST /api/auth/register` creates the auth account, calls the **user** service to create the matching profile, then calls the **email** service to send a 5-digit verification code. The account starts as `PENDING` / `verified: false` and cannot log in until verified.

**Login** — `POST /api/auth/login` verifies the bcrypt password hash, requires a verified and `ACTIVE` account, records the attempt (success or failure, with IP and user agent) in `LoginHistory`, and returns a 15-minute JWT containing `userId`, `email`, `name` and `role`.

**Product creation** — `POST /api/products` creates the product, calls the **inventory** service to create a stock record, and stores the returned `inventoryId` back on the product. `GET /api/products/:id` then joins across services to return stock quantity and an `In Stock` / `Out of Stock` status.

**Stock movement** — `PUT /api/inventories/:id` takes an `actionType` of `IN` or `OUT` plus a quantity, adjusts the level, and appends a history row recording the last and new quantity.

### Internal (service-to-service) endpoints

These are not exposed through the gateway and are called directly by other services:

| Method | Endpoint | Service | Called by |
|---|---|---|---|
| `POST` | `/users` | user :4004 | auth (on registration) |
| `GET` | `/users/:id` | user :4004 | gateway |
| `POST` | `/emails/send` | email :4005 | auth (verification codes) |
| `GET` | `/emails` | email :4005 | — (paginated log, `?page=&limit=`) |
| `POST` | `/inventories` | inventory :4002 | product (on product create) |
| `GET` | `/inventories/:id` | inventory :4002 | product (for stock lookup) |

`GET /users/:id` accepts an optional `?filed=` query parameter (`id` by default, or `authUserId`) to choose which identifier to look up by.

Every service also exposes `GET /health` returning `{"status":"UP"}`.

## Data Models

Five Prisma schemas, one per database.

**auth_db** — `AuthUser` (id, name, email, password hash, role, verified, status), `LoginHistory` (attempt result, IP, user agent, timestamps), `VerificationCode` (code, type, status, expiry). Enums cover roles (`ADMIN`/`USER`), account status, verification status and seven verification-code types.

**user_db** — `User` (authUserId, name, email, optional address and phone).

**product_db** — `Product` (sku, name, description, price, inventoryId, status: `DRAFT`/`PUBLISHED`/`UNLISTED`).

**inventory_db** — `Inventory` (sku, productId, quantity) and `History` (actionType `IN`/`OUT`, quantityChanged, lastQuantity, newQuantity).

**email_db** — `Email` (sender, recipient, subject, body, source, sentAt, status: `PENDING`/`SENT`/`FAILED`).

## Project Structure

```
beast-store-ms/
├── api-gateway/
│   └── src/
│       ├── config.ts          # env loading
│       ├── index.ts           # app setup, middleware, health check
│       ├── middlewares.ts     # JWT auth middleware
│       ├── routes.json        # declarative route table
│       └── utils.ts           # route registration + axios proxy handlers
├── services/
│   ├── auth/
│   │   └── src/
│   │       ├── controllers/   # userLogin, userRegistration, verifyEmail, verifyAccessToken
│   │       ├── utils/         # verification code generator
│   │       ├── prisma.ts      # Prisma client with pg adapter
│   │       └── schemas.ts     # Zod validation schemas
│   ├── user/
│   ├── email/
│   ├── product/
│   └── inventory/
└── docker-compose.yaml        # postgres, pgadmin, mailhog
```

Each service follows the same layout: `src/index.ts` (routes and middleware), `src/controllers/`, `src/schemas.ts` (Zod), `src/prisma.ts`, and `prisma/schema.prisma`.

## Testing

Every service ships a `test.http` file covering its endpoints, including both success and error paths (validation failures, duplicates, unknown IDs, expired tokens). Open the file in VS Code with the [REST Client](https://marketplace.visualstudio.com/items?itemName=humao.rest-client) extension and send requests directly from the editor.

`api-gateway/test.http` runs against the full stack through port 4000 and is the best end-to-end smoke test.

## Security Notes

- The gateway is the **only** component that verifies JWTs. Individual services rely on the gateway plus an origin allowlist — they do not validate tokens themselves, so they should not be exposed publicly.
- The product and inventory services actively restrict requests to `localhost:4000` / `127.0.0.1:4000`, while allowing origin-less requests so internal service-to-service calls work. The auth, user and email services have this check present but commented out, so their CORS is currently open.
- Access tokens expire after 15 minutes and there is no refresh-token flow — users must log in again.
- `.env` files are gitignored. Never commit real secrets; rotate `JWT_SECRET` outside local development.

## Status

**Implemented**

- API gateway with declarative routing, JWT authentication, rate limiting (100 requests / 15 min per IP), Helmet and structured logging
- Auth: registration → email verification → login → token verification, with bcrypt hashing and login history
- Product CRUD (create, list, get by id) with automatic inventory provisioning
- Inventory create, stock in/out updates, and full movement history
- User profile creation and lookup by id or authUserId
- Email sending via SMTP with a persisted send log and pagination

**Not yet implemented**

- Refresh tokens, logout, password reset/change, and whoami — referenced in `test.http` but not built
- Pagination and filtering on `GET /products`
- Update/delete for products and inventory through the gateway
- Dockerfiles and containerized application services (the compose file runs infrastructure only)
