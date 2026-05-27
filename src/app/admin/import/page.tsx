import { ImportForm } from "./import-form";

export const metadata = { title: "Import test — Admin" };

export default function ImportPage() {
  return (
    <>
      <h1 className="mb-2 text-3xl font-semibold tracking-tight">Import</h1>
      <p className="mb-6 max-w-2xl text-sm text-muted-foreground">
        Two modes: <span className="font-medium">Full Test Import</span> builds a new test from
        a JSON tree of sections/modules/questions (matching <code>sample-test.json</code>).{" "}
        <span className="font-medium">Question Bank Import</span> adds standalone questions to the
        bank — JSON with a top-level <code>{`"import": "questions"`}</code> field and a{" "}
        <code>questions</code> array.
      </p>
      <ImportForm />
    </>
  );
}
