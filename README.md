# Nyota — Multi-Event RSVP & Catering Headcount Platform

## Frictionless WhatsApp-First Invitations, Dietary Splits, and Real-Time Venue Door Check-In for Indian Celebrations

**Nyota** (Hindi: *न्योता*, meaning an affectionate invitation to a family feast, wedding, or celebration) is an open-source, mobile-first RSVP and catering headcount platform engineered specifically for the complexities of Indian multi-event celebrations. Traditional event tools fail when families manage multiple functions over several days (Haldi, Mehendi, Sangeet, Wedding, Reception), assign distinct guest tiers per ceremony, track strict dietary preferences (Vegetarian, Non-Vegetarian, and Jain), and handle high-volume arrival bursts at the venue gate. Nyota removes all guest friction with private 128-bit capability links distributed via WhatsApp, deterministic catering tallies with configurable buffer sliders, and touch-optimized mobile door check-in with row-level database locking.

---

### Tech Stack

- **Client** - React 18, Vite, TypeScript, Tailwind CSS (Sana Editorial Design System), Lucide Icons
- **Server** - Node.js 22 LTS, Express, MySQL 8.0, Drizzle ORM, Argon2id, SHA-256 Session Hashing, Vitest, Docker

---

## Architecture & System Workflow

The diagram below outlines the core flow—from celebration setup and WhatsApp-first distribution to guest RSVP submission, catering aggregation, and venue door check-in:

```mermaid
flowchart TD
    subgraph Host_Planner["Event Planners & Hosts"]
        A["Planner Dashboard (React 18 / Sana Design)"]
        B["Guest Registry & CSV Import Engine"]
        C["WhatsApp Link Generator (wa.me)"]
    end

    subgraph Guest_Touchpoint["Guests (Parents, Families, Relatives)"]
        D["Private 128-Bit Capability URL (No Login Needed)"]
        E["Per-Function RSVP (Attending / Maybe / Decline)"]
        F["Dietary Allocation (Veg / Non-Veg / Jain Notes)"]
    end

    subgraph Server_API["Nyota Express Backend"]
        G["Tenant Boundary & Session Guard"]
        H["RSVP & Capability Token Service"]
        I["Concurrency & Row Locking (FOR UPDATE)"]
        J["Real-Time Catering Aggregator"]
    end

    subgraph Storage["Data Layer"]
        K[("MySQL 8.0 Database (Drizzle ORM)")]
    end

    subgraph Venue_Entrance["Venue Door Operations"]
        L["Mobile Door Check-In (Touch-Optimized)"]
        M["Walk-In Registration Modal"]
    end

    A --> B --> C
    C -->|"Send WhatsApp Invitation"| D
    D --> E --> F
    F -->|"POST /api/rsvp/:token"| H
    H --> K

    K --> J
    J -->|"Headcount Analytics & Buffer Slider"| A

    L -->|"1-Tap Arrival Stepper"| I
    M -->|"Log Unexpected Arrival"| I
    I -->|"Atomic Serializable Transaction"| K
```

---

## Installation and Usage Instructions (For End-Users)

If you are an event planner, host, or evaluator who wants to run and explore Nyota on your local machine without modifying source code, follow these steps:

### 1. Quick Launch (Run Locally)

Ensure you have **Node.js (v20+ LTS)** and **Docker Desktop** installed. In your terminal:

```bash
# 1. Clone the repository
git clone https://github.com/h-adarsh/nyota-multi-event-rsvp-and-headcount-web-platform.git
cd nyota-multi-event-rsvp-and-headcount-web-platform

# 2. Start local MySQL database container
docker run -d --name nyota-mysql -p 3306:3306 \
  -e MYSQL_DATABASE=wedding_rsvp \
  -e MYSQL_ROOT_PASSWORD=root \
  mysql:8.0

# 3. Install dependencies & initialize database
npm install
npm run db:migrate --workspace=server
npm run db:seed --workspace=server

# 4. Start the application
npm run dev
```

