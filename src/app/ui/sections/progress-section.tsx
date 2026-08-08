import * as React from "react";
import { Progress } from "@/components/ui/progress";
import { GallerySection, Row, Stack } from "../gallery-section";

export function ProgressSpecimens() {
  return (
    <div>
      <Row label="Graded" note="emerald ≥75, blue ≥50, amber ≥25, red below">
        <Stack>
          <Progress value={92} />
          <Progress value={64} />
          <Progress value={38} />
          <Progress value={11} />
        </Stack>
      </Row>

      <Row label="Sizes" note="sm / md / lg">
        <Stack>
          <Progress value={70} size="sm" />
          <Progress value={70} size="md" />
          <Progress value={70} size="lg" />
        </Stack>
      </Row>

      <Row label="Tones" note="primary and neutral opt out of grading">
        <Stack>
          <Progress value={30} tone="primary" />
          <Progress value={30} tone="neutral" />
        </Stack>
      </Row>

      <Row
        label="barClassName"
        note="the escape hatch — gradients and difficulty colours"
      >
        <Stack>
          <Progress value={62} barClassName="bg-gradient-primary" />
          <Progress value={62} barClassName="bg-amber-500" />
        </Stack>
      </Row>

      <Row label="Edges" note="0 and 100, and a value under min">
        <Stack>
          <Progress value={0} />
          <Progress value={100} />
          <Progress value={150} min={200} max={800} />
        </Stack>
      </Row>

      <Row label="Labelled" note="becomes a progressbar; use only when the number is not already on screen">
        <Stack>
          <Progress value={12} max={20} label="Questions answered" />
        </Stack>
      </Row>

      <Row label="scoreBand · 200–1600" note="total score; ticks every 200">
        <Stack>
          <Progress variant="scoreBand" value={1230} min={200} max={1600} />
          <Progress
            variant="scoreBand"
            value={1230}
            min={200}
            max={1600}
            target={1400}
            targetLabel="Goal 1400"
          />
        </Stack>
      </Row>

      <Row label="scoreBand · 200–800" note="one section; ticks every 100">
        <Stack>
          <Progress variant="scoreBand" value={640} min={200} max={800} />
          <Progress
            variant="scoreBand"
            value={640}
            min={200}
            max={800}
            target={250}
            targetLabel="Goal 250"
          />
          <Progress
            variant="scoreBand"
            value={640}
            min={200}
            max={800}
            target={790}
            targetLabel="Goal 790"
          />
        </Stack>
      </Row>

      <Row label="scoreBand · the floor" note="200 is the bottom of the scale, so it draws empty — that is correct here and wrong on a dial">
        <Stack>
          <Progress variant="scoreBand" value={200} min={200} max={1600} />
        </Stack>
      </Row>
    </div>
  );
}

export function ProgressSection() {
  return (
    <GallerySection
      id="progress"
      title="Progress"
      description="The one horizontal meter. Graded by default — the fill is derived from the percentage, on the same four cuts the results page invented. barClassName overrides the fill for the two things grading cannot express: a gradient and a difficulty colour. A bar with no label is aria-hidden, because it almost always sits under text that already says the number. variant=&quot;scoreBand&quot; draws the same fill against a labelled scale with a non-zero floor."
      viewports
    >
      <ProgressSpecimens />
    </GallerySection>
  );
}
