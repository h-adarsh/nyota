# Nyota

> RSVP and headcount for Indian family functions

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-61dafb.svg)](https://react.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-22%20LTS-green.svg)](https://nodejs.org/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0-orange.svg)](https://www.mysql.com/)
[![Drizzle ORM](https://img.shields.io/badge/Drizzle-ORM-C5F74F.svg)](https://orm.drizzle.team/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED.svg)](https://www.docker.com/)
[![Tests](https://img.shields.io/badge/Tests-205%20Passing-brightgreen.svg)]()

**Nyota** (Hindi: *न्योता*, meaning a warm invitation to a celebration, family gathering, or feast) is an event-agnostic, mobile-first RSVP and headcount management platform designed specifically for the dynamics of Indian family functions.

Whether organizing a 5-event Indian wedding (Haldi, Mehendi, Sangeet, Wedding, Reception), a milestone anniversary, a Griha Pravesh (housewarming), or an Upanayana ceremony, Nyota eliminates catering guesswork and coordination chaos by collecting per-function RSVPs through private capability URLs, tracking strict dietary splits, and powering rapid venue gate check-in.

---

## 🌟 Why Nyota?

- **Event-Agnostic by Design**: Unlike generic wedding apps, Nyota's multi-event architecture natively handles any combination of sub-events under a master family function without code changes.
- **Zero Friction for Guests**: No app downloads, no account registrations, and no passwords. Guests open a unique 128-bit unguessable capability URL on mobile and submit their responses in under 30 seconds.
- **WhatsApp-First Distribution**: 1-tap `wa.me` personalized invitation links normalized for Indian (+91) phone numbers with automatic native contact selector fallback.
- **Accurate Catering Headcounts**: Confirmed headcounts strictly separate "Attending" from "Tentative / Maybe" and "Declined", ensuring caterers receive exact headcount figures and Veg / Non-Veg meal breakdowns.
- **Universal NRI & Timezone Handling**: Wall-clock timestamps are anchored to the host venue's IANA timezone (`Asia/Kolkata` by default). Guests opening invitations abroad (US, UK, UAE) always see the local event time rather than their phone's offset.
- **High-Tempo Venue Door Check-In**: Dedicated touch-optimized mobile interface ($\ge 48$px touch targets) with instant household search, 1-tap arrival recording, and transaction-isolated walk-in registration.

---

## 🛠️ Technology Stack & Architecture

- **Backend**: Node.js 22 LTS, Express, TypeScript (strict mode), MySQL 8.0, Drizzle ORM.
- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, React Router v7, Lucide Icons.
- **Security & Authorization**:
  - Multi-tenant tenant-isolation enforced on all database queries (`WHERE wedding.planner_id = session.planner_id`).
  - Argon2id password hashing with custom salt and memory parameters.
  - Server-side sessions with SHA-256 token hashing at rest in MySQL.
  - Hardened cookies: `HttpOnly`, `SameSite=Strict`, `Secure` in production.
  - Cryptographic capability tokens (128-bit entropy via `crypto.randomBytes(16)`).
  - Defense against CSV formula injection (`=`, `+`, `-`, `@` escaped with single quote `'`).
  - Strict Content Security Policy (CSP), `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`.
- **Concurrency & Data Integrity**:
  - Row-level database locks (`SELECT ... FOR UPDATE`) inside atomic transactions for door check-in to prevent race conditions across multiple gate volunteers.
  - Client-side UUID idempotency keys preventing duplicate walk-in submissions over flaky mobile connectivity.
- **Testing**: Vitest & Supertest (**25 server test suites, 205 automated tests** covering unit logic, multi-tenant isolation, authorization barriers, and timezone boundaries).

---

## 📱 WhatsApp Integration & Indian Phone Formatting

- **Automatic +91 Normalization**: Phone numbers are parsed, non-digit characters stripped, and 10-digit standard Indian mobile numbers prepended with `91`.
- **Pre-filled Courteous Greetings**: Planners can dispatch personalized invite links directly via WhatsApp:
  ```
  Namaste Sharma Family! You are cordially invited to our celebrations. Please confirm your attendance and meal preferences using your private Nyota RSVP link:

  https://nyota.app/rsvp/4f9c2d8a1e7b6c5d...
  ```
- **Native Contact Picker Fallback**: When households lack a stored number, the button routes to `https://wa.me/?text=...`, allowing the host to select any WhatsApp contact from their phone.

---

## 🚀 Getting Started

### Prerequisites
- Node.js 20+ LTS
- Docker & Docker Compose (or local MySQL 8.0)

### 1. Clone & Install
```bash
git clone https://github.com/h-adarsh/nyota-multi-event-rsvp-and-headcount-web-platform.git
cd nyota-multi-event-rsvp-and-headcount-web-platform
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
# Edit .env with your MySQL connection string and session secrets
```

### 3. Start Database & Apply Migrations
```bash
# Run local MySQL container
docker run -d --name nyota-mysql -p 3306:3306 -e MYSQL_DATABASE=wedding_rsvp -e MYSQL_ROOT_PASSWORD=root mysql:8.0

# Apply automated migrations
npm run db:migrate --workspace=server

# (Optional) Seed realistic demo data
npm run db:seed --workspace=server
```

### 4. Run Development Servers
```bash
# Launches Vite frontend (:5173) and Express backend (:5001) concurrently
npm run dev
```

---

## 🐳 Production Deployment (Docker / Cloud)

### Multi-Stage Docker Build
```bash
# Build optimized production container
docker build -t nyota:latest .

# Run container with auto-migration on boot
docker run -p 5001:5001 \
  -e DATABASE_URL="mysql://user:password@host:3306/nyota_db" \
  -e SESSION_SECRET="your-64-byte-random-secret" \
  -e TRUST_PROXY=1 \
  -e CLIENT_URL="https://nyota.yourdomain.com" \
  -e ALLOWED_ORIGINS="https://nyota.yourdomain.com" \
  nyota:latest
```

---

## 📄 CV / Resume Entry

*Designed as a portfolio project showcasing production-grade software engineering, security architecture, and distributed state handling.*

### Option 1: Bullets for Full-Stack / Backend Roles
> **Nyota — Multi-Event RSVP & Headcount Web Platform** | *TypeScript, Node.js, Express, React, MySQL 8, Drizzle ORM, Docker, Vitest*  
> [GitHub: github.com/h-adarsh/nyota-multi-event-rsvp-and-headcount-web-platform](https://github.com/h-adarsh/nyota-multi-event-rsvp-and-headcount-web-platform)
> - Architected a production-grade, multi-event RSVP platform for Indian family functions, handling capability-based guest invitations, dietary breakdowns, and mobile venue door check-in.
> - Implemented defense-in-depth security: Argon2id auth, SHA-256 session token hashing at rest, multi-tenant SQL isolation (`WHERE planner_id = ?`), CSV formula injection sanitization, and 128-bit unguessable capability URLs.
> - Solved concurrency race conditions in real-time venue check-in by enforcing MySQL row-level locks (`SELECT ... FOR UPDATE`) in atomic transactions with client-side UUID idempotency for network retries.
> - Built deterministic IANA timezone handling (`Asia/Kolkata`) to preserve local wall-clock event times regardless of guest phone location (eliminating NRI timezone offset bugs).
> - Authored comprehensive test coverage with 205 automated unit and integration tests across 25 suites under Vitest and Supertest; achieved clean 0-error strict TypeScript typechecking and sub-2s Vite production builds.

### Option 2: Compact One-Liner / Resume Summary
> **Nyota (Full-Stack Web App)**: Production-grade multi-event RSVP & catering headcount engine built with React 18, Node.js, Express, MySQL 8, and Drizzle ORM; features capability URLs, Argon2id security, row-level concurrency locking for venue check-in, and 205 automated tests.

---

## 📜 License
MIT License. Created by [Adarsh Singh](https://github.com/h-adarsh).
