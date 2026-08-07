import * as React from "react";
import { Avatar } from "@/components/ui/avatar";
import { GallerySection, Row, Swatch } from "../gallery-section";

/** Ids are cuid-shaped on purpose — the hue comes from the id, so the swatches
 *  below are the hues real users get, not a hand-picked spread. */
const ROSTER = [
  { id: "clv8x2a10000qw", name: "Ada Lovelace" },
  { id: "clv8x2a10001qw", name: "Grace Hopper" },
  { id: "clv8x2a10002qw", name: "Katherine Johnson" },
  { id: "clv8x2a10003qw", name: "Alan Turing" },
  { id: "clv8x2a10004qw", name: "Barbara Liskov" },
  { id: "clv8x2a10005qw", name: "Donald Knuth" },
  { id: "clv8x2a10006qw", name: "Radia Perlman" },
  { id: "clv8x2a10007qw", name: "Margaret Hamilton" },
];

export function AvatarSpecimens() {
  return (
    <div>
      <Row label="Sizes">
        <Swatch caption="xs">
          <Avatar size="xs" seed="clv8x2a10000qw" name="Ada Lovelace" />
        </Swatch>
        <Swatch caption="sm">
          <Avatar size="sm" seed="clv8x2a10000qw" name="Ada Lovelace" />
        </Swatch>
        <Swatch caption="md">
          <Avatar size="md" seed="clv8x2a10000qw" name="Ada Lovelace" />
        </Swatch>
        <Swatch caption="lg">
          <Avatar size="lg" seed="clv8x2a10000qw" name="Ada Lovelace" />
        </Swatch>
      </Row>

      <Row label="Hues" note="derived from the id — same user, same colour, every session">
        {ROSTER.map((person) => (
          <Swatch key={person.id} caption={person.name.split(" ")[0]}>
            <Avatar seed={person.id} name={person.name} />
          </Swatch>
        ))}
      </Row>

      <Row label="Initials" note="two words give two letters; an email gives one">
        <Swatch caption="Ada Lovelace">
          <Avatar seed="a" name="Ada Lovelace" />
        </Swatch>
        <Swatch caption="Ada">
          <Avatar seed="b" name="Ada" />
        </Swatch>
        <Swatch caption="student@example.com">
          <Avatar seed="c" email="student@example.com" />
        </Swatch>
        <Swatch caption="nothing at all">
          <Avatar seed="d" />
        </Swatch>
      </Row>

      <Row label="In a row" note="decorative by default: the name beside it is the label">
        <div className="flex items-center gap-2.5 rounded-lg border border-border bg-card px-3 py-2">
          <Avatar size="sm" seed="clv8x2a10002qw" name="Katherine Johnson" />
          <div className="min-w-0">
            <p className="truncate text-body font-medium text-foreground">
              Katherine Johnson
            </p>
            <p className="truncate text-caption text-muted-foreground">
              katherine@example.com
            </p>
          </div>
        </div>
      </Row>

      <Row label="Standing alone" note="label makes it role=img with an accessible name">
        <Avatar
          seed="clv8x2a10003qw"
          name="Alan Turing"
          label="Alan Turing"
        />
      </Row>
    </div>
  );
}

export function AvatarSection() {
  return (
    <GallerySection
      id="avatar"
      title="Avatar"
      description="Initials in a tinted circle. The hue is a hash of the seed — pass the user id, not the name, so it survives a rename. Six hues, none of them emerald, amber or red: those three mean correct, time and incorrect, and a person is not a status. No image branch, because User has no image column yet."
    >
      <AvatarSpecimens />
    </GallerySection>
  );
}
