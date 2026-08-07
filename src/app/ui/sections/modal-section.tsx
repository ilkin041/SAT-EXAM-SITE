import * as React from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Modal,
  ModalBody,
  ModalClose,
  ModalContent,
  ModalFooter,
  ModalTrigger,
} from "@/components/ui/modal";
import { GallerySection, Row } from "../gallery-section";

/**
 * Every specimen here is uncontrolled — `ModalTrigger` opens it and
 * `ModalClose` shuts it — so the section stays a server component. The three
 * migrated dialogs are all controlled, since their open state is tied to
 * something else (a selected row, a two-step flow).
 */
export function ModalSpecimens() {
  return (
    <div>
      <Row
        label="Sizes"
        note="open one and press Tab — focus is trapped inside, and returns to this button on close"
      >
        {(["sm", "default", "lg", "full"] as const).map((size) => (
          <Modal key={size}>
            <ModalTrigger asChild>
              <Button variant="secondary" size="sm">
                {size}
              </Button>
            </ModalTrigger>
            <ModalContent
              size={size}
              title={`Assign this test (${size})`}
              description="Everyone in the group gets it on their dashboard."
            >
              <ModalBody>
                <p className="text-body text-muted-foreground">
                  Header, scrolling body and footer are a three-row grid capped
                  at 85vh, so a long body scrolls without moving the title or
                  the confirm button.
                </p>
              </ModalBody>
              <ModalFooter>
                <ModalClose asChild>
                  <Button variant="secondary">Cancel</Button>
                </ModalClose>
                <ModalClose asChild>
                  <Button>Assign</Button>
                </ModalClose>
              </ModalFooter>
            </ModalContent>
          </Modal>
        ))}
      </Row>

      <Row label="Destructive" note="the variant supplies the icon and the border tint">
        <Modal>
          <ModalTrigger asChild>
            <Button variant="destructive" size="sm">
              Delete question
            </Button>
          </ModalTrigger>
          <ModalContent
            variant="destructive"
            title="Delete this question?"
            description="It is assigned to two modules. Removing it removes it from those tests as well."
          >
            <ModalBody>
              <Alert variant="warning" title="This cannot be undone">
                Attempts already scored keep their answer snapshots, so past
                results are unaffected.
              </Alert>
            </ModalBody>
            <ModalFooter>
              <ModalClose asChild>
                <Button variant="secondary">Cancel</Button>
              </ModalClose>
              <ModalClose asChild>
                <Button variant="destructive">Delete permanently</Button>
              </ModalClose>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </Row>

      <Row
        label="Scrolling body"
        note="the body scrolls, the header and footer do not"
      >
        <Modal>
          <ModalTrigger asChild>
            <Button variant="secondary" size="sm">
              40 modules
            </Button>
          </ModalTrigger>
          <ModalContent
            title="Affected modules"
            description="Every module this question appears in."
          >
            <ModalBody>
              <ul className="space-y-2">
                {Array.from({ length: 40 }, (_, index) => (
                  <li
                    key={index}
                    className="rounded-md border border-border bg-paper-sunk px-3 py-2 text-body"
                  >
                    Practice Test {index + 1} → Math → Module 2
                  </li>
                ))}
              </ul>
            </ModalBody>
            <ModalFooter>
              <ModalClose asChild>
                <Button variant="secondary">Close</Button>
              </ModalClose>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </Row>

      <Row
        label="Not dismissable"
        note="no ✕, no Esc, no click-outside — the footer is the only way out"
      >
        <Modal>
          <ModalTrigger asChild>
            <Button variant="secondary" size="sm">
              Temporary password
            </Button>
          </ModalTrigger>
          <ModalContent
            dismissable={false}
            title="Temporary password generated"
            description="Share it with the student. It won't be shown again."
          >
            <ModalBody>
              <code className="block rounded-lg border border-border bg-paper-sunk p-3 font-mono text-base tracking-wide">
                pale-otter-4127
              </code>
            </ModalBody>
            <ModalFooter>
              <ModalClose asChild>
                <Button>Done</Button>
              </ModalClose>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </Row>

      <Row label="With a form" note="focus lands on the first field, not the ✕">
        <Modal>
          <ModalTrigger asChild>
            <Button variant="secondary" size="sm">
              New group
            </Button>
          </ModalTrigger>
          <ModalContent title="Create a group" size="sm">
            <ModalBody>
              <Input placeholder="Group name" aria-label="Group name" />
            </ModalBody>
            <ModalFooter>
              <ModalClose asChild>
                <Button variant="secondary">Cancel</Button>
              </ModalClose>
              <ModalClose asChild>
                <Button>Create group</Button>
              </ModalClose>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </Row>
    </div>
  );
}

export function ModalSection() {
  return (
    <GallerySection
      id="modal"
      title="Modal"
      description={
        "Radix Dialog with a fixed three-row shape: header, scrolling body, " +
        "footer, capped at 85vh — so a long list scrolls in the body while the " +
        "title stays readable and the confirm button stays reachable. `title` " +
        "is a required prop rather than a slot, because a dialog with no " +
        "accessible name is a bug you can forget to make. `dismissable={false}` " +
        "removes Esc, click-outside and the ✕ together, for a flow where " +
        "dismissing loses something unrecoverable. It replaced three " +
        "hand-rolled dialogs in T1.5, one of which had no focus trap at all."
      }
      viewports
    >
      <ModalSpecimens />
    </GallerySection>
  );
}
