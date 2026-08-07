import * as React from "react";
import { WifiOff } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { GallerySection, Row, Stack } from "../gallery-section";

/**
 * Server-rendered: Alert has no state. The only reason a gallery section goes
 * client is a primitive that has to be operated to be judged.
 */
export function AlertSpecimens() {
  return (
    <div>
      <Row label="Variants">
        <Stack>
          <Alert variant="info" title="This test is adaptive">
            The second module&apos;s difficulty depends on how you do in the
            first.
          </Alert>
          <Alert variant="success" title="Import complete">
            48 questions added to the bank.
          </Alert>
          <Alert variant="warning" title="Section-only attempt">
            A total score needs both sections, so this one shows section scores
            only.
          </Alert>
          <Alert variant="destructive" title="Import failed">
            Row 12 has no correct answer. Fix it and upload the file again.
          </Alert>
        </Stack>
      </Row>

      <Row label="Body only" note="no title — for a single clause">
        <Stack>
          <Alert variant="info">
            Scores are recomputed from module results on every render.
          </Alert>
        </Stack>
      </Row>

      <Row label="Title only" note="when the headline is the whole message">
        <Stack>
          <Alert variant="success" title="Changes saved" />
        </Stack>
      </Row>

      <Row label="Action slot">
        <Stack>
          <Alert
            variant="warning"
            title="You have an attempt in progress"
            action={
              <>
                <Button size="sm">Continue test</Button>
                <Button size="sm" variant="secondary">
                  Start fresh
                </Button>
              </>
            }
          >
            Practice Test 4, paused 12 minutes into Module 1.
          </Alert>
        </Stack>
      </Row>

      <Row label="Custom icon">
        <Stack>
          <Alert
            variant="destructive"
            icon={<WifiOff className="h-5 w-5" />}
            title={"You’re offline"}
            action={
              <Button size="sm" variant="secondary">
                Retry
              </Button>
            }
          >
            Answers are held locally and sent when the connection returns.
          </Alert>
        </Stack>
      </Row>

      <Row label="No icon" note="icon={null} — for a column of them">
        <Stack>
          <Alert variant="info" icon={null} title="Reading and Writing">
            27 questions, 32 minutes per module.
          </Alert>
          <Alert variant="info" icon={null} title="Math">
            22 questions, 35 minutes per module.
          </Alert>
        </Stack>
      </Row>
    </div>
  );
}

export function AlertSection() {
  return (
    <GallerySection
      id="alert"
      title="Alert"
      description={
        "A standing message about the surface it sits on — not a toast. Four " +
        "variants, an optional title, body copy and an action slot. It is not " +
        "a live region by default: pass `live` only when the alert appears in " +
        "response to something the reader just did, and the role follows the " +
        "variant (assertive for warning/destructive, polite otherwise). The " +
        "icon is decorative in every case, so the title has to carry the " +
        "status on its own."
      }
      viewports
    >
      <AlertSpecimens />
    </GallerySection>
  );
}
