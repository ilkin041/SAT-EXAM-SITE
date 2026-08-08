import * as React from "react";
import {
  DomainBar,
  DomainBarLabel,
  DomainBarList,
} from "@/components/ui/domain-bar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { GallerySection, Row, Stack } from "../gallery-section";

const RW_STATS = [
  { domain: "Information and Ideas", correct: 12, total: 13 },
  { domain: "Craft and Structure", correct: 9, total: 14 },
  { domain: "Expression of Ideas", correct: 4, total: 11 },
  { domain: "Standard English Conventions", correct: 2, total: 12 },
];

export function DomainBarSpecimens() {
  return (
    <div>
      <Row label="One row" note="the fraction and the percent are the accessible text; the bar is aria-hidden">
        <Stack>
          <DomainBar label="Craft and Structure" correct={9} total={14} />
        </Stack>
      </Row>

      <Row label="List" note="the shape computeDomainBreakdown() returns, spread straight in">
        <Stack>
          <DomainBarList stats={RW_STATS} />
        </Stack>
      </Row>

      <Row
        label="With a tooltip"
        note="composed at the call site, so only this page pays for Radix — hover, focus or tap the dotted label"
      >
        <Stack>
          <DomainBar
            label={
              <Tooltip>
                <TooltipTrigger asChild>
                  <DomainBarLabel>Craft and Structure</DomainBarLabel>
                </TooltipTrigger>
                <TooltipContent>
                  Vocabulary in context, text structure and purpose, and
                  connections across paired passages.
                </TooltipContent>
              </Tooltip>
            }
            correct={9}
            total={14}
          />
        </Stack>
      </Row>

      <Row label="Long labels and zero totals" note="the label truncates; 0 / 0 is 0%, not NaN">
        <Stack>
          <DomainBar
            label="Standard English Conventions and Boundaries of the Sentence"
            correct={7}
            total={9}
          />
          <DomainBar label="Geometry and Trigonometry" correct={0} total={0} />
        </Stack>
      </Row>
    </div>
  );
}

export function DomainBarSection() {
  return (
    <GallerySection
      id="domain-bar"
      title="DomainBar"
      description="One row of a skill breakdown: label, raw fraction, percent, graded bar. The percentage is rounded once and passed to the bar, so the number and the width can never disagree about which grade band they are in. DomainBarList takes computeDomainBreakdown()'s array as-is. The label is a slot rather than a tooltip prop: a static import of Tooltip cost the results page 31 kB of client JS for a tooltip it never renders, so the pages that want one compose it themselves around DomainBarLabel."
      viewports
    >
      <DomainBarSpecimens />
    </GallerySection>
  );
}
