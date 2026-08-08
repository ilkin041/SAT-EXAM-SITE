import type { Metadata } from "next";
import { NewTestForm } from "./new-test-form";
import { pageMetadata } from "@/lib/site";

export const metadata: Metadata = pageMetadata({ title: "New test — Admin", path: "/admin/tests/new", noindex: true });

export default function NewTestPage() {
  return (
    <div className="max-w-xl">
      <h1 className="mb-6 text-h1">New test</h1>
      <p className="mb-6 text-body text-muted-foreground">
        Creating a test auto-scaffolds the standard SAT structure: Reading & Writing (Module 1 + 2)
        and Math (Module 1 + 2). Adaptive tests get both an EASY and HARD Module 2 in each section.
        You'll add questions in the next step.
      </p>
      <NewTestForm />
    </div>
  );
}
