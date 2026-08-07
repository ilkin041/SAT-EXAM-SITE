import * as React from "react";
import Link from "next/link";
import { FileQuestion, Inbox, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { GallerySection, Row } from "../gallery-section";

export function EmptyStateSpecimens() {
  return (
    <div>
      <Row label="Full" note="icon, title, description, CTA — the default shape">
        <EmptyState
          icon={Inbox}
          title="No practice tests yet"
          description="Assign a test to this student and it will show up here with their score and time."
          action={
            <Button asChild>
              <Link href="/ui#empty-state">Assign a test</Link>
            </Button>
          }
          className="w-full"
        />
      </Row>

      <Row label="No action" note="use only where the reader genuinely cannot act">
        <EmptyState
          icon={FileQuestion}
          title="No questions match these filters"
          description="Clear the domain filter or widen the difficulty range."
          className="w-full"
        />
      </Row>

      <Row label="Title only">
        <EmptyState title="No results" className="w-full" />
      </Row>

      <Row label="Compact" note="override the padding with className when it sits inside a card">
        <EmptyState
          icon={Users}
          title="This group has no students"
          description="Add students to start tracking their progress together."
          action={
            <Button asChild variant="secondary" size="sm">
              <Link href="/ui#empty-state">Add students</Link>
            </Button>
          }
          className="w-full px-4 py-8"
        />
      </Row>
    </div>
  );
}

export function EmptyStateSection() {
  return (
    <GallerySection
      id="empty-state"
      title="EmptyState"
      description="Every list and table that can be empty gets one. An empty state is an invitation to act, so give it a CTA unless the reader truly has nothing to do — and say what to do next, not that something is missing."
      viewports
    >
      <EmptyStateSpecimens />
    </GallerySection>
  );
}
