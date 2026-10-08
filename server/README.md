# Small Shop POS — Backend API

A production-quality REST API for a small-shop Point-of-Sale system built with **Node.js 20+**, **Express 4**, and **better-sqlite3**.

---

## Prerequisites

- **Node.js 20+** — [nodejs.org](https://nodejs.org)
- **npm 9+** (bundled with Node)

---

## Installation

```bash
# From the repo root
cd server
npm install
```

---

## Environment Setup

Copy the example file and edit as needed:

```bash
cp .env.example .env
```

| Variable | Default | Description |
|---|---|---|
| `PORT` | `4000` | HTTP listen port |
| `NODE_ENV` | `development` | `development` or `production` |
| `JWT_SECRET` | *(required in prod)* | HS256 signing secret — **change this!** |
| `JWT_EXPIRES_IN` | `8h` | Token lifetime |
| `DB_FILE` | `./data/pos.db` | Path to the SQLite database file |
| `TAX_RATE` | `0.05` | Sales tax rate (e.g. `0.05` = 5%) |
| `BCRYPT_ROUNDS` | `10` | bcrypt cost factor |
| `CORS_ORIGIN` | `http://localhost:5173` | Allowed CORS origin (React dev server) |

---

## Database Migration

```bash
npm run migrate          # Apply schema (idempotent)
npm run migrate -- --reset  # DROP db file, then re-apply schema
```

---

## Seed Demo Data

```bash
npm run seed
```

Populates: 2 users, 6 categories, 28 products, 5 customers, ~40 historical sales.  
Safe to re-run (idempotent).

---

## Reset Everything

```bash
npm run reset   # migrate --reset  +  seed
```

---

## Run the Server

```bash
npm run dev     # nodemon (auto-restart on file changes)
npm start       # production
```

The server auto-migrates the schema on every startup, so a fresh clone works without running `migrate` first.

---

## API Endpoint Reference

Base URL: `http://localhost:4000/api`

### Utility
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/health` | public | `{ status, uptime }` |

### Auth — `/api/auth`
| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/register` | admin (or public if no users exist) | `{ name, email, password, role? }` |
| POST | `/login` | public | `{ email, password }` → `{ token, user }` |
| GET | `/me` | any | `{ user }` |
| GET | `/users` | admin | `{ data: [...users] }` |
| PATCH | `/users/:id` | admin | `{ name?, role?, is_active?, password? }` |

### Categories — `/api/categories`
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/` | any | `{ data: [{ id, name, product_count, created_at }] }` |
| POST | `/` | admin | `{ name }` → `201` |
| PUT | `/:id` | admin | `{ name }` → `200` |
| DELETE | `/:id` | admin | `204` |

### Products — `/api/products`
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/` | any | Query: `search`, `category_id`, `low_stock`, `include_inactive`, `page`, `limit` |
| GET | `/:id` | any | Single product |
| POST | `/` | admin | `{ sku, name, category_id, price, cost, stock_qty, low_stock_threshold }` |
| PUT | `/:id` | admin | Full update |
| PATCH | `/:id/stock` | admin | `{ delta, reason? }` |
| DELETE | `/:id` | admin | Soft delete → `204` |

### Customers — `/api/customers`
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/` | any | Query: `search`, `page`, `limit`. Includes `visit_count`, `total_spent` |
| GET | `/:id` | any | Single customer |
| POST | `/` | any | `{ name, phone?, email? }` |
| PUT | `/:id` | any | Update fields |
| DELETE | `/:id` | admin | Hard delete |

### Sales — `/api/sales`
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/` | any | Query: `from`, `to`, `status`, `user_id`, `customer_id`, `page`, `limit` |
| GET | `/:id` | any | Full sale with `items[]` |
| POST | `/` | any | Create sale (see below) |
| POST | `/:id/void` | admin | Void sale + restore stock |

### Reports — `/api/reports`
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/summary` | admin | Query: `from`, `to` (YYYY-MM-DD). Defaults to last 7 days |

---

## Demo Credentials

| Role | Email | Password |
|---|---|---|
| Admin | `admin@shop.test` | `admin123` |
| Cashier | `cashier@shop.test` | `cashier123` |

---

## curl Examples

### 1. Login as admin

```bash
curl -s -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@shop.test","password":"admin123"}' | jq .
```

Response:
```json
{
  "token": "<jwt>",
  "user": { "id": 1, "name": "Ada Admin", "email": "admin@shop.test", "role": "admin" }
}
```

### 2. Create a sale

```bash
TOKEN="<paste jwt here>"

curl -s -X POST http://localhost:4000/api/sales \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "items": [{ "product_id": 1, "quantity": 2 }],
    "payment_method": "cash",
    "amount_paid": 10.00
  }' | jq .
```

---

## Response Envelope

- **List:** `{ "data": [...], "meta": { "page", "limit", "total", "pages" } }`
- **Single:** `{ "data": { ... } }`
- **Auth login:** `{ "token": "...", "user": { ... } }`
- **Error:** `{ "error": { "message": "...", "code": "MACHINE_CODE", "details": null } }`

---

## Security Notes

- All passwords are bcrypt-hashed (cost 10) — never logged or returned.
- Every protected route requires a valid JWT Bearer token.
- All money (subtotal, tax, total, change) is computed server-side from DB prices.
- Sale creation and voiding run inside `db.transaction()` with a concurrent-safe stock guard.
- Login is rate-limited to 10 attempts per IP per 15 minutes.
- Stack traces are never sent to clients in production.
