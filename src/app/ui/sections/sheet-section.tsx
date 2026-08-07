import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetBody,
  SheetClose,
  SheetContent,
  SheetFooter,
  SheetTrigger,
} from "@/components/ui/sheet";
import { GallerySection, Row } from "../gallery-section";

/**
 * The drag gesture is touch-only, so it cannot be judged with a mouse. Use the
 * 360px iframe under this section with device emulation on, or a phone.
 */
export function SheetSpecimens() {
  return (
    <div>
      <Row
        label="Bottom"
        note="the phone pattern — drag the header down to dismiss"
      >
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="secondary" size="sm">
              Filters
            </Button>
          </SheetTrigger>
          <SheetContent
            side="bottom"
            title="Filter questions"
            description="Narrows the bank without leaving the page."
          >
            <SheetBody>
              <ul className="space-y-2 pb-2">
                {[
                  "Reading & Writing",
                  "Math",
                  "Unassigned",
                  "Missing explanation",
                  "Flagged as too easy",
                  "Flagged as too hard",
                ].map((label) => (
                  <li
                    key={label}
                    className="rounded-lg border border-border bg-paper-sunk px-3 py-2.5 text-body"
                  >
                    {label}
                  </li>
                ))}
              </ul>
            </SheetBody>
            <SheetFooter>
              <SheetClose asChild>
                <Button variant="secondary">Clear</Button>
              </SheetClose>
              <SheetClose asChild>
                <Button>Show 42 questions</Button>
              </SheetClose>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </Row>

      <Row
        label="Right"
        note="the desktop pattern — a detail pane beside a table"
      >
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="secondary" size="sm">
              Attempt detail
            </Button>
          </SheetTrigger>
          <SheetContent
            side="right"
            title="Attempt 4f21c8"
            description="Practice Test 4 · finished 12 minutes ago"
          >
            <SheetBody>
              <dl className="space-y-3 pb-2">
                {[
                  ["Reading & Writing", "540"],
                  ["Math", "610"],
                  ["Total", "1150"],
                  ["Time used", "2h 06m"],
                ].map(([term, value]) => (
                  <div
                    key={term}
                    className="flex items-baseline justify-between border-b border-border/60 pb-2"
                  >
                    <dt className="text-body text-muted-foreground">{term}</dt>
                    <dd className="tabular text-body font-semibold">{value}</dd>
                  </div>
                ))}
              </dl>
            </SheetBody>
            <SheetFooter>
              <SheetClose asChild>
                <Button variant="secondary">Close</Button>
              </SheetClose>
              <Button>Open full review</Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </Row>

      <Row
        label="Long body"
        note="the body scrolls and the page behind it does not — Radix locks the body while a sheet is open"
      >
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="secondary" size="sm">
              All domains
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" title="Pick a domain">
            <SheetBody>
              <ul className="space-y-2 pb-2">
                {Array.from({ length: 30 }, (_, index) => (
                  <li
                    key={index}
                    className="rounded-lg border border-border bg-paper-sunk px-3 py-2.5 text-body"
                  >
                    Domain {index + 1}
                  </li>
                ))}
              </ul>
            </SheetBody>
          </SheetContent>
        </Sheet>
      </Row>

      <Row
        label="Hidden title"
        note="still announced; only the visible header is dropped"
      >
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="secondary" size="sm">
              Actions
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" hideTitle title="Question actions">
            <SheetBody>
              <ul className="space-y-2 pb-2">
                {["Duplicate", "Move to another module", "Export as JSON"].map(
                  (label) => (
                    <li key={label}>
                      <SheetClose asChild>
                        <Button variant="ghost" className="w-full justify-start">
                          {label}
                        </Button>
                      </SheetClose>
                    </li>
                  ),
                )}
              </ul>
            </SheetBody>
          </SheetContent>
        </Sheet>
      </Row>
    </div>
  );
}

export function SheetSection() {
  return (
    <GallerySection
      id="sheet"
      title="Sheet"
      description={
        "The same Radix Dialog as `Modal`, arriving from an edge — so the same " +
        "focus trap, the same restore on close, and the page behind it frozen " +
        "rather than scrolling under a swipe that misses. `side=\"bottom\"` is " +
        "the phone pattern and pads for the home indicator with " +
        "`env(safe-area-inset-bottom)`; `side=\"right\"` is the desktop detail " +
        "pane. Both dismiss by dragging the header towards the edge they came " +
        "from, past a third of the panel or with a flick. The drag is " +
        "touch-only on purpose: following a mouse would break selecting text " +
        "inside the sheet for a gesture nobody performs with one."
      }
      viewports
    >
      <SheetSpecimens />
    </GallerySection>
  );
}
