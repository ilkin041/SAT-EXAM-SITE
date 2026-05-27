import { QuestionForm } from "../_components/question-form";

export const metadata = { title: "New question — Admin" };

export default function NewQuestionPage() {
  return (
    <>
      <h1 className="mb-2 text-3xl font-semibold tracking-tight">New question</h1>
      <p className="mb-6 max-w-2xl text-sm text-muted-foreground">
        Adds a question to the global bank. To make it part of a test, open that test's
        detail page and use <span className="font-medium">Add from bank</span> to assign it
        to a specific module.
      </p>
      <QuestionForm mode="create" />
    </>
  );
}
