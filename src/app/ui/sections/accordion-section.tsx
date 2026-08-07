import * as React from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { GallerySection, Row, Stack } from "../gallery-section";

export function AccordionSpecimens() {
  return (
    <div>
      <Row label="Single" note="collapsible — the open item closes on a second click">
        <Stack>
          <Accordion type="single" collapsible defaultValue="scoring">
            <AccordionItem value="scoring">
              <AccordionTrigger headingLevel={4}>
                How is the 200–800 score calculated?
              </AccordionTrigger>
              <AccordionContent>
                Raw counts convert through a published table, per section. It is
                an estimate of a real SAT score, not an official one.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="adaptive">
              <AccordionTrigger headingLevel={4}>
                What does adaptive mode change?
              </AccordionTrigger>
              <AccordionContent>
                Your first module decides whether the second is the easier or
                the harder one, the same way the Digital SAT routes.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="devices">
              <AccordionTrigger headingLevel={4}>
                Does it work on an iPad?
              </AccordionTrigger>
              <AccordionContent>
                Yes. The test interface is built tablet-first.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </Stack>
      </Row>

      <Row label="Multiple" note="any number open at once">
        <Stack>
          <Accordion type="multiple" defaultValue={["algebra"]}>
            <AccordionItem value="algebra">
              <AccordionTrigger headingLevel={4}>Algebra</AccordionTrigger>
              <AccordionContent>
                Linear equations, systems, inequalities.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="advanced-math">
              <AccordionTrigger headingLevel={4}>Advanced math</AccordionTrigger>
              <AccordionContent>
                Quadratics, polynomials, exponentials.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </Stack>
      </Row>

      <Row label="Disabled item" note="skipped by the arrow keys">
        <Stack>
          <Accordion type="single" collapsible>
            <AccordionItem value="open">
              <AccordionTrigger headingLevel={4}>Available</AccordionTrigger>
              <AccordionContent>Nothing surprising in here.</AccordionContent>
            </AccordionItem>
            <AccordionItem value="locked" disabled>
              <AccordionTrigger headingLevel={4}>
                Locked until you finish a test
              </AccordionTrigger>
              <AccordionContent>Unreachable.</AccordionContent>
            </AccordionItem>
          </Accordion>
        </Stack>
      </Row>
    </div>
  );
}

export function AccordionSection() {
  return (
    <GallerySection
      id="accordion"
      title="Accordion"
      description="Disclosure list over Radix: aria-expanded and aria-controls on the trigger, a labelled region for the panel, and Up/Down/Home/End across the rows. type=&quot;single&quot; wants collapsible unless one panel must always be open; type=&quot;multiple&quot; takes an array. Set headingLevel to whatever the page's outline says — Radix defaults to h3 and only the page knows."
      viewports
    >
      <AccordionSpecimens />
    </GallerySection>
  );
}
