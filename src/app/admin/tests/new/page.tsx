import { NewTestForm } from "./new-test-form";

export const metadata = { title: "New test — Admin" };

export default function NewTestPage() {
  return (
    <div className="max-w-xl">
      <h1 className="mb-6 text-3xl font-semibold tracking-tight">New test</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Creating a test auto-scaffolds the standard SAT structure: Reading & Writing (Module 1 + 2)
        and Math (Module 1 + 2). Adaptive tests get both an EASY and HARD Module 2 in each section.
        You'll add questions in the next step.
      </p>
      <NewTestForm />
    </div>
  );
}
