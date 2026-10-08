#Small Shop POS

### Products & Inventory — `/api/products`
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/products` | User | List products (`?search=`, `?category_id=`, `?low_stock=true`) |
| `GET` | `/api/products/:id` | User | Get single product details |
| `POST` | `/api/products` | Admin | Create new product |
| `PUT` | `/api/products/:id` | Admin | Update product details |
| `PATCH`| `/api/products/:id/stock` | Admin | Adjust stock level (`{ delta, reason }`) |
| `DELETE`| `/api/products/:id` | Admin | Soft delete product |
### Categories — `/api/categories`
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/categories` | User | List categories with product counts |
| `POST` | `/api/categories` | Admin | Create category |
| `PUT` | `/api/categories/:id` | Admin | Rename category |
| `DELETE`| `/api/categories/:id` | Admin | Delete category |
### Customers — `/api/customers`
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/customers` | User | List customers with visit count & total spent |
| `GET` | `/api/customers/:id` | User | Get customer details |
| `POST` | `/api/customers` | User | Create customer profile (`{ name, phone, email }`) |
| `PUT` | `/api/customers/:id` | User | Update customer profile |
| `DELETE`| `/api/customers/:id` | Admin | Delete customer record |
### Sales & Orders — `/api/sales`
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/sales` | User | Process a sale transaction & deduce stock |
| `GET` | `/api/sales` | User | Search sales ledger (`?from=`, `?to=`, `?status=`) |
| `GET` | `/api/sales/:id` | User | Get itemized invoice details |
| `POST` | `/api/sales/:id/void` | Admin | Void sale transaction & restore product stock |
### Analytics & Reports — `/api/reports`
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/reports/summary` | Admin | Get revenue KPIs, day series, top products, payment stats (`?from=`, `?to=`) |
### Utility
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/health` | Public | System uptime & health check |
---
## 🔒 Security & Concurrency Notes
- **ACID Transactions**: Sale creation, checkout, and voiding run within SQLite atomic transactions (`db.transaction`) to prevent negative stock and race conditions.
- **Server-Side Pricing**: Product prices, taxes, and sub-totals are computed and validated server-side from current database values.
- **Password Security**: Passwords are saved with bcrypt hashing (cost factor 10) and never returned across API responses.
- **Rate Limiting**: Login endpoint includes IP-based rate limiting to protect against brute-force attacks.
