"use client";

import * as React from "react";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { GallerySection, Row, Stack } from "../gallery-section";

/**
 * Client, and it has to be: `SegmentedControl` is fully controlled, so a
 * server specimen would render a control that cannot change.
 */
function Demo({
  initial,
  children,
}: {
  initial: string;
  children: (
    value: string,
    setValue: (next: string) => void,
  ) => React.ReactNode;
}) {
  const [value, setValue] = React.useState(initial);
  return <>{children(value, setValue)}</>;
}

export function SegmentedControlSpecimens() {
  return (
    <div>
      <Row
        label="Two options"
        note="arrows move and select — a radiogroup's arrows are not a cursor"
      >
        <Demo initial="mine">
          {(value, setValue) => (
            <SegmentedControl
              label="Which attempts to show"
              value={value}
              onValueChange={setValue}
              options={[
                { value: "mine", label: "My attempts" },
                { value: "group", label: "My group" },
              ]}
            />
          )}
        </Demo>
      </Row>

      <Row label="Four options">
        <Demo initial="90">
          {(value, setValue) => (
            <SegmentedControl
              label="Date range"
              value={value}
              onValueChange={setValue}
              options={[
                { value: "7", label: "7d" },
                { value: "30", label: "30d" },
                { value: "90", label: "90d" },
                { value: "all", label: "All" },
              ]}
            />
          )}
        </Demo>
      </Row>

      <Row label="Small">
        <Demo initial="pct">
          {(value, setValue) => (
            <SegmentedControl
              size="sm"
              label="Show scores as"
              value={value}
              onValueChange={setValue}
              options={[
                { value: "pct", label: "%" },
                { value: "raw", label: "Raw" },
                { value: "scaled", label: "Scaled" },
              ]}
            />
          )}
        </Demo>
      </Row>

      <Row
        label="Abbreviated labels"
        note="`srLabel` says the whole thing to a screen reader"
      >
        <Demo initial="rw">
          {(value, setValue) => (
            <SegmentedControl
              label="Section"
              value={value}
              onValueChange={setValue}
              options={[
                { value: "rw", label: "R&W", srLabel: "Reading and Writing" },
                { value: "math", label: "Math" },
              ]}
            />
          )}
        </Demo>
      </Row>

      <Row label="Disabled option" note="arrows step over it">
        <Demo initial="linear">
          {(value, setValue) => (
            <SegmentedControl
              label="Test mode"
              value={value}
              onValueChange={setValue}
              options={[
                { value: "linear", label: "Linear" },
                { value: "adaptive", label: "Adaptive" },
                { value: "drill", label: "Drill", disabled: true },
              ]}
            />
          )}
        </Demo>
      </Row>

      <Row label="Full width">
        <Stack>
          <Demo initial="all">
            {(value, setValue) => (
              <SegmentedControl
                fullWidth
                label="Question filter"
                value={value}
                onValueChange={setValue}
                options={[
                  { value: "all", label: "All" },
                  { value: "wrong", label: "Incorrect" },
                  { value: "flagged", label: "Flagged" },
                ]}
              />
            )}
          </Demo>
        </Stack>
      </Row>
    </div>
  );
}

export function SegmentedControlSection() {
  return (
    <GallerySection
      id="segmented-control"
      title="SegmentedControl"
      description={
        "Two to four options, all visible, one chosen. It sets a value — a " +
        "filter, a unit, a range — so it is a `radiogroup`, not a tablist: " +
        "nothing below it is a panel, the same view re-renders with different " +
        "numbers. Arrows move and select, Home/End go to the ends, disabled " +
        "options are stepped over, and the group is one tab stop. The " +
        "indicator is a single element that travels, and the global " +
        "reduced-motion block flattens its transition so it jumps instead. " +
        "Past four options the labels stop fitting at 360px — use `Select`."
      }
      viewports
    >
      <SegmentedControlSpecimens />
    </GallerySection>
  );
}
