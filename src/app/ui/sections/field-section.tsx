"use client";

import * as React from "react";
import Link from "next/link";
import { Eye } from "lucide-react";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { GallerySection, Row, Stack } from "../gallery-section";

/**
 * Client, because `Field` calls `useId` — which is also why rendering these
 * specimens twice (one pane per theme) is safe: every instance generates its
 * own id, so the label association in the dark pane points at the dark pane's
 * own input.
 */

export function FieldSpecimens() {
  return (
    <div>
      <Row label="Label + control">
        <Stack>
          <Field label="Email">
            <Input type="email" placeholder="you@example.com" />
          </Field>
        </Stack>
      </Row>

      <Row label="Hint" note="wired through aria-describedby">
        <Stack>
          <Field label="Name" hint="Used in the welcome message and the nav.">
            <Input type="text" placeholder="Ada Lovelace" />
          </Field>
        </Stack>
      </Row>

      <Row label="Error" note="sets aria-invalid; the red border follows it">
        <Stack>
          <Field
            label="Email"
            error="Enter an email address that includes a domain, like name@school.edu."
          >
            <Input type="email" defaultValue="student@example" />
          </Field>
        </Stack>
      </Row>

      <Row label="Hint and error together" note="the hint states the rule, the error says which one broke">
        <Stack>
          <Field
            label="New password"
            hint="Minimum 8 characters."
            error="Passwords don't match."
          >
            <Input type="password" defaultValue="short" />
          </Field>
        </Stack>
      </Row>

      <Row label="Optional" note="required fields carry no asterisk — the exceptions are marked instead">
        <Stack>
          <Field label="Name" optional>
            <Input type="text" placeholder="Your name" />
          </Field>
        </Stack>
      </Row>

      <Row label="Label action" note="right of the label row">
        <Stack>
          <Field
            label="Password"
            action={
              <Link
                href="/forgot-password"
                className="text-caption font-medium text-primary hover:underline"
              >
                Forgot your password?
              </Link>
            }
          >
            <Input type="password" />
          </Field>
        </Stack>
      </Row>

      <Row label="Render prop" note="for a control inside a wrapper">
        <Stack>
          <Field label="Password" hint="The toggle sits inside the field box.">
            {(control) => (
              <div className="relative">
                <Input {...control} type="password" className="pr-10" />
                <span
                  className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground"
                  aria-hidden
                >
                  <Eye className="h-4 w-4" />
                </span>
              </div>
            )}
          </Field>
        </Stack>
      </Row>

      <Row label="Any control" note="Select takes the same props">
        <Stack>
          <Field label="Section" hint="Filters the question bank.">
            {(control) => (
              <Select defaultValue="MATH">
                <SelectTrigger {...control} placeholder="All sections" />
                <SelectContent>
                  <SelectItem value="MATH">Math</SelectItem>
                  <SelectItem value="READING_WRITING">
                    Reading and Writing
                  </SelectItem>
                </SelectContent>
              </Select>
            )}
          </Field>
        </Stack>
      </Row>
    </div>
  );
}

export function FieldSection() {
  return (
    <GallerySection
      id="field"
      title="Field"
      description="Label, control, hint and error, wired together: id/htmlFor, aria-describedby covering both messages, aria-invalid following the error. A single child is cloned with those props; a control that lives inside a wrapper takes the render-prop form and spreads them itself. required is behaviour only — no asterisk, mark the optional fields instead."
      viewports
    >
      <FieldSpecimens />
    </GallerySection>
  );
}
