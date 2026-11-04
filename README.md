# RupKotha (রূপকথা) — Cosmetics & Skincare E-Commerce Platform

[![Next.js](https://img.shields.io/badge/Next.js-16.4.2-black?style=flat&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.3.0-blue?style=flat&logo=react)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?style=flat&logo=tailwind-css)](https://tailwindcss.com/)
[![Node.js](https://img.shields.io/badge/Node.js-v20%2B-green?style=flat&logo=node.js)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-4.21.2-lightgrey?style=flat&logo=express)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16%2B-336791?style=flat&logo=postgresql)](https://www.postgresql.org/)
[![Cloudinary](https://img.shields.io/badge/Cloudinary-Media_CDN-3448C5?style=flat&logo=cloudinary)](https://cloudinary.com/)
[![Resend](https://img.shields.io/badge/Resend-Transactional_Email-black?style=flat&logo=resend)](https://resend.com/)

**RupKotha (রূপকথা)** is a production-grade, full-stack e-commerce platform purpose-built for the premium cosmetics, skincare, and beauty market in Bangladesh. It features a high-performance Next.js App Router storefront, an Express.js backend powered by raw PostgreSQL queries (Zero-Prisma architecture), atomic inventory locking, a strict order fulfillment state machine, and a back-office administration suite.

---

## 🌟 Core Feature Overview

### 🛍️ Customer Storefront (`client/`)
- **Modern Responsive Design:** Crafted with Tailwind CSS v4, supporting seamless dark and light modes with zero flash.
- **Dynamic Hero Slider (V2):** Responsive multi-device banners with picture-tag breakpoint optimization, LCP priority preloading, and accessible controls.
- **Variant Matrix & Swatches:** Real-time color swatches, shades, volumes, and sizes with dynamic starting price (`From ৳...`), image synchronization, and out-of-stock combination dimming.
- **Full-Text & Trigram Search:** Powered by PostgreSQL `to_tsvector` and `pg_trgm` word-similarity matching, providing live product autocomplete, fuzzy matching, and typo tolerance.
- **Cart & Wishlist Engine:** Persistent customer cart and guest cart in `localStorage` with automatic post-login synchronization; real-time wishlist toggling across all catalog cards.
- **Streamlined Checkout:** Clean single-page checkout supporting Cash on Delivery (COD) and coupon discounts, calculating live shipping rates based on canonical delivery zones.
- **Customer Account Hub:** Unified profile management, saved address book with Bangladeshi administrative divisions, order tracking with visual fulfillment timelines, self-service cancellation, avatar image updates, direct password setup, and OAuth account linking.

### 🛡️ Administration Suite (`/admin`)
- **Operations Dashboard:** Live KPI metrics, delivered-sales chart with selectable time horizons (Today, 7 days, 30 days, 90 days), Dhaka-local time bucket calculations, and inventory warnings.
- **Product & Variant Builder:** 2-step intuitive wizard for configuring options (shades, volumes, formulas), bulk-pricing (regular, sale, and internal cost), live profit margin badges, and Cloudinary multi-image streaming.
- **Order State Machine:** Server-enforced order progression (`pending` → `confirmed` → `processing` → `shipped` → `delivered`, with `cancelled` and `returned` branches); atomic inventory deduction upon order confirmation with automatic restoral upon cancellation; transition audit notes recorded per change.
- **Simplified Two-Zone Delivery:** Canonical delivery configuration for **Inside Dhaka** and **Outside Dhaka** flat fees and estimated business days.
- **Marketing & Promotions:** Coupon engine supporting Percentage, Fixed Amount, and Free Delivery rules with minimum order spend and usage limits.
- **Catalog Management:** Brand and Collection management with slug auto-generation, logo/banner uploads, dirty-state validation, and safe deletion guards.
- **Customer Account Control:** Searchable customer registry, profile editing, account active/blocked toggles, and formula-injection-safe CSV export.
- **Central Audit Logging:** Comprehensive administrative audit trail tracking every catalog, pricing, order, delivery, and security change with previous/new value diffs.
- **Universal Table Pagination:** Standardized pagination across all admin tables featuring items-per-page selectors (`10`, `20`, `50`), windowed page buttons with smart ellipsis, and responsive layouts.

---

## 🏗️ Architecture & Engineering Invariants

```mermaid
graph TD
    User["Customer / Admin Browser"] -->|HTTPS / Next.js Routing| ClientApp["Frontend (Next.js 16 + React 19)"]
    ClientApp -->|HTTP-only Cookies / REST API| ExpressServer["Backend (Express.js on Node.js)"]
    ClientApp -->|Optimized Images| CloudinaryCDN["Cloudinary CDN"]
    
    ExpressServer -->|Parameterized Raw SQL| PostgresDB[("PostgreSQL 16+ Database")]
    ExpressServer -->|Buffer Stream Upload| CloudinaryAPI["Cloudinary REST API"]
    ExpressServer -->|Transactional Outbox| ResendAPI["Resend Email API"]
    ExpressServer -->|OAuth 2.0 PKCE| GoogleAuth["Google Identity Services"]
```

1. **JavaScript Only:** Vanilla JavaScript throughout (ES modules on frontend, CommonJS on backend). Never TypeScript.
2. **Zero Prisma Policy:** 100% pure parameterized SQL executed through node-postgres (`pg.Pool`). No heavy ORM abstraction layers.
3. **Cloudinary Streaming Pipeline:** Images are buffered in Express memory via `multer.memoryStorage()` (5 MB cap) and streamed directly to Cloudinary via `Readable` streams. No temporary files touch the local filesystem.
4. **Authoritative Server Pricing:** The frontend never determines final order totals, delivery fees, or discounts. All pricing is recalculated and validated server-side.
5. **Transactional Outbox Emailing:** Order notifications and verification emails are written transactionally to `notification_deliveries` and processed asynchronously by `notificationWorker.js` via `FOR UPDATE SKIP LOCKED`.

---

## 📂 Project Directory Structure

```text
cosmetics-ecommerce/
├── client/                     # Frontend Application (Next.js App Router)
│   ├── src/
│   │   ├── app/                # App Router Routes & Pages
│   │   │   ├── admin/          # Admin Back-Office (/admin, products, orders, etc.)
│   │   │   ├── auth/           # Login, Register, Verify Email, Reset Password
│   │   │   ├── brands/         # Storefront Brands Directory
│   │   │   ├── cart/           # Shopping Cart Page
│   │   │   ├── checkout/       # Checkout & Zone Selection
│   │   │   ├── collections/    # Storefront Collections Catalog
│   │   │   ├── orders/         # Customer Orders & Tracking Timeline
│   │   │   ├── products/       # Product Details Page (PDP)
│   │   │   ├── profile/        # Customer Profile & Settings
│   │   │   ├── search/         # Faceted Search Results
│   │   │   └── page.js         # Storefront Homepage
│   │   ├── components/         # Modular React Components
│   │   │   ├── admin/          # Admin Navbar, Sidebar, Modals, Pagination
│   │   │   ├── common/         # Shared Logos, Buttons, Badges
│   │   │   ├── home/           # Hero Banner, Best Sellers, Showcase
│   │   │   ├── layout/         # Header Navbar, Mobile Drawer, Footer
│   │   │   └── product/        # Swatches, Gallery Lightbox, Tabs
│   │   ├── context/            # AuthContext, NotificationContext, WishlistContext
│   │   ├── services/           # Frontend API Clients
│   │   └── proxy.js            # Edge Route Protection Guard
│   ├── public/                 # Static Assets & SVGs
│   └── package.json
│
├── server/                     # Backend API Server (Node.js + Express)
│   ├── config/                 # Database Pool, Cloudinary, Resend, Redis
│   ├── controllers/            # Request Handlers (Products, Orders, Auth, etc.)
│   ├── middlewares/            # Authentication, Roles, Upload, Rate Limiters
│   ├── repositories/           # Raw Parameterized SQL Queries
│   ├── routes/                 # Express API Route Definitions
│   ├── services/               # Business Logic, Outbox, Order State Machine
│   ├── sql/                    # PostgreSQL DDL Schemas & Migrations
│   ├── scripts/                # Database Seeders, Setup & Test Suites
│   ├── utils/                  # JWT Signing, Slug Utilities, Audit Helpers
│   ├── index.js                # Express Server Entrypoint
│   └── package.json
│
├── prd.md                      # Product Requirements & RBAC Matrix
├── stack.md                    # Technology Stack & Environment Reference
├── schema.md                   # Database ERD & Exact Table Definitions
├── tokens.md                   # Design System Tokens & Security Schemas
├── state.md                    # Current Implementation Status & Test History
└── plan.md                     # Master Implementation Roadmap
```

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js:** v20.x or v24.x LTS
- **PostgreSQL:** v16 or newer running locally or on a cloud provider
- **Cloudinary Account:** For product image storage
- **Resend Account:** For transactional email delivery (optional in local development)

---

### 2. Database Initialization
Create a PostgreSQL database named `cosmetics-ecommerce`:

```sql
CREATE DATABASE "cosmetics-ecommerce";
```

Apply the database schema and extensions in order:

```bash
psql -d cosmetics-ecommerce -f server/sql/schema.sql
psql -d cosmetics-ecommerce -f server/sql/hero_sliders_v2.sql
psql -d cosmetics-ecommerce -f server/sql/order_workflow_v2.sql
```

*(Alternatively, run the automated setup migration scripts located in `server/scripts/`)*

---

### 3. Backend Setup (`server/`)

1. Navigate to the server directory:
   ```bash
   cd server
   npm install
   ```

2. Create a `.env` file in `server/` (refer to `server/.env.example`):
   ```env
   PORT=5000
   CLIENT_URL=http://localhost:3000
   SERVER_URL=http://localhost:5000
   DATABASE_URL=postgres://postgres:password@localhost:5432/cosmetics-ecommerce

   # Authentication Tokens (generate random 64-character strings)
   JWT_SECRET=your_jwt_secret_key_here
   ACCESS_TOKEN_SECRET=your_access_token_secret_here
   REFRESH_TOKEN_SECRET=your_refresh_token_secret_here
   ACCESS_TOKEN_EXPIRES_IN=15m
   REFRESH_TOKEN_EXPIRES_IN=7d

   # Cloudinary Media Storage
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret

   # Transactional Email (Resend)
   RESEND_API_KEY=re_your_api_key
   RESEND_FROM_EMAIL=onboarding@resend.dev

   # Google OAuth 2.0 (Optional)
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/oauth/google/callback
   ```

3. Seed Initial Catalog Data:
   ```bash
   node scripts/seedBrands.js
   node scripts/seedCollections.js
   node scripts/seedProducts.js
   node scripts/migrateDeliveryTwoTypes.js
   ```

4. Start the Express development server:
   ```bash
   npm run dev
   ```
   *Server will run at `http://localhost:5000`.*

---

### 4. Frontend Setup (`client/`)

1. Navigate to the client directory:
   ```bash
   cd ../client
   npm install
   ```

2. Create `.env.local` in `client/`:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:5000
   ```

3. Start the Next.js development server:
   ```bash
   npm run dev
   ```
   *Storefront will run at `http://localhost:3000`.*

4. Production Build Verification:
   ```bash
   npm run build
   ```

---

## ⚙️ Environment Variables Reference

| Environment | Variable Name | Required | Description |
| :--- | :--- | :---: | :--- |
| **Backend** | `PORT` | Yes | Port Express listens on (default: `5000`). |
| **Backend** | `DATABASE_URL` | Yes | PostgreSQL connection URI. |
| **Backend** | `CLIENT_URL` | Yes | Frontend origin allowed for CORS with credentials. |
| **Backend** | `ACCESS_TOKEN_SECRET` | Yes | Secret key used for signing 15-minute access JWTs. |
| **Backend** | `REFRESH_TOKEN_SECRET`| Yes | Secret key used for signing refresh tokens stored in HTTP-only cookies. |
| **Backend** | `CLOUDINARY_*` | Yes | Cloudinary credentials (`CLOUD_NAME`, `API_KEY`, `API_SECRET`). |
| **Backend** | `RESEND_API_KEY` | Optional | Resend API key for outbound order receipts and password reset emails. |
| **Backend** | `GOOGLE_*` | Optional | OAuth 2.0 credentials for Google One-Tap and Social Sign-in. |
| **Frontend** | `NEXT_PUBLIC_API_URL` | Yes | Base URL pointing to the Express backend (`http://localhost:5000`). |

---

## 🧪 Test Suites & Quality Assurance

The codebase includes automated test suites covering authentication, order workflows, and catalog invariants:

```bash
# Test Unified Authentication & Account Linking
node server/scripts/testUnifiedAuth.js

# Test Order Workflow & State Machine Transitions
node server/scripts/testOrderWorkflow.js

# Test Audit Logging Event Dispatches
node server/scripts/testAuditLogging.js

# Test Email Verification Anti-Enumeration & Expiry
node server/scripts/testEmailVerificationStrategy.js

# Next.js Production Build Test
npm run build --prefix client
```

---

## 📄 License & Attribution

Developed with ❤️ for **RupKotha Cosmetics & Skincare**  
**Author:** Syed Fahad Mahmud  
**License:** Proprietary / All Rights Reserved

