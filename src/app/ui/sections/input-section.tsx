import * as React from "react";
import { AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { GallerySection, Row } from "../gallery-section";

/**
 * Every field here wraps its <input> in a <label> rather than pairing
 * `htmlFor` with an `id`. The gallery renders each specimen twice — once per
 * theme pane — and a duplicated `id` is invalid HTML that breaks the very
 * label association the specimen is meant to demonstrate.
 */
function Field({
  label,
  error,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
}) {
  return (
    <label className="block w-full max-w-sm">
      <span className="mb-1.5 block text-caption font-semibold text-foreground">
        {label}
      </span>
      <Input
        aria-invalid={error ? true : undefined}
        className={cn(
          error && "border-destructive focus-visible:ring-destructive",
          className,
        )}
        {...props}
      />
      {error && (
        <span className="mt-1.5 flex items-start gap-1.5 text-caption text-destructive">
          <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
          {error}
        </span>
      )}
    </label>
  );
}

export function InputSpecimens() {
  return (
    <div>
      <Row label="Default">
        <Field label="Full name" placeholder="Ada Lovelace" />
      </Row>

      <Row label="Filled" note="defaultValue — the gallery renders no client state">
        <Field label="Email" type="email" defaultValue="student@example.com" />
      </Row>

      <Row label="Disabled">
        <Field label="Email" type="email" defaultValue="student@example.com" disabled />
      </Row>

      <Row label="Error" note="border-destructive + aria-invalid, message below">
        <Field
          label="Email"
          type="email"
          defaultValue="student@example"
          error="Enter an email address that includes a domain, like name@school.edu."
        />
      </Row>

      <Row label="Focus visible" note="press Tab — border swap, 20% ring, plus the global outline">
        <Field label="Search questions" type="search" placeholder="Linear equations" />
      </Row>

      <Row label="Types" note="numbers are mono via .tabular">
        <Field label="Password" type="password" defaultValue="correcthorse" />
        <Field label="Target score" type="number" defaultValue={1400} className="tabular" />
        <Field label="Test date" type="date" defaultValue="2026-11-07" className="tabular" />
      </Row>

      <Row label="Read only">
        <Field label="Attempt ID" defaultValue="atmpt_8f21c9" readOnly className="tabular" />
      </Row>
    </div>
  );
}

export function InputSection() {
  return (
    <GallerySection
      id="input"
      title="Input"
      description="One 40px input, no variants — it matches Button's default height so the two line up in a row. There is no error variant: the convention is `border-destructive focus-visible:ring-destructive` plus `aria-invalid`, shown below. The input keeps the global :focus-visible outline on purpose, because the border swap and a 20%-opacity ring are not a 3:1 indicator on their own."
    >
      <InputSpecimens />
    </GallerySection>
  );
}
