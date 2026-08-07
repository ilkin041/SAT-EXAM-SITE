import * as React from "react";
import { Info, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { GallerySection, Row } from "../gallery-section";

export function TooltipSpecimens() {
  return (
    <div>
      <Row
        label="Default"
        note="hover, or Tab to it — 300ms delay, and the arrow points back at the trigger"
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="secondary" size="sm">
              <Info className="h-4 w-4" aria-hidden />
              What is a scaled score?
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            Raw correct counts converted onto the 200–800 band each section is
            reported on.
          </TooltipContent>
        </Tooltip>
      </Row>

      <Row
        label="On a badge"
        note="the test-card pattern — the badge sits in a button so it can be focused and tapped"
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <button type="button" className="rounded-full">
              <Badge variant="purple">ADAPTIVE</Badge>
              <span className="sr-only">Adaptive test — what this means</span>
            </button>
          </TooltipTrigger>
          <TooltipContent>
            The second module&apos;s difficulty is set by how you do on the
            first, like the real Digital SAT.
          </TooltipContent>
        </Tooltip>
      </Row>

      <Row
        label="Disabled trigger"
        note="`disabled` on TooltipTrigger wraps the button in a focusable span — a bare disabled button fires no events and takes no focus, so the tooltip would never open"
      >
        <Tooltip>
          <TooltipTrigger disabled>
            <Button variant="destructive" size="sm" disabled>
              <Trash2 className="h-4 w-4" aria-hidden />
              Delete test
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            This test has 14 recorded attempts. Archive it instead.
          </TooltipContent>
        </Tooltip>
      </Row>

      <Row label="Sides" note="collision detection flips a tooltip that would leave the viewport">
        {(["top", "right", "bottom", "left"] as const).map((side) => (
          <Tooltip key={side}>
            <TooltipTrigger asChild>
              <Button variant="secondary" size="sm">
                {side}
              </Button>
            </TooltipTrigger>
            <TooltipContent side={side}>Anchored {side}.</TooltipContent>
          </Tooltip>
        ))}
      </Row>

      <Row
        label="Icon-only buttons"
        note="one shared provider — after the first opens, the rest skip the delay"
      >
        <TooltipProvider delayDuration={300} skipDelayDuration={400}>
          {[
            { label: "Flag for review", glyph: "⚑" },
            { label: "Cross out choice", glyph: "⊘" },
            { label: "Open calculator", glyph: "×÷" },
          ].map((item) => (
            <Tooltip key={item.label}>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" aria-label={item.label}>
                  <span aria-hidden>{item.glyph}</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>{item.label}</TooltipContent>
            </Tooltip>
          ))}
        </TooltipProvider>
      </Row>

      <Row
        label="Long copy"
        note="capped at 20rem, or the viewport minus a gutter on a phone"
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="secondary" size="sm">
              Score fidelity
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            An attempt is FULL_LENGTH only when both sections have questions.
            Anything else is reported per section, because a total score
            computed from half a test is not comparable to one from a whole
            test.
          </TooltipContent>
        </Tooltip>
      </Row>
    </div>
  );
}

export function TooltipSection() {
  return (
    <GallerySection
      id="tooltip"
      title="Tooltip"
      description={
        "Supplementary only: nothing may exist solely inside a tooltip. Two " +
        "things this wrapper adds over Radix. Touch — Radix Tooltip is hover " +
        "and focus only, so on a phone a tap shows nothing; here the trigger " +
        "reads the pointer type per gesture and a touch turns it into a " +
        "tap-to-toggle that closes on Esc or a tap outside. And disabled " +
        "triggers — `<TooltipTrigger disabled>` wraps the child in a focusable " +
        "span and makes it inert, which is the only way \"why is this off?\" is " +
        "ever answerable. The provider is built in, so a tooltip works without " +
        "a layout change; wrap a group in one to share the skip-delay window."
      }
      viewports
    >
      <TooltipSpecimens />
    </GallerySection>
  );
}
