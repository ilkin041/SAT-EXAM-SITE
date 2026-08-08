# T2.2 taxonomy review queue

40 of 280 questions could not be mapped onto the controlled vocabulary. Each carries `skillId = NULL` plus a `TaxonomyReview` row holding the original free-text values verbatim.

Work the queue at `/admin/questions?review=1`. Saving a skill on a question deletes its review row, so this list shrinks as the bank is retagged.

Regenerate the counts with `npm run db:verify-taxonomy`.

| Legacy domain | Legacy skill | Questions | Why |
|---|---|---|---|
| Advanced Math | Area and Volume | 1 | "Area and Volume" belongs to Geometry and Trigonometry, but this question is filed under Advanced Math. |
| Advanced Math | Complex numbers | 1 | "Complex numbers" has no canonical equivalent — it spans more than one skill. |
| Advanced Math | Function notation | 1 | "Function notation" has no canonical equivalent — it spans more than one skill. |
| Advanced Math | Systems of two linear equations in two variables | 3 | "Systems of two linear equations in two variables" belongs to Algebra, but this question is filed under Advanced Math. |
| Advanced Math | _(none)_ | 1 | No skill was ever assigned. |
| Algebra | Equivalent expressions | 1 | "Equivalent expressions" belongs to Advanced Math, but this question is filed under Algebra. |
| Algebra | Evaluating functions | 2 | "Evaluating functions" has no canonical equivalent — it spans more than one skill. |
| Algebra | Functions | 1 | "Functions" has no canonical equivalent — it spans more than one skill. |
| Algebra | _(none)_ | 1 | No skill was ever assigned. |
| Geometry and Trigonometry | Angles and Circles | 1 | "Angles and Circles" has no canonical equivalent — it spans more than one skill. |
| Geometry and Trigonometry | Polygons | 1 | "Polygons" has no canonical equivalent — it spans more than one skill. |
| Information and Ideas | Cross-Text Connections | 1 | "Cross-Text Connections" belongs to Craft and Structure, but this question is filed under Information and Ideas. |
| Information and Ideas | Words in Context | 3 | "Words in Context" belongs to Craft and Structure, but this question is filed under Information and Ideas. |
| Problem-Solving and Data Analysis | Data Analysis | 6 | "Data Analysis" has no canonical equivalent — it spans more than one skill. |
| Problem-Solving and Data Analysis | Data from tables and graphs | 2 | "Data from tables and graphs" has no canonical equivalent — it spans more than one skill. |
| Problem-Solving and Data Analysis | Data representation | 5 | "Data representation" has no canonical equivalent — it spans more than one skill. |
| Problem-Solving and Data Analysis | Linear equations in one variable | 1 | "Linear equations in one variable" belongs to Algebra, but this question is filed under Problem-Solving and Data Analysis. |
| Problem-Solving and Data Analysis | Linear equations in two variables | 1 | "Linear equations in two variables" belongs to Algebra, but this question is filed under Problem-Solving and Data Analysis. |
| Problem-Solving and Data Analysis | Linear inequalities in one variable | 1 | "Linear inequalities in one variable" belongs to Algebra, but this question is filed under Problem-Solving and Data Analysis. |
| Problem-Solving and Data Analysis | Linear models | 4 | "Linear models" belongs to Algebra, but this question is filed under Problem-Solving and Data Analysis. |
| Problem-Solving and Data Analysis | Systems of two linear equations in two variables | 1 | "Systems of two linear equations in two variables" belongs to Algebra, but this question is filed under Problem-Solving and Data Analysis. |
| Problem-Solving and Data Analysis | Two-way tables | 1 | "Two-way tables" has no canonical equivalent — it spans more than one skill. |
