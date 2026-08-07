import * as React from "react";
import { ClipboardList } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableCaption,
  TableEmpty,
  TableSkeleton,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from "@/components/ui/table";
import { GallerySection, Row } from "../gallery-section";

/**
 * The raw primitive: header, rows, states. `DataTable` in the next section is
 * what most call sites actually want — this one is for a table whose shape the
 * page already knows and does not need to sort or page.
 */
const ATTEMPTS = [
  { test: "Practice Test 1", status: "Scored", score: 1240, date: "12 Mar 2026" },
  { test: "Practice Test 2", status: "In progress", score: null, date: "19 Mar 2026" },
  { test: "Math section only", status: "Scored", score: 640, date: "02 Apr 2026" },
  { test: "Practice Test 3", status: "Scored", score: 1310, date: "21 Apr 2026" },
  { test: "Practice Test 4", status: "Abandoned", score: null, date: "05 May 2026" },
  { test: "Practice Test 5", status: "Scored", score: 1350, date: "18 May 2026" },
];

export function TableSpecimens() {
  return (
    <div>
      <Row label="Default" note="hover a row; the last row's rule is the frame's">
        <Table>
          <THead>
            <TR>
              <TH>Test</TH>
              <TH>Status</TH>
              <TH numeric>Score</TH>
            </TR>
          </THead>
          <TBody>
            {ATTEMPTS.slice(0, 3).map((attempt) => (
              <TR key={attempt.test}>
                <TD>{attempt.test}</TD>
                <TD>
                  <Badge variant={attempt.score ? "success" : "muted"}>
                    {attempt.status}
                  </Badge>
                </TD>
                <TD numeric>{attempt.score ?? "—"}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </Row>

      <Row
        label="Sticky header"
        note="scroll inside the table — the header needs a bounded container, so it caps at 70vh (here max-h-48)"
      >
        <Table stickyHeader containerClassName="max-h-48">
          <THead>
            <TR>
              <TH>Test</TH>
              <TH>Status</TH>
              <TH numeric>Score</TH>
            </TR>
          </THead>
          <TBody>
            {[...ATTEMPTS, ...ATTEMPTS].map((attempt, index) => (
              <TR key={index}>
                <TD>{attempt.test}</TD>
                <TD>{attempt.status}</TD>
                <TD numeric>{attempt.score ?? "—"}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </Row>

      <Row
        label="hideBelow"
        note="narrow the pane: Date drops below md, Status below sm — set it on the TH and the TD together"
      >
        <Table>
          <THead>
            <TR>
              <TH>Test</TH>
              <TH hideBelow="sm">Status</TH>
              <TH hideBelow="md">Date</TH>
              <TH numeric>Score</TH>
            </TR>
          </THead>
          <TBody>
            {ATTEMPTS.slice(0, 4).map((attempt) => (
              <TR key={attempt.test}>
                <TD>{attempt.test}</TD>
                <TD hideBelow="sm">{attempt.status}</TD>
                <TD hideBelow="md">{attempt.date}</TD>
                <TD numeric>{attempt.score ?? "—"}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </Row>

      <Row label="Caption" note="caption-side is bottom so it never fights a sticky header">
        <Table>
          <TableCaption>
            Scored attempts only. Abandoned attempts are excluded.
          </TableCaption>
          <THead>
            <TR>
              <TH>Test</TH>
              <TH numeric>Score</TH>
            </TR>
          </THead>
          <TBody>
            {ATTEMPTS.filter((a) => a.score).map((attempt) => (
              <TR key={attempt.test}>
                <TD>{attempt.test}</TD>
                <TD numeric>{attempt.score}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </Row>

      <Row label="Empty" note="TableEmpty spans the row and hosts an EmptyState">
        <Table>
          <THead>
            <TR>
              <TH>Test</TH>
              <TH>Status</TH>
              <TH numeric>Score</TH>
            </TR>
          </THead>
          <TBody>
            <TableEmpty
              colSpan={3}
              icon={ClipboardList}
              title="You haven't taken any tests yet"
              description="Start a practice test and your results land here."
              action={<Button size="sm">Browse tests</Button>}
            />
          </TBody>
        </Table>
      </Row>

      <Row label="Loading" note="TableSkeleton replaces the TBody and respects hideBelow">
        <Table>
          <THead>
            <TR>
              <TH>Test</TH>
              <TH hideBelow="sm">Status</TH>
              <TH numeric>Score</TH>
            </TR>
          </THead>
          <TableSkeleton
            columns={[{}, { hideBelow: "sm" }, { numeric: true }]}
            rows={4}
          />
        </Table>
      </Row>
    </div>
  );
}

export function TableSection() {
  return (
    <GallerySection
      id="table"
      title="Table"
      description={
        "The shared markup under every list in the app: uppercase mono header, " +
        "hover rows, cell rules, `numeric` for mono tabular figures. Two things " +
        "differ from the usual recipe — the table uses separate borders rather " +
        "than collapsed ones, because a collapsed table drops the border off a " +
        "sticky header; and `stickyHeader` caps the scroll container, because " +
        "the wrapper that keeps a wide table off the page's horizontal scrollbar " +
        "is also the scrollport the header sticks inside."
      }
      viewports
    >
      <TableSpecimens />
    </GallerySection>
  );
}
