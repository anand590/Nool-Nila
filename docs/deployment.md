# Nool & Nila — Production Deployment Guide

This guide describes how to deploy the **Nool & Nila** saree e-commerce boutique application to managed production environments using **managed PostgreSQL**, a **Node.js/Express backend**, and a **Vite/React single-page application frontend**.

---

## 1. Architecture Overview

```
                      [ Custom Domain: noolandnila.com ]
                                      │
                   ┌──────────────────┴──────────────────┐
                   ▼                                     ▼
        [ Frontend: Vercel / Netlify ]       [ Backend API: Render / Railway ]
        React 18 SPA (Static Edge CDN)       Node.js + Express REST Service
                   │                                     │
                   └──────────────────┬──────────────────┘
                                      │
                   ┌──────────────────┼──────────────────┐
                   ▼                  ▼                  ▼
        [ Managed PostgreSQL ]   [ Cloudinary CDN ]  [ WhatsApp Business ]
          (Supabase / Neon)       (Saree Imagery)    (Direct Concierge)
```

---

## 2. Prerequisites & Third-Party Services

| Service | Recommended Provider | Purpose |
|---|---|---|
| **Database** | Supabase, Neon, AWS RDS, or Railway | Managed PostgreSQL with SSL |
| **API Server** | Render, Railway, DigitalOcean, or Fly.io | Node.js container or web service |
| **Storefront** | Vercel, Netlify, or Cloudflare Pages | Edge-distributed static bundle hosting |
| **Image CDN** | Cloudinary | Auto-optimized, responsive saree photography |
| **DNS / Domain** | Cloudflare, Namecheap, or GoDaddy | DNS records, SSL/TLS certificates |

---

## 3. Database Setup: Managed PostgreSQL

1. **Create a Managed Database**:
   - Create a PostgreSQL database instance on [Supabase](https://supabase.com/) or [Neon](https://neon.tech/).
   - Copy the Connection String URI with SSL enabled:
     ```
     postgresql://postgres:[PASSWORD]@[HOST]:5432/[DB_NAME]?sslmode=require
     ```

2. **Run Migrations on PostgreSQL**:
   From your local terminal or CI/CD pipeline, point Prisma to the PostgreSQL schema and migrate:
   ```bash
   # Set the production connection string
   export DATABASE_URL="postgresql://postgres:[PASSWORD]@[HOST]:5432/[DB_NAME]?sslmode=require"

   # Push schema to PostgreSQL
   npx prisma db push --schema=prisma/schema.postgresql.prisma

   # Seed initial categories and editorial saree listings
   npm run seed --workspace=@nool-and-nila/api
   ```

---

## 4. Backend API Deployment (e.g. Render / Railway)

### Environment Variables
Configure the following in your hosting provider's dashboard:

```ini
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://postgres:[PASSWORD]@[HOST]:5432/[DB_NAME]?sslmode=require
SESSION_SECRET=generate-a-cryptographically-secure-random-64-char-string
APP_URL=https://www.noolandnila.com
API_URL=https://api.noolandnila.com
WHATSAPP_BUSINESS_NUMBER=919876543210
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
EMAIL_PROVIDER_API_KEY=optional_sendgrid_or_resend_key
EMAIL_FROM=orders@noolandnila.com
```

### Build & Start Commands
- **Root Directory**: `.`
- **Build Command**:
  ```bash
  npm install && npm run build --workspace=@nool-and-nila/shared && npm run build --workspace=@nool-and-nila/api
  ```
- **Start Command**:
  ```bash
  npm run start --workspace=@nool-and-nila/api
  ```
- **Health Check Path**: `/api/v1/health`

---

## 5. Frontend Storefront Deployment (e.g. Vercel / Netlify)

### Environment Variables
```ini
VITE_API_URL=https://api.noolandnila.com/api/v1
VITE_WHATSAPP_NUMBER=919876543210
VITE_STORE_NAME="Nool & Nila"
```

### Build Settings
- **Root Directory**: `apps/web` (or root with workspace build)
- **Framework Preset**: Vite
- **Build Command**:
  ```bash
  npm run build --workspace=@nool-and-nila/web
  ```
- **Output Directory**: `apps/web/dist`
- **SPA Routing Rewrite Rule**:
  Configure single-page app rewrites so routes like `/shop`, `/products/:slug`, and `/admin` redirect to `/index.html`:
  - **For Vercel (`vercel.json`)**:
    ```json
    {
      "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
    }
    ```
  - **For Netlify (`_redirects`)**:
    ```
    /*    /index.html   200
    ```

---

## 6. Domain, DNS & SSL Configuration

When pointing your custom domain (e.g., `noolandnila.com`):

1. **Frontend (Apex & www)**:
   - `A` record `@` pointing to Vercel/Netlify load balancer (e.g. `76.76.21.21`).
   - `CNAME` record `www` pointing to `cname.vercel-dns.com`.
2. **Backend API (`api.noolandnila.com`)**:
   - `CNAME` record `api` pointing to your backend host (e.g. `nool-and-nila-api.onrender.com`).
3. **CORS Configuration**:
   Ensure `APP_URL` in the backend environment matches `https://www.noolandnila.com` so browsers allow authenticated cookie sharing (`credentials: include`).
4. **SSL/TLS**:
   Both Vercel/Netlify and Render automatically issue free, auto-renewing Let's Encrypt SSL/TLS certificates.

---

## 7. Zero-Downtime Verification Checklist

After deploying:
- [ ] Verify `https://api.noolandnila.com/api/v1/health` returns `healthy`.
- [ ] Verify homepage loads from CDN with luxury typography and imagery.
- [ ] Test filtering and pagination on `/shop`.
- [ ] Add a saree to the cart drawer and verify guest persistence.
- [ ] Submit an order request and verify the generated reference (e.g. `NN-2026-XXXX`).
- [ ] Test the WhatsApp click-to-chat button opens with pre-filled order reference.
- [ ] Log in to `/admin` using bootstrap administrator credentials and verify order review.
