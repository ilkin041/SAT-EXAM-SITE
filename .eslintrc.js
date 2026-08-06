/**
 * ESLint config — the enforcement half of the design policy in CLAUDE.md.
 *
 * Written as `.eslintrc.js` rather than `.eslintrc.json` so each decision can
 * carry its reason. `npm run lint` runs `next lint --no-cache --max-warnings=0`:
 * every rule below is `error` or `off`, never `warn`, so the ratchet cannot be
 * loosened by letting warnings accumulate. `--no-cache` because ESLint's cache
 * keys on file content and config, not on the source of the local rules in
 * `eslint-rules/` — with the cache on, editing a rule silently reuses stale
 * results.
 *
 * Suppressions in source must name the task that removes them
 * (`TODO(T4.1): …`), so the remaining debt stays countable.
 *
 * @type {import("eslint").Linter.Config}
 */
module.exports = {
  root: true,
  extends: ["next/core-web-vitals", "plugin:@typescript-eslint/recommended"],
  parser: "@typescript-eslint/parser",
  parserOptions: { ecmaVersion: 2022, sourceType: "module" },
  plugins: ["@typescript-eslint", "sat"],
  ignorePatterns: ["node_modules/", ".next/", "eslint-rules/", "next-env.d.ts"],

  rules: {
    "@typescript-eslint/no-unused-vars": [
      "error",
      { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrors: "none" },
    ],
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/consistent-type-imports": [
      "error",
      { prefer: "type-imports", fixStyle: "inline-type-imports" },
    ],

    // Only ever fires on a straight apostrophe in prose, which React renders
    // correctly. Four of its seven hits were in the frozen test interface.
    "react/no-unescaped-entities": "off",

    // --- Design policy (CLAUDE.md) -----------------------------------------
    "sat/no-client-page": "error",
    "sat/no-class-constants": "error",
  },

  overrides: [
    {
      files: ["**/*.tsx"],
      rules: {
        "sat/no-raw-color": "error",
        "sat/no-inline-color-style": "error",
        "sat/no-unresolved-tailwind-class": [
          "error",
          { cssFiles: ["src/app/globals.css"], allow: [] },
        ],
      },
    },
    {
      // The Bluebook chrome deliberately ignores the theme; its four hardcoded
      // colours (#f4f5f7, #1a237e, #121212, #1a1a1a) are correct, per CLAUDE.md.
      files: ["src/app/test/attempt/**/*.tsx"],
      rules: {
        "sat/no-raw-color": "off",
        "sat/no-inline-color-style": "off",
      },
    },
    {
      // TODO(T6.1): remove with the test-interface refactor. `useCallback` at
      // test-interface.tsx:210 omits `toast` from its deps. Suppressed here
      // rather than inline because CLAUDE.md forbids editing this file outside
      // a Phase 6/7 task, and a stale-closure fix in the exam runner is exactly
      // the kind of change that needs Playwright coverage first.
      files: ["src/app/test/attempt/**/test-interface.tsx"],
      rules: { "react-hooks/exhaustive-deps": "off" },
    },
    {
      // TODO(T10.2): remove with the performance pass. Two <img> tags render
      // question art uploaded to Cloudinary at unknown dimensions, so moving to
      // next/image needs a sizing strategy first. Suppressed here because a
      // `{/* eslint-disable-next-line */}` inside a `&&` JSX branch is a second
      // child and will not parse.
      files: ["src/app/results/**/review-client.tsx"],
      rules: { "@next/next/no-img-element": "off" },
    },
    {
      files: ["tests/**/*.{ts,tsx}", "scripts/**/*.ts", "prisma/**/*.ts"],
      rules: { "@typescript-eslint/no-explicit-any": "off" },
    },
  ],
};
