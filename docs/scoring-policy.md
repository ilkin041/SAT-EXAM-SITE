# Scoring policy

This platform reports SAT-style practice estimates. It does not reproduce the
College Board's undisclosed operational scoring model.

## Full-length conversion

Reading and Writing uses the built-in 55-entry lookup table for raw scores 0–54.
Math uses the built-in 45-entry lookup table for raw scores 0–44. The values are
based on released digital SAT practice-test scoring guides. The former nullable
`Test.scoringTable` column was never writable or validated, so it was removed;
all tests now use one auditable policy.

## Adaptive lower route

If the Module 2 actually served for a section has difficulty `EASY`, that
section's scaled score is capped at **600**. The uncapped lookup still runs first,
then `min(convertedScore, 600)` is applied. A `HARD` or `MIXED` Module 2 is not
capped.

The 600 cap is a conservative platform calibration. It is deliberately not
described as an official College Board curve because College Board does not
publish a reusable lower-route conversion table.

## Partial and short attempts

- A score requires at least one scored question in both R&W and Math. Otherwise
  no section scores, total, or performance tier are shown.
- Only exactly 54 R&W and 44 Math questions are labeled full length.
- Any other nonzero two-section question count is labeled a short-test estimate.
  The proportional lookup is shown, but no performance tier is assigned.

These rules apply to student results, dashboards, admin views, and CSV exports.
