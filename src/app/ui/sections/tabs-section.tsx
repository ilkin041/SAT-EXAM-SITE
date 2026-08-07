import * as React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GallerySection, Row, Stack } from "../gallery-section";

/**
 * Server-rendered. Radix Tabs is uncontrolled here (`defaultValue`), and the
 * client boundary it needs is its own "use client" — the section only has to
 * describe them.
 */
function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-paper-sunk p-4 text-body text-muted-foreground">
      {children}
    </div>
  );
}

export function TabsSpecimens() {
  return (
    <div>
      <Row label="Underline" note="arrows move between tabs; Tab enters the panel">
        <Stack>
          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="breakdown">Breakdown</TabsTrigger>
              <TabsTrigger value="review">Review</TabsTrigger>
            </TabsList>
            <TabsContent value="overview">
              <Panel>Scaled scores and the section split.</Panel>
            </TabsContent>
            <TabsContent value="breakdown">
              <Panel>Per-domain accuracy for this attempt.</Panel>
            </TabsContent>
            <TabsContent value="review">
              <Panel>Every question, your answer, the explanation.</Panel>
            </TabsContent>
          </Tabs>
        </Stack>
      </Row>

      <Row label="Pill">
        <Stack>
          <Tabs defaultValue="all">
            <TabsList variant="pill">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="rw">Reading &amp; Writing</TabsTrigger>
              <TabsTrigger value="math">Math</TabsTrigger>
            </TabsList>
            <TabsContent value="all">
              <Panel>280 questions.</Panel>
            </TabsContent>
            <TabsContent value="rw">
              <Panel>154 questions.</Panel>
            </TabsContent>
            <TabsContent value="math">
              <Panel>126 questions.</Panel>
            </TabsContent>
          </Tabs>
        </Stack>
      </Row>

      <Row
        label="Pill, inverted"
        note="the AdminNav treatment — shown on its own navy bar, since that is the only place it is legible"
      >
        <Stack>
          <div className="rounded-lg bg-brand-navy p-3">
            <Tabs defaultValue="tests">
              <TabsList variant="pill" tone="inverted">
                <TabsTrigger value="tests">Tests</TabsTrigger>
                <TabsTrigger value="questions">Questions</TabsTrigger>
                <TabsTrigger value="attempts">Attempts</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </Stack>
      </Row>

      <Row
        label="Underline, inverted"
        note="same idea for a tab strip sitting on the navy bar"
      >
        <Stack>
          <div className="rounded-lg bg-brand-navy p-3">
            <Tabs defaultValue="items">
              <TabsList tone="inverted">
                <TabsTrigger value="items">Item analysis</TabsTrigger>
                <TabsTrigger value="cohort">Cohort</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </Stack>
      </Row>

      <Row label="Disabled tab" note="arrows skip it">
        <Stack>
          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="breakdown" disabled>
                Breakdown
              </TabsTrigger>
              <TabsTrigger value="review">Review</TabsTrigger>
            </TabsList>
            <TabsContent value="overview">
              <Panel>Breakdown needs a completed attempt.</Panel>
            </TabsContent>
            <TabsContent value="review">
              <Panel>Every question, your answer, the explanation.</Panel>
            </TabsContent>
          </Tabs>
        </Stack>
      </Row>

      <Row label="Overflow" note="at 360px the strip scrolls rather than wrapping">
        <Stack>
          <Tabs defaultValue="t1">
            <TabsList className="overflow-x-auto">
              {["Algebra", "Advanced math", "Geometry", "Trigonometry", "Statistics"].map(
                (label, index) => (
                  <TabsTrigger key={label} value={`t${index + 1}`}>
                    {label}
                  </TabsTrigger>
                ),
              )}
            </TabsList>
          </Tabs>
        </Stack>
      </Row>
    </div>
  );
}

export function TabsSection() {
  return (
    <GallerySection
      id="tabs"
      title="Tabs"
      description={
        "Radix Tabs in two treatments. `underline` switches the view of one " +
        "thing; `pill` is the chip strip, and `tone=\"inverted\"` reproduces the " +
        "AdminNav treatment class for class so that nav can move onto this " +
        "component without a visual diff. Radix owns the keyboard contract: " +
        "arrows move, Home/End jump to the ends, and only the active tab is in " +
        "the tab order so Tab enters the panel instead of walking the strip. " +
        "Reach for `SegmentedControl` instead when nothing below is a panel."
      }
      viewports
    >
      <TabsSpecimens />
    </GallerySection>
  );
}
