import * as React from "react";
import Link from "next/link";
import { Plus, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { GallerySection, Row } from "../gallery-section";

export function PageHeaderSpecimens() {
  return (
    <div>
      <Row label="Title only">
        <PageHeader title="Question bank" className="mb-0 w-full" />
      </Row>

      <Row label="With description">
        <PageHeader
          title="Question bank"
          description="280 questions across Reading & Writing and Math. Filter by domain, difficulty or test."
          className="mb-0 w-full"
        />
      </Row>

      <Row label="With actions" note="stacks under the title below sm">
        <PageHeader
          title="Question bank"
          description="280 questions across Reading & Writing and Math."
          actions={
            <>
              <Button asChild variant="secondary">
                <Link href="/ui#page-header">
                  <Upload className="h-4 w-4" aria-hidden />
                  Import
                </Link>
              </Button>
              <Button asChild>
                <Link href="/ui#page-header">
                  <Plus className="h-4 w-4" aria-hidden />
                  New question
                </Link>
              </Button>
            </>
          }
          className="mb-0 w-full"
        />
      </Row>

      <Row label="Long title" note="min-w-0 lets it wrap instead of pushing the actions off">
        <PageHeader
          title="Official SAT Practice Test 4 — Module 2 results"
          description="Every attempt on this module, newest first."
          actions={
            <Button asChild variant="secondary">
              <Link href="/ui#page-header">Export CSV</Link>
            </Button>
          }
          className="mb-0 w-full"
        />
      </Row>
    </div>
  );
}

export function PageHeaderSection() {
  return (
    <GallerySection
      id="page-header"
      title="PageHeader"
      description="Admin page chrome: title, optional description, an accent rule, and an actions slot that drops below the title under sm. The accent rule is solid rather than a gradient so the ten routes that render it cost no gradient budget. Note that the component owns the page's <h1> — the duplicated headings you see here are an artefact of showing four specimens twice, not the component's own behaviour."
      viewports
    >
      <PageHeaderSpecimens />
    </GallerySection>
  );
}
