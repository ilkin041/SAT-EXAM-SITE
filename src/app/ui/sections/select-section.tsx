"use client";

import * as React from "react";
import { Filter } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
} from "@/components/ui/select";
import { GallerySection, Row } from "../gallery-section";

/**
 * The one client section in the gallery. Every other primitive renders as a
 * server component, but a Select that cannot open is not a specimen — the
 * whole point of the swap away from `<select>` is the keyboard behaviour, so
 * these have to be live.
 *
 * As elsewhere in the gallery, specimens carry no `id`/`htmlFor`: the section
 * renders twice, once per theme pane, and a duplicated id is invalid HTML. The
 * triggers are named with `aria-label` instead.
 */
function Domains() {
  return (
    <SelectContent>
      <SelectItem value="">All domains</SelectItem>
      <SelectSeparator />
      <SelectGroup>
        <SelectLabel>Reading &amp; Writing</SelectLabel>
        <SelectItem value="craft-and-structure">Craft and Structure</SelectItem>
        <SelectItem value="information-and-ideas">Information and Ideas</SelectItem>
        <SelectItem value="standard-english">Standard English Conventions</SelectItem>
      </SelectGroup>
      <SelectSeparator />
      <SelectGroup>
        <SelectLabel>Math</SelectLabel>
        <SelectItem value="algebra">Algebra</SelectItem>
        <SelectItem value="advanced-math">Advanced Math</SelectItem>
        <SelectItem value="geometry">Geometry and Trigonometry</SelectItem>
      </SelectGroup>
    </SelectContent>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="w-full max-w-xs">
      <span className="mb-1.5 block text-caption font-semibold text-foreground">
        {label}
      </span>
      {children}
      {hint && (
        <span className="mt-1.5 block text-caption text-destructive">{hint}</span>
      )}
    </div>
  );
}

export function SelectSpecimens() {
  return (
    <div>
      <Row label="Default" note="type “ma” with it open — Radix type-ahead">
        <Field label="Domain">
          <Select defaultValue="">
            <SelectTrigger aria-label="Domain" />
            <Domains />
          </Select>
        </Field>
      </Row>

      <Row label="Placeholder" note="no defaultValue — nothing is selected yet">
        <Field label="Domain">
          <Select>
            <SelectTrigger aria-label="Domain, unset" placeholder="Select a domain" />
            <Domains />
          </Select>
        </Field>
      </Row>

      <Row label="Sizes" note="sm is h-9, default is h-10 — same rhythm as Button">
        <Select defaultValue="algebra" className="max-w-[12rem]">
          <SelectTrigger size="sm" aria-label="Domain, small" />
          <Domains />
        </Select>
        <Select defaultValue="algebra" className="max-w-[12rem]">
          <SelectTrigger aria-label="Domain, default size" />
          <Domains />
        </Select>
      </Row>

      <Row label="Error" note="border-destructive plus a message below, as Input does">
        <Field label="Domain" hint="Pick the domain this question belongs to.">
          <Select>
            <SelectTrigger
              state="error"
              aria-invalid
              aria-label="Domain, invalid"
              placeholder="Select a domain"
            />
            <Domains />
          </Select>
        </Field>
      </Row>

      <Row label="Disabled">
        <Field label="Domain">
          <Select defaultValue="algebra" disabled>
            <SelectTrigger aria-label="Domain, disabled" />
            <Domains />
          </Select>
        </Field>
      </Row>

      <Row label="Leading icon">
        <Field label="Domain">
          <Select defaultValue="">
            <SelectTrigger
              aria-label="Domain, with icon"
              icon={<Filter className="h-4 w-4" />}
            />
            <Domains />
          </Select>
        </Field>
      </Row>

      <Row label="Clearable" note="pick something, then use the ✕ to return to the placeholder">
        <Field label="Domain">
          <Select>
            <SelectTrigger
              clearable
              clearLabel="Clear domain"
              aria-label="Domain, clearable"
              placeholder="Any domain"
            />
            <Domains />
          </Select>
        </Field>
      </Row>

      <Row
        label="In a form"
        note="`name` mirrors the value into the form — the empty row submits an empty param, not the sentinel"
      >
        <form className="w-full max-w-xs">
          <Field label="Domain">
            <Select name="domain" defaultValue="">
              <SelectTrigger aria-label="Domain, named" />
              <Domains />
            </Select>
          </Field>
        </form>
      </Row>

      <Row label="Required" note="submitting with nothing chosen is blocked by the browser">
        <form className="flex w-full max-w-xs items-end gap-2">
          <Field label="Test">
            <Select name="testId" required>
              <SelectTrigger aria-label="Test, required" placeholder="Select a test" />
              <SelectContent>
                <SelectItem value="test-1">Practice Test 1</SelectItem>
                <SelectItem value="test-2">Practice Test 2</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <button
            type="submit"
            className="h-10 shrink-0 rounded-lg border border-border bg-card px-4 text-caption font-semibold"
          >
            Assign
          </button>
        </form>
      </Row>

      <Row label="Long list" note="scroll buttons appear once the list overflows">
        <Field label="Practice test">
          <Select defaultValue="">
            <SelectTrigger aria-label="Practice test" />
            <SelectContent>
              <SelectItem value="">All tests</SelectItem>
              {Array.from({ length: 24 }, (_, i) => (
                <SelectItem key={i} value={`test-${i + 1}`}>
                  Practice Test {i + 1}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </Row>
    </div>
  );
}

export function SelectSection() {
  return (
    <GallerySection
      id="select"
      title="Select"
      description={
        "Radix Select behind an Input-matching shell — same 40px height, radius, " +
        "border and focus treatment, so the two line up in a filter bar. Two things " +
        'differ from a bare Radix wrapper: an item value of "" is legal here and means ' +
        "the empty “All …” row (Radix bans it, so the wrapper swaps in a private " +
        "sentinel), and passing `name` renders a mirror input so GET filter forms and " +
        "server actions still receive the value. “Nothing selected” is `undefined`, " +
        "which is what shows the placeholder."
      }
      viewports
    >
      <SelectSpecimens />
    </GallerySection>
  );
}
