# Nool & Nila — Luxury Indian Saree Boutique Platform

> *Threads of tradition. Woven for today.*

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.x-61dafb.svg)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-5.x-646cff.svg)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.x-38bdf8.svg)](https://tailwindcss.com/)
[![Express](https://img.shields.io/badge/Express-5.x-green.svg)](https://expressjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-6.x-2D3748.svg)](https://www.prisma.io/)

A complete, production-grade e-commerce web platform for **Nool & Nila**, an artisanal Indian luxury saree boutique. Built with full-stack TypeScript, rich South Indian temple-luxury aesthetics, a persistent shopping bag, WhatsApp concierge integrations, a concurrency-safe manual order workflow, and an administrative dashboard for catalogue, order, and inventory management.

---

## 1. Key Business Features

- **Luxury Editorial Design System**: Tailored royal palette comprising Warm Ivory (`#F7F1E7`), Deep Maroon (`#702C3B`), Antique Gold (`#B89A62`), and Charcoal (`#292521`) with editorial typography (*Playfair Display* & *Plus Jakarta Sans*).
- **Dynamic Database-Driven Catalogue**: Real database queries supporting search by weave/SKU, category filtering, fabric filtering, price range sliders, stock availability, and sorting.
- **Persistent Shopping Bag**: Supports both anonymous guest sessions (via persistent session UUID) and seamless cart merging upon customer authentication.
- **WhatsApp Concierge Integration**: Native click-to-chat links pre-filled with URL-encoded product details, SKU, price, and cart summaries for direct human styling assistance.
- **Manual Order Request Workflow (Phase 1)**: In accordance with business requirements, online payment gateways are **explicitly deferred**. The platform creates authentic order requests in `PENDING_CONFIRMATION` status (`NOT_APPLICABLE` payment status), allowing the boutique team to verify handloom stock before providing offline payment instructions (NEFT/UPI/Bank Transfer). No fake payment gateways or simulated success screens exist.
- **Comprehensive Admin Dashboard**:
  - Real-time business metrics derived from database records.
  - Saree listing management (creation, editing, categorization, imagery).
  - Order request lifecycle management (`PENDING_CONFIRMATION` -> `CONFIRMED` -> `PROCESSING` -> `SHIPPED` -> `DELIVERED`).
  - Courier tracking number recording and customer delivery notes.
  - Transaction-safe inventory adjustment with mandatory audit reasons.
  - Boutique settings and WhatsApp business configuration.

---

## 2. Monorepo Structure

```
nool-and-nila/
├── apps/
│   ├── web/                     # Frontend client (React 18 + Vite + Tailwind CSS)
│   │   ├── public/              # Brand icons, high-res editorial saree photography
│   │   └── src/
│   │       ├── components/      # AnnouncementBar, Header, Footer, CartDrawer, ProductCard
│   │       ├── context/         # AuthContext, CartContext, WishlistContext
│   │       ├── pages/           # Storefront, Shop, Product Details, Cart, Checkout, Admin
│   │       └── styles/          # Tailwind styling tokens & editorial font setups
│   └── api/                     # Backend API (Node.js + Express 5 + Prisma ORM)
│       ├── prisma/              # Active schema (SQLite for local dev, PostgreSQL for prod)
│       └── src/
│           ├── config/          # Environment & database configuration
│           ├── integrations/    # WhatsApp link builder, Cloudinary / local fallback upload
│           ├── middleware/      # JWT authentication, role guards, error handling
│           ├── modules/         # Auth, Products, Cart, Wishlist, Orders, Admin
│           └── tests/           # Automated API integration test suite
├── packages/
│   └── shared/                  # Shared TypeScript types, Zod schemas, constants, helpers
├── prisma/
│   ├── schema.prisma            # Local development schema (SQLite)
│   ├── schema.postgresql.prisma # Production managed schema (PostgreSQL)
│   └── seed.ts                  # Comprehensive luxury catalogue seed script
├── docs/                        # Complete system architecture and operations documentation
│   ├── architecture.md          # Architecture overview, data model, security design
│   ├── api.md                   # REST API endpoint specifications
│   ├── deployment.md            # Cloud hosting & PostgreSQL migration guide
│   └── operations.md            # Admin bootstrap, SOPs, backups, fulfillment flow
├── .env.example                 # Environment variables template
└── README.md                    # Project walkthrough & quickstart
```

---

## 3. Quickstart & Local Development

### Prerequisites
- Node.js 18+ (tested on Node v22.14.0)
- npm 9+

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to the required locations:
```bash
cp .env.example .env
cp .env.example apps/api/.env
```

### 3. Build the Shared Package
```bash
npm run build --workspace=@nool-and-nila/shared
```

### 4. Initialize Database & Seed Catalogue
```bash
# Generate Prisma Client
npm run prisma:generate --workspace=@nool-and-nila/api

# Push local development schema
npm run prisma:push --workspace=@nool-and-nila/api

# Seed sample categories, realistic luxury sarees, and accounts
npm run seed --workspace=@nool-and-nila/api
```

### 5. Start Development Servers
In separate terminal windows:
```bash
# Start Backend API (runs on http://localhost:5000)
npm run dev --workspace=@nool-and-nila/api

# Start Frontend Storefront (runs on http://localhost:3000)
npm run dev --workspace=@nool-and-nila/web
```

---

## 4. Default Seed Credentials

| Role | Email | Password | Access Level |
|---|---|---|---|
| **Store Administrator** | `admin@noolandnila.com` | `AdminPassword123!` | Full Admin Dashboard (`/admin`), Catalogue, Orders, Inventory |
| **Boutique Customer** | `priya.sharma@example.com` | `Customer123!` | Storefront, Wishlist, Cart, Order History (`/account`) |

*Guest checkout without an account is also fully supported.*

---

## 5. Automated Tests & Quality Verification

### Run the API Test Suite
```bash
npm run test --workspace=@nool-and-nila/api
```
All **14 automated integration tests** pass, verifying:
- Health check endpoint
- Product catalogue retrieval and query filtering
- Add to cart with price recalculation
- Stock limit enforcement (rejecting quantities exceeding stock)
- Manual order request placement (generating unique `NN-YYYY-XXXX` reference)
- Atomic stock reservation and decrementing
- Admin authentication guard (rejecting unauthenticated requests with `401/403`)
- Admin dashboard metrics calculation
- Admin order confirmation workflow
- Admin manual stock adjustments with audit logging

### Browser Subagent E2E Verification
Both customer and administrative user journeys were verified with automated browser agents:
1. **Customer Flow**: Home -> Shop (filter by category) -> Product details -> Add to Bag (Cart Drawer) -> Checkout -> Placed manual order request.
2. **Admin Flow**: Admin login -> Overview metrics -> Inspect customer order -> Confirm order -> Update inventory.

---

## 6. Production Deployment

The project is architected for zero-friction cloud deployment:
- **Managed PostgreSQL**: Supabase, Neon, or AWS RDS using `prisma/schema.postgresql.prisma`.
- **Backend API**: Render, Railway, or Fly.io with Docker or native Node.js.
- **Frontend SPA**: Vercel, Netlify, or Cloudflare Pages.
- **Image CDN**: Cloudinary with automatic fallback to local disk uploads.

For step-by-step instructions, see [`docs/deployment.md`](./docs/deployment.md).

---

## 7. Documentation Index

- [Architecture Design & Security Model](./docs/architecture.md)
- [REST API Specifications](./docs/api.md)
- [Production Cloud Deployment Guide](./docs/deployment.md)
- [Operations, Order Fulfillment SOP & Backups](./docs/operations.md)

---

## 8. License

Private & Proprietary — Developed for **Nool & Nila**. All rights reserved.
