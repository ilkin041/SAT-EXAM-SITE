import * as React from "react";
import { Separator } from "@/components/ui/separator";
import { GallerySection, Row, Stack } from "../gallery-section";

export function SeparatorSpecimens() {
  return (
    <div>
      <Row label="Horizontal">
        <Stack>
          <Separator />
        </Stack>
      </Row>

      <Row label="Labelled" note="the label is content, the lines are decoration">
        <Stack>
          <Separator label="or" />
          <Separator label="Earlier attempts" />
        </Stack>
      </Row>

      <Row label="Vertical" note="needs a height from its context — h-4 here">
        <div className="flex items-center gap-3 text-caption text-muted-foreground">
          <span>Reading and Writing</span>
          <Separator orientation="vertical" className="h-4" />
          <span className="tabular">32 questions</span>
          <Separator orientation="vertical" className="h-4" />
          <span className="tabular">35 min</span>
        </div>
      </Row>

      <Row label="Between blocks" note="most dividers should stay a border-top; this is for when one cannot">
        <Stack>
          <p className="text-body text-muted-foreground">
            Your last attempt scored 1180.
          </p>
          <Separator decorative={false} />
          <p className="text-body text-muted-foreground">
            Two modules remain in this test.
          </p>
        </Stack>
      </Row>
    </div>
  );
}

export function SeparatorSection() {
  return (
    <GallerySection
      id="separator"
      title="Separator"
      description="A rule between things, for the two cases a border-top cannot do: vertical, and labelled. Decorative by default — pass decorative={false} when the rule is the only thing marking a change of topic. The labelled form carries no role at all, because a separator's children are presentational and the label would be hidden."
    >
      <SeparatorSpecimens />
    </GallerySection>
  );
}
