# SAT Exam Platform

A SAT-only test-authoring and practice platform built with Next.js 14 App Router,
TypeScript, Prisma/PostgreSQL, Auth.js, Tailwind, KaTeX, and Desmos.

The application includes:

- a global question bank with cloning, bulk editing, JSON import, and duplicate detection;
- adaptive and linear test assembly with reusable question assignments;
- timed student attempts with server-authoritative deadlines;
- SAT scoring, answer review, annotations, and AI explanations;
- groups, private-test access controls, and admin reporting.

## Local setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env` and configure PostgreSQL and Auth.js. Optional
   integrations are documented in that file.

3. Apply migrations and generate the Prisma client:

   ```bash
   npx prisma migrate dev
   npx prisma generate
   ```

4. Optionally seed development data:

   ```bash
   npm run db:seed
   ```

5. Start the application:

   ```bash
   npm run dev
   ```

## Verification

```bash
npm test
npx tsc --noEmit
npm run build
```

## Production deployment

Deployments require the environment variables from `.env.example`. Apply committed
database migrations before serving code that uses the new Prisma schema:

```bash
npx prisma migrate deploy
```

After the Phase 1 metadata migration, backfill normalized question hashes once:

```bash
npm run db:backfill-question-hashes
```

Question images are stored in Cloudinary; Vercel's ephemeral filesystem is not used.

## Important security invariant

`loadAttemptState` deliberately maps database questions to a small `ClientQuestion`
payload. Never replace that allowlist with an object spread: database rows contain
`correctAnswer`, `acceptedAnswers`, and `explanation`. The regression test in
`tests/client-question-payload.test.ts` must remain green.
