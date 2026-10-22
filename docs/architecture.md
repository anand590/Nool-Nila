# Nool & Nila — System Architecture Documentation

## 1. Overview & Business Domain

**Nool & Nila** is a luxury Indian handloom saree e-commerce boutique platform built with high-editorial aesthetics, artisan craftsmanship storytelling, and dual manual order workflows (Website Order Request and WhatsApp Concierge).

Online payment gateway integration is deliberately deferred in this phase. The application implements an authentic manual order request workflow where orders are placed in `PENDING_CONFIRMATION` status with `NOT_APPLICABLE` payment status, allowing the boutique team to inspect handloom inventory before sharing offline payment instructions (NEFT/UPI/Bank Transfer).

---

## 2. Monorepo Topology

```
nool-and-nila/
├── apps/
│   ├── web/                    # React 18, Vite, Tailwind CSS, TanStack Query
│   │   ├── public/             # Brand favicon, editorial saree photography
│   │   └── src/
│   │       ├── app/            # App shell, routing
│   │       ├── components/     # Header, Footer, CartDrawer, ProductCard, WhatsAppButton
│   │       ├── context/        # AuthContext, CartContext, WishlistContext
│   │       ├── lib/            # API client with persistent guest session ID
│   │       ├── pages/          # Home, Shop, Collections, Details, Cart, Checkout, Admin
│   │       └── styles/         # Tailwind CSS & Playfair Display / Plus Jakarta Sans
│   └── api/                    # Node.js, Express, TypeScript, Prisma ORM
│       ├── prisma/             # Active schema (SQLite/PostgreSQL) & seed script
│       └── src/
│           ├── config/         # App, database, and integration configs
│           ├── integrations/   # WhatsApp link builder, Cloudinary / local fallback upload
│           ├── middleware/     # JWT authentication, role guards, centralized error handler
│           ├── modules/        # Auth, Products, Cart, Wishlist, Orders, Admin
│           ├── tests/          # Node.js automated test runner suite
│           ├── app.ts          # Express app configuration
│           └── server.ts       # HTTP listener
├── packages/
│   └── shared/                 # Shared TypeScript interfaces, Zod schemas, constants, helpers
├── prisma/
│   ├── schema.prisma           # Active local development schema
│   ├── schema.postgresql.prisma# Production managed PostgreSQL schema
│   └── seed.ts                 # Database seed script
├── docs/                       # Architecture, API, Deployment, Operations guides
├── .env.example                # Documented environment variables template
└── README.md                   # Quickstart and walkthrough
```

---

## 3. Technology Stack

| Layer | Technology | Rationale |
|---|---|---|
| **Frontend Framework** | React 18 + Vite | Blazing-fast build times, high performance, clean bundle output |
| **Language** | TypeScript (Strict) | End-to-end type safety shared across client and server |
| **Styling** | Tailwind CSS | Editorial luxury palette (`#F7F1E7`, `#702C3B`, `#B89A62`, `#292521`) |
| **Server State** | TanStack Query v5 | Automatic caching, refetching, and optimistic UI |
| **Backend API** | Node.js + Express | RESTful architecture, robust middleware ecosystem |
| **Database ORM** | Prisma ORM | Parameterized SQL queries, automated migrations, type-safe models |
| **Database** | SQLite (Dev) / PostgreSQL (Prod) | Zero-friction local development + scalable managed PostgreSQL |
| **Authentication** | JWT + HTTP-only Cookies | Secure, XSS-resistant session management |
| **Asset Storage** | Cloudinary + Local Fallback | CDN image hosting with local disk fallback when keys are absent |
| **Sales Channel** | WhatsApp Click-to-Chat | Native URL-encoded enquiry links for products, carts, and orders |

---

## 4. Brand Design Tokens

- **Ivory Background (`#F7F1E7`)**: Represents unbleached raw silk and temple sanctum warmth.
- **Deep Maroon (`#702C3B`)**: Signature royal south Indian bridal silk hue.
- **Antique Gold (`#B89A62`)**: Tested zari thread accent, used sparingly for prestige.
- **Charcoal Text (`#292521`)**: High contrast, accessible typography.
- **Serif Typography**: *Playfair Display* for brand mark, hero headers, and craftsmanship highlights.
- **Sans-Serif Typography**: *Plus Jakarta Sans* for navigation, specifications, checkout, and admin tables.

---

## 5. Security & Concurrency Design

1. **Monetary Precision**: All currency values are stored as integers in **paise** (1 INR = 100 paise) to prevent floating-point inaccuracies.
2. **Atomic Inventory Reservation**: During checkout submission, Prisma interactive transactions (`prisma.$transaction`) atomically revalidate prices, check stock availability, decrement inventory, and write audit movement logs.
3. **Role-Based Access Control**: Sensitive routes under `/api/v1/admin/*` enforce server-side validation ensuring `req.user.role === 'ADMIN'`.
4. **No Plaintext Passwords**: Passwords are encrypted using `bcryptjs` with salt rounds = 10.
5. **No Payment Gateway Phase 1**: Card details, UPI PINs, or bank secrets are never collected or stored.