Once running, access the local services in your browser:
- **Planner Dashboard & Venue Check-In:** [http://localhost:5173](http://localhost:5173)
- **Backend API Health Check:** [http://localhost:5001/api/health](http://localhost:5001/api/health)

*(Alternatively, run the production container directly via Docker: `docker build -t nyota:latest . && docker run -d -p 5001:5001 -p 5173:5173 nyota:latest`).*

### 2. Demo Planner Credentials

You can sign in to the planner portal immediately using the pre-seeded demo account:
- **Email:** `planner@demo.com`
- **Password:** `password123`

---

### 3. How to Use the System as a Consumer

#### Setting Up Multi-Event Functions & Guest Lists
1. Sign in to the **Planner Dashboard** (`/dashboard`).
2. Create your celebration functions (e.g., *Haldi*, *Mehendi*, *Sangeet*, *Wedding Ceremony*, *Grand Reception*) with venue addresses, dates, and times. Schedules are automatically anchored to the venue's timezone (`Asia/Kolkata`).
3. Add households individually or upload a guest list using the **CSV Import** button (supports auto-deduplication, contact validation, and joint-family shared-phone overrides).
4. Use the **Invitation Matrix** to select which households are invited to which sub-events.

#### Distributing Invitations via WhatsApp
1. Open the **Guest Registry** view.
2. Click the WhatsApp icon next to any household. Nyota automatically normalizes Indian mobile numbers (+91) and formats a courteous, personalized greeting containing the household's unique 128-bit private link.
3. If a contact number is missing, the button automatically falls back to the native WhatsApp share intent (`wa.me/?text=...`) so you can select any contact from your phone.

#### How Guests RSVP (Zero Friction)
1. Guests tap their private link (e.g., `http://localhost:5173/rsvp/<capability-token>`).
2. **No app downloads or passwords required.**
3. For each invited function, guests select **Attending**, **Tentative / Maybe**, or **Decline**.
4. Attending guests specify exact headcount breakdowns between **Vegetarian** and **Non-Vegetarian** meals, with an optional field for Jain preferences or allergies.
5. Responses are idempotent—guests can revisit their link at any time to revise counts.

#### Real-Time Catering Headcount & Buffer Slider
1. Open the **Headcount Dashboard** to view live meal breakdowns per function.
2. Adjust the **Planning Estimate Buffer Slider** (0% to 100%) to calculate caterer safety margins:
   $$\text{Planning Estimate} = \text{Confirmed} + \left(\text{Tentative} \times \text{Buffer\%}\right)$$
3. Inspect stale response indicators to identify tentative guests who have not confirmed within 7 days.

#### High-Tempo Venue Door Check-In
1. Door volunteers open `/checkin` on any smartphone or tablet ($\ge 48$px touch-friendly buttons).
2. Search by household surname, contact name, or phone digits.
3. Use the **1-Tap Arrival Stepper** to log actual arriving party sizes against expected RSVPs.
4. If unexpected guests arrive, tap **Walk-In Registration** to log them atomically without disrupting the guest list tally.

---

#### Consuming via REST API (Direct Client Usage)
End-users and external integrations can interact directly with the REST endpoints:

- **Submit an RSVP (Guest Capability Endpoint):**
  ```bash
  curl -i -X POST http://localhost:5001/api/rsvp/4f9c2d8a1e7b6c5d9e0f1a2b3c4d5e6f \
    -H "Content-Type: application/json" \
    -d '{
      "responses": [
        {
          "function_id": "func_sangeet_01",
          "status": "attending",
          "veg_count": 3,
          "non_veg_count": 1,
          "dietary_notes": "1 plate strict Jain"
        }
      ]
    }'
  ```

- **Record Door Check-In (with Concurrency Protection & Idempotency):**
  ```bash
  curl -i -X POST http://localhost:5001/api/checkin/record \
    -H "Content-Type: application/json" \
    -H "Idempotency-Key: 9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d" \
    -d '{
      "household_id": "hh_sharma_01",
      "function_id": "func_reception_01",
      "arrived_count": 4
    }'
  ```

---

## Installation and Usage Instructions (For Contributors)

Follow these technical instructions to clone the repository, configure local workspaces, execute Drizzle migrations, and run the automated test suite.

### Prerequisites

- **Node.js:** v20.0.0+ LTS (Tested on v22)
- **npm:** v10.0.0+
- **Database:** Local MySQL 8.0 server or Docker Desktop

---

### Step 1: Clone the Repository & Install Dependencies

```bash
git clone https://github.com/h-adarsh/nyota-multi-event-rsvp-and-headcount-web-platform.git
cd nyota-multi-event-rsvp-and-headcount-web-platform
npm install
```

---

### Step 2: Environment Configuration

Create a root `.env` file:
```bash
cp .env.example .env
```

Configure your environment variables:
```env
PORT=5001
CLIENT_URL=http://localhost:5173
DATABASE_URL=mysql://root:root@127.0.0.1:3306/wedding_rsvp
SESSION_SECRET=replace_with_a_secure_random_64_character_hex_string
NODE_ENV=development
```

---

### Step 3: Database Provisioning & Migrations

1. Ensure MySQL is running locally (or launch via Docker):
   ```bash
   docker run -d --name nyota-mysql -p 3306:3306 \
     -e MYSQL_DATABASE=wedding_rsvp \
     -e MYSQL_ROOT_PASSWORD=root \
     mysql:8.0
   ```

2. Run Drizzle ORM schema migrations:
   ```bash
   npm run db:migrate --workspace=server
   ```

3. Seed demo wedding functions, households, and sample RSVPs:
   ```bash
   npm run db:seed --workspace=server
   ```

---

### Step 4: Start Development Servers

Launch both the Express backend API and the Vite React frontend concurrently:

```bash
npm run dev
```

- **Frontend Client:** [http://localhost:5173](http://localhost:5173) (Vite HMR)
- **Backend API:** [http://localhost:5001](http://localhost:5001)

---

### Step 5: Running Automated Tests & Quality Checks

Run the complete Vitest test suite (covering unit tests, integration routes, multi-tenant isolation, row-level locks, and timezone conversions):

```bash
# Run 25 test suites (205 unit & integration tests)
npm test

# Run TypeScript typechecks across both client and server workspaces
npm run typecheck

# Verify production client build
npm run build --workspace=client
```

---

## Contributor Expectations

We welcome contributions to Nyota! To preserve code quality, security boundaries, and architectural purity, all contributors must observe the following ground rules:

### 1. Workflow & Issue-First Protocol
- Before starting work on major features, UI redesigns, or database schema changes, **open an issue** to discuss the motivation and technical approach.
- Only submit PRs that reference an active issue.

### 2. Branch Naming Conventions
- `feature/<short-description>` — New capabilities (e.g., `feature/sms-twilio-fallback`)
- `fix/<short-description>` — Bug fixes (e.g., `fix/phone-dedup-regex`)
- `docs/<short-description>` — Documentation improvements (e.g., `docs/api-specs`)
- `refactor/<short-description>` — Code refactoring without behavioral changes

### 3. Commit Message Standards
Follow [Conventional Commits](https://www.conventionalcommits.org/):
- `feat: add dietary summary export to Excel`
- `fix: resolve race condition in door check-in counter`
- `test: add integration test for capability token expiration`
- `docs: update contributor setup steps for Docker`

### 4. Architectural & Security Ground Rules
- **Multi-Tenant Boundary Enforcement:** Every database query touching planner data must strictly enforce tenant scoping (`WHERE wedding.planner_id = session.planner_id`).
- **Door Check-In Concurrency:** Check-in arrival increments must execute inside MySQL serializable transactions using `SELECT ... FOR UPDATE` row locks to prevent simultaneous check-in race conditions.
- **Client Idempotency:** Any route that modifies arrival tallies or RSVPs must support `Idempotency-Key` headers.
- **Password & Token Security:** Passwords must be hashed using Argon2id; session tokens must be stored as SHA-256 hashes. Capability tokens must always use `crypto.randomBytes(16).toString('hex')`.
- **CSV Injection Defense:** Spreadsheet imports and exports must sanitize formula triggers (`=`, `+`, `-`, `@`) by prepending a single quote (`'`).
- **Editorial Design Purity:** Frontend components must strictly adhere to the Sana Agents design tokens (Paper White `#ffffff`, Ink Black `#0a1217`, Electric Lime `#cdfe00`, `rounded-[24px]` cards, and `rounded-full` pills).

### 5. Pull Request Checklist
1. All 205+ Vitest tests must pass (`npm test`).
2. Typecheck must complete with zero errors (`npm run typecheck`).
3. No environment secrets or database dumps committed.
4. Link the relevant issue (`Closes #<issue_number>`).