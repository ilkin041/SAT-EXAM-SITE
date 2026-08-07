import * as React from "react";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { GallerySection, Row, Swatch } from "../gallery-section";

const VARIANTS = [
  "default",
  "secondary",
  "outline",
  "muted",
  "success",
  "warning",
  "info",
  "purple",
  "destructive",
] as const;

export function BadgeSpecimens() {
  return (
    <div>
      <Row label="Variants">
        {VARIANTS.map((variant) => (
          <Swatch key={variant} caption={variant}>
            <Badge variant={variant}>Medium</Badge>
          </Swatch>
        ))}
      </Row>

      <Row label="With icon" note="gap-1.5 is built in — no wrapper needed">
        <Swatch caption="success">
          <Badge variant="success">
            <CheckCircle2 className="h-3 w-3" aria-hidden />
            Correct
          </Badge>
        </Swatch>
        <Swatch caption="warning">
          <Badge variant="warning">
            <Clock className="h-3 w-3" aria-hidden />
            In progress
          </Badge>
        </Swatch>
        <Swatch caption="destructive">
          <Badge variant="destructive">
            <XCircle className="h-3 w-3" aria-hidden />
            Incorrect
          </Badge>
        </Swatch>
      </Row>

      <Row label="With a number" note="figures inside a badge still take .tabular">
        <Swatch caption="count">
          <Badge variant="muted">
            <span className="tabular">27</span> questions
          </Badge>
        </Swatch>
        <Swatch caption="score">
          <Badge variant="info">
            <span className="tabular">1340</span>
          </Badge>
        </Swatch>
      </Row>

      <Row label="Long label" note="badges do not truncate — keep them to a word or two">
        <Swatch caption="outline">
          <Badge variant="outline">Advanced algebra and functions</Badge>
        </Swatch>
      </Row>
    </div>
  );
}

export function BadgeSection() {
  return (
    <GallerySection
      id="badge"
      title="Badge"
      description="Nine variants for statuses, difficulty and type tags. The colour-coded ones carry meaning — emerald for correct/complete, amber for time and pacing, red for incorrect — so never pick one for decoration. Status must never be conveyed by colour alone: keep the word."
    >
      <BadgeSpecimens />
    </GallerySection>
  );
}
