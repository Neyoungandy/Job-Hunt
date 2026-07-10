# JOB HUNT

A web-based job search workspace that centralizes discovery, document tailoring, and application tracking in one private account. Instead of automating submissions, it helps candidates aggregate listings, tailor materials per job, and track their pipeline while keeping every real submission in their control.

**CSE 499 capstone project** — Brigham Young University Idaho (BYU-I)

The Next.js application lives in the [`web/`](web/) directory.

## Team

- Andrew Omoniyi Mogbeyiromore
- Hugo Leonardo Lopes Almeida
- Angel David Arevalo Balcazar
- Rommel Aunario
- Victor Chavez

## Features

- **Multi-source job search** — Listings from public APIs and ATS boards (Remotive, Arbeitnow, Remote OK, Greenhouse, Lever, and more)
- **Role-based filtering** — Match scoring against resume content and role interests
- **Resume management** — Import PDF/Word or paste text; one base resume per profile
- **Smart tailoring** — Job-specific resume and cover letter drafts (heuristic + optional OpenAI)
- **Application tracker** — CRM-style pipeline with statuses and follow-up reminders
- **Assisted apply workflow** — Manual or clipboard-assisted mode on employer sites
- **Multi-profile workspace** — Separate resumes and application histories per profile
- **Export** — Download application history as CSV

## Tech stack

| Layer | Technologies |
|-------|--------------|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS 4, SWR |
| Backend | Next.js API Routes, NextAuth.js (Auth.js v5), Prisma |
| Database | MongoDB Atlas |
| Integrations | Job APIs/RSS, Greenhouse & Lever ATS, OpenAI (optional), pdf-parse, mammoth |

## Getting started

From the `web` directory:

```bash
cd web
npm install
npx prisma db push
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment variables

Copy `.env.example` to `.env` inside `web/` and fill in your values:

- `DATABASE_URL` — MongoDB connection string
- `AUTH_SECRET` — random secret for session encryption
- `AUTH_URL` — app URL (e.g. `http://localhost:3000`)

Optional: `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET`, `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET`, `OPENAI_API_KEY`.

## Favorite Quotes

Victor
"Success is where preparation and opportunity meet."

Andrew
"The Lord loves efforts because effort brings rewards."

Rommel
"By the street of 'By-and-By' one arrives at the house of Never." - President Thomas S. Monson, Decisions Determine Destiny (BYU Devotional, Nov.6, 2005)

