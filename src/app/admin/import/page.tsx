import { PageHeader } from "@/components/ui/page-header";
import { ImportForm } from "./import-form";

export const metadata = { title: "Import — Admin" };

export default function ImportPage() {
  return (
    <>
      <PageHeader
        title="Import"
        description="Bulk-load tests or questions from a JSON file or paste the contents directly."
      />
      <ImportForm />
    </>
  );
}
