"use client";

import * as React from "react";
import { Pagination } from "@/components/ui/pagination";
import { GallerySection, Row, Stack } from "../gallery-section";

/**
 * The URL-synced specimens use a `paramPrefix` so the gallery's own address bar
 * gains `?demopage=` rather than a bare `?page=` that a future gallery table
 * might also want. Both theme panes read the same param, so clicking in one
 * moves the other — which is the point of putting the state in the URL.
 */

export function PaginationSpecimens() {
  const [page, setPage] = React.useState(4);

  return (
    <div>
      <Row label="Full" note="URL-synced — watch ?demopage= in the address bar">
        <Stack>
          <Pagination
            total={1247}
            pageSize={100}
            pageSizeOptions={[25, 50, 100]}
            itemNoun="questions"
            paramPrefix="demo"
          />
        </Stack>
      </Row>

      <Row label="Controlled" note="onPageChange given — nothing is written to the URL">
        <Stack>
          <Pagination
            total={480}
            pageSize={20}
            itemNoun="attempts"
            page={page}
            onPageChange={setPage}
          />
        </Stack>
      </Row>

      <Row label="Ellipsis" note="first and last always reachable; a one-page gap is filled in instead">
        <Stack>
          <Pagination total={200} pageSize={10} page={1} onPageChange={() => {}} />
          <Pagination total={200} pageSize={10} page={3} onPageChange={() => {}} />
          <Pagination total={200} pageSize={10} page={10} onPageChange={() => {}} />
          <Pagination total={200} pageSize={10} page={20} onPageChange={() => {}} />
        </Stack>
      </Row>

      <Row label="One page" note="the numbers disappear, the range line stays">
        <Stack>
          <Pagination
            total={12}
            pageSize={25}
            itemNoun="tests"
            page={1}
            onPageChange={() => {}}
          />
        </Stack>
      </Row>

      <Row label="Empty" note="renders nothing — an empty result set gets an EmptyState">
        <Stack>
          <Pagination total={0} page={1} onPageChange={() => {}} />
        </Stack>
      </Row>
    </div>
  );
}

export function PaginationSection() {
  return (
    <GallerySection
      id="pagination"
      title="Pagination"
      description="Result range, page size and numbers with ellipsis. State lives in ?page= and ?perPage= — the same page param DataTable uses — so a page of results survives a reload and can be pasted to someone else. Pass onPageChange to take that over. A ?perPage= that is not one of the offered options is ignored, since the param is one keystroke from asking for 100,000 rows."
      viewports
    >
      <PaginationSpecimens />
    </GallerySection>
  );
}
