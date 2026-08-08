import * as React from "react";
import { ScoreDial } from "@/components/ui/score-dial";
import { GallerySection, Row } from "../gallery-section";

export function ScoreDialSpecimens() {
  return (
    <div>
      <Row label="Sizes" note="sm / md / lg — lg is the results page">
        <ScoreDial value={1230} sublabel="/ 1600" size="sm" />
        <ScoreDial value={1230} sublabel="/ 1600" size="md" />
        <ScoreDial value={1230} sublabel="/ 1600" size="lg" />
      </Row>

      <Row
        label="The floor"
        note="400 is a quarter turn, not an empty ring — the bug this extraction fixed"
      >
        <ScoreDial value={400} sublabel="/ 1600" size="md" />
        <ScoreDial value={800} sublabel="/ 1600" size="md" />
        <ScoreDial value={1600} sublabel="/ 1600" size="md" />
      </Row>

      <Row label="Label and delta" note="all of it is inside one role=&quot;img&quot;, so it announces as one sentence">
        <ScoreDial
          value={1230}
          sublabel="/ 1600"
          size="md"
          label="Total score"
          delta={40}
          deltaLabel="vs. last attempt"
        />
        <ScoreDial
          value={1140}
          sublabel="/ 1600"
          size="md"
          label="Total score"
          delta={-30}
          deltaLabel="vs. last attempt"
        />
        <ScoreDial
          value={1180}
          sublabel="/ 1600"
          size="md"
          label="Total score"
          delta={0}
          deltaLabel="vs. last attempt"
        />
      </Row>

      <Row label="Another scale" note="max is a prop; a section is out of 800">
        <ScoreDial value={640} max={800} sublabel="/ 800" size="md" label="Math" />
      </Row>
    </div>
  );
}

export function ScoreDialSection() {
  return (
    <GallerySection
      id="score-dial"
      title="ScoreDial"
      description="The ring gauge a score report is built around. The fill is value / max, so the SAT floor of 400 draws a quarter turn rather than nothing — the relative reading, where 400 is the left edge, is what Progress variant=&quot;scoreBand&quot; is for. role=&quot;img&quot; sits on the wrapper so the number, the sublabel and the delta announce as one sentence instead of three fragments. The sweep is keyframes rather than a transition, because a server render has no value change to catch."
      viewports
    >
      <ScoreDialSpecimens />
    </GallerySection>
  );
}
