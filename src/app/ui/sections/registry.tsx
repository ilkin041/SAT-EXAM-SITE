import type * as React from "react";
import { AccordionSection, AccordionSpecimens } from "./accordion-section";
import { AlertSection, AlertSpecimens } from "./alert-section";
import { AvatarSection, AvatarSpecimens } from "./avatar-section";
import { BadgeSection, BadgeSpecimens } from "./badge-section";
import { ButtonSection, ButtonSpecimens } from "./button-section";
import { DataTableSection, DataTableSpecimens } from "./data-table-section";
import { EmptyStateSection, EmptyStateSpecimens } from "./empty-state-section";
import { FieldSection, FieldSpecimens } from "./field-section";
import { InputSection, InputSpecimens } from "./input-section";
import { ModalSection, ModalSpecimens } from "./modal-section";
import { PaginationSection, PaginationSpecimens } from "./pagination-section";
import { SeparatorSection, SeparatorSpecimens } from "./separator-section";
import { PageHeaderSection, PageHeaderSpecimens } from "./page-header-section";
import {
  SegmentedControlSection,
  SegmentedControlSpecimens,
} from "./segmented-control-section";
import { SelectSection, SelectSpecimens } from "./select-section";
import { SheetSection, SheetSpecimens } from "./sheet-section";
import { StatCardSection, StatCardSpecimens } from "./stat-card-section";
import { TableSection, TableSpecimens } from "./table-section";
import { TabsSection, TabsSpecimens } from "./tabs-section";
import { TooltipSection, TooltipSpecimens } from "./tooltip-section";

/**
 * The gallery's single source of truth. `/ui` walks it to build both the sticky
 * index and the page body; `/ui/frame` walks it to render one primitive's
 * specimens bare inside a viewport iframe.
 *
 * To add a primitive: write `<name>-section.tsx` exporting `<Name>Section` and
 * `<Name>Specimens`, then add one entry here. Nothing else needs touching.
 * Order here is the order on the page — keep it roughly simple-to-composite.
 */
export interface GalleryEntry {
  /** Anchor id; must match the `id` passed to <GallerySection>. */
  id: string;
  /** Label in the sticky index. */
  title: string;
  /** The full section: heading, prose, both theme panes. */
  Section: () => React.JSX.Element;
  /** Just the specimens, for the viewport iframes. */
  Specimens: () => React.JSX.Element;
}

export const GALLERY: GalleryEntry[] = [
  { id: "button", title: "Button", Section: ButtonSection, Specimens: ButtonSpecimens },
  { id: "badge", title: "Badge", Section: BadgeSection, Specimens: BadgeSpecimens },
  { id: "avatar", title: "Avatar", Section: AvatarSection, Specimens: AvatarSpecimens },
  {
    id: "separator",
    title: "Separator",
    Section: SeparatorSection,
    Specimens: SeparatorSpecimens,
  },
  { id: "input", title: "Input", Section: InputSection, Specimens: InputSpecimens },
  { id: "field", title: "Field", Section: FieldSection, Specimens: FieldSpecimens },
  { id: "select", title: "Select", Section: SelectSection, Specimens: SelectSpecimens },
  {
    id: "segmented-control",
    title: "SegmentedControl",
    Section: SegmentedControlSection,
    Specimens: SegmentedControlSpecimens,
  },
  { id: "tabs", title: "Tabs", Section: TabsSection, Specimens: TabsSpecimens },
  {
    id: "accordion",
    title: "Accordion",
    Section: AccordionSection,
    Specimens: AccordionSpecimens,
  },
  { id: "alert", title: "Alert", Section: AlertSection, Specimens: AlertSpecimens },
  {
    id: "tooltip",
    title: "Tooltip",
    Section: TooltipSection,
    Specimens: TooltipSpecimens,
  },
  { id: "modal", title: "Modal", Section: ModalSection, Specimens: ModalSpecimens },
  { id: "sheet", title: "Sheet", Section: SheetSection, Specimens: SheetSpecimens },
  { id: "table", title: "Table", Section: TableSection, Specimens: TableSpecimens },
  {
    id: "data-table",
    title: "DataTable",
    Section: DataTableSection,
    Specimens: DataTableSpecimens,
  },
  {
    id: "pagination",
    title: "Pagination",
    Section: PaginationSection,
    Specimens: PaginationSpecimens,
  },
  {
    id: "stat-card",
    title: "StatCard",
    Section: StatCardSection,
    Specimens: StatCardSpecimens,
  },
  {
    id: "empty-state",
    title: "EmptyState",
    Section: EmptyStateSection,
    Specimens: EmptyStateSpecimens,
  },
  {
    id: "page-header",
    title: "PageHeader",
    Section: PageHeaderSection,
    Specimens: PageHeaderSpecimens,
  },
];

export function findEntry(id: string | undefined): GalleryEntry | undefined {
  return GALLERY.find((entry) => entry.id === id);
}
