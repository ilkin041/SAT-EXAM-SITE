import * as React from "react";
import Link from "next/link";
import { ArrowRight, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GallerySection, Row, Swatch } from "../gallery-section";

const VARIANTS = [
  "primary",
  "secondary",
  "destructive",
  "ghost",
  "link",
  "accent",
] as const;

const SIZES = ["sm", "default", "lg"] as const;

export function ButtonSpecimens() {
  return (
    <div>
      <Row label="Variants">
        {VARIANTS.map((variant) => (
          <Swatch key={variant} caption={variant}>
            <Button variant={variant}>Save changes</Button>
          </Swatch>
        ))}
      </Row>

      <Row label="Sizes" note="h-9 / h-10 / h-11, plus a square icon size">
        {SIZES.map((size) => (
          <Swatch key={size} caption={size}>
            <Button size={size}>Save changes</Button>
          </Swatch>
        ))}
        <Swatch caption="icon">
          <Button size="icon" aria-label="Add question">
            <Plus className="h-4 w-4" aria-hidden />
          </Button>
        </Swatch>
      </Row>

      <Row label="Disabled">
        {VARIANTS.map((variant) => (
          <Swatch key={variant} caption={variant}>
            <Button variant={variant} disabled>
              Save changes
            </Button>
          </Swatch>
        ))}
      </Row>

      <Row label="Loading" note="sets disabled too; ignored under asChild">
        {SIZES.map((size) => (
          <Swatch key={size} caption={size}>
            <Button size={size} loading>
              Saving
            </Button>
          </Swatch>
        ))}
        <Swatch caption="secondary">
          <Button variant="secondary" loading>
            Saving
          </Button>
        </Swatch>
        <Swatch caption="icon">
          <Button size="icon" loading aria-label="Saving" />
        </Swatch>
      </Row>

      <Row label="With icon">
        <Swatch caption="leading">
          <Button>
            <Plus className="h-4 w-4" aria-hidden />
            New test
          </Button>
        </Swatch>
        <Swatch caption="trailing">
          <Button variant="secondary">
            Continue
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Button>
        </Swatch>
        <Swatch caption="destructive">
          <Button variant="destructive">
            <Trash2 className="h-4 w-4" aria-hidden />
            Delete question
          </Button>
        </Swatch>
      </Row>

      <Row label="asChild" note="renders the child as the root — use for links">
        <Swatch caption="next/link">
          <Button asChild>
            <Link href="/ui">Back to gallery</Link>
          </Button>
        </Swatch>
        <Swatch caption="link variant">
          <Button asChild variant="link">
            <Link href="/ui">Back to gallery</Link>
          </Button>
        </Swatch>
      </Row>

      <Row label="Focus visible" note="press Tab — ring-2 ring-ring with a 2px offset">
        {VARIANTS.map((variant) => (
          <Swatch key={variant} caption={variant}>
            <Button variant={variant}>Focus me</Button>
          </Swatch>
        ))}
      </Row>
    </div>
  );
}

export function ButtonSection() {
  return (
    <GallerySection
      id="button"
      title="Button"
      description="Six variants, four sizes. `loading` swaps in a spinner and disables the button; it is ignored under `asChild`, where Slot requires exactly one child. Icon-only buttons need an aria-label."
    >
      <ButtonSpecimens />
    </GallerySection>
  );
}
