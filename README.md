# SAT Practice Platform

Self-hosted digital-SAT-style practice testing platform (Bluebook-style UX clone). Built with Next.js 14 (App Router), Prisma, PostgreSQL, NextAuth v5, Tailwind + shadcn/ui, KaTeX, and the Desmos calculator API.

> Educational use only. Replicates the *functionality and UX patterns* of Bluebook — not its branding or any College Board content. All test content is user-supplied.

## Status

**Step 1 (foundation) complete.** Next.js project, Prisma schema, and seed script are in place.

## Setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Configure environment**

   Copy `.env.example` to `.env` and fill in your `DATABASE_URL` (PostgreSQL) and `AUTH_SECRET`:

   ```bash
   cp .env.example .env
   # generate a secret: openssl rand -base64 32
   ```

3. **Run migrations**

   ```bash
   npx prisma migrate dev
   ```

   (The repo ships with migrations for the initial schema, the `breakStartedAt`
   field used by the break timer, and the `Annotation` model for passage
   highlights.)

4. **Seed the database**

   Creates one admin, one student, and imports `sample-test.json` as a complete adaptive test:

   ```bash
   npm run db:seed
   ```

   Default accounts:

   | Role    | Email                  | Password   |
   | ------- | ---------------------- | ---------- |
   | Admin   | admin@example.com      | admin123   |
   | Student | student@example.com    | student123 |

5. **Start the dev server**

   ```bash
   npm run dev
   ```

6. **Run the tests**

   ```bash
   npm test
   ```

   Covers adaptive routing logic (`tests/adaptive-routing.test.ts`) and
   SPR / answer matching (`tests/answer-matching.test.ts`).

## Project layout

```
prisma/
  schema.prisma     # Full data model: User, Test, Section, Module, Question,
                    # TestAttempt, Answer, ModuleResult
  seed.ts           # Seeds admin + student + sample test
sample-test.json    # Demo import payload (adaptive, R&W + Math)
src/
  app/              # Next.js App Router
  lib/prisma.ts     # Shared Prisma client
```

## Roadmap

Build order (per spec):

1. ✅ Foundation: Next.js, Prisma, seed
2. Auth (NextAuth v5, credentials, role-protected routes)
3. Admin question CRUD with preview
4. Admin test builder
5. JSON import with validation
6. Test-taking flow (linear)
7. Adaptive routing
8. Math tools (Desmos, KaTeX, reference sheet, SPR)
9. R&W resizable two-column layout
10. Results page + scoring
11. Polish (keyboard shortcuts, fullscreen, dark mode)
