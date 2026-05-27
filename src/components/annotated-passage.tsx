"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RichContent } from "@/components/rich-content";
import { cn } from "@/lib/utils";

export type AnnotationColor = "YELLOW" | "BLUE" | "PINK";

export interface AnnotationRow {
  id: string;
  questionId: string;
  startOffset: number;
  endOffset: number;
  text: string;
  color: AnnotationColor;
  note: string | null;
}

interface Props {
  passageHtml: string | null | undefined;
  attemptId: string;
  questionId: string;
}

const COLOR_BG: Record<AnnotationColor, string> = {
  YELLOW: "bg-yellow-200/70",
  BLUE: "bg-sky-200/70",
  PINK: "bg-pink-200/70",
};

interface PopupState {
  open: boolean;
  x: number;
  y: number;
  startOffset: number;
  endOffset: number;
  selectedText: string;
}

/**
 * Wraps a passage and adds annotation behavior:
 *  - Select text → popup with three highlight colors + "Add note"
 *  - Click an existing highlight → edit note / remove
 *  - Persists annotations server-side per attempt+question
 *
 * Offsets are computed against the passage's plain text (`innerText`). On
 * mount and whenever the underlying passage HTML or annotation set changes,
 * we walk text nodes and wrap the corresponding ranges in colored spans.
 */
export function AnnotatedPassage({ passageHtml, attemptId, questionId }: Props) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [annotations, setAnnotations] = useState<AnnotationRow[]>([]);
  const [popup, setPopup] = useState<PopupState>({
    open: false,
    x: 0,
    y: 0,
    startOffset: 0,
    endOffset: 0,
    selectedText: "",
  });

  // ---------- Load existing annotations ----------
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/attempts/${attemptId}/annotations?questionId=${questionId}`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        if (d?.ok && Array.isArray(d.annotations)) setAnnotations(d.annotations);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [attemptId, questionId]);

  // ---------- Sorted annotations for non-overlapping render ----------
  const sortedAnnotations = useMemo(
    () => [...annotations].sort((a, b) => a.startOffset - b.startOffset),
    [annotations],
  );

  // ---------- Apply highlights to DOM ----------
  useEffect(() => {
    const root = wrapperRef.current;
    if (!root) return;
    // Reset: remove any existing highlight wrappers, restoring original text nodes.
    unwrapHighlights(root);
    if (sortedAnnotations.length === 0) return;

    for (const ann of sortedAnnotations) {
      try {
        wrapRange(root, ann.startOffset, ann.endOffset, ann);
      } catch {
        /* annotation may no longer fit (passage changed); skip silently */
      }
    }
  }, [sortedAnnotations, passageHtml]);

  // ---------- Selection → popup ----------
  function onMouseUp() {
    const root = wrapperRef.current;
    if (!root) return;
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
      setPopup((p) => ({ ...p, open: false }));
      return;
    }
    const range = sel.getRangeAt(0);

    // Ignore selections that aren't inside the passage.
    if (!root.contains(range.startContainer) || !root.contains(range.endContainer)) {
      return;
    }
    // Skip selections inside an existing highlight (use click handler to edit).
    const startInHl = climbForAttr(range.startContainer, "data-annotation-id");
    const endInHl = climbForAttr(range.endContainer, "data-annotation-id");
    if (startInHl || endInHl) return;

    const offsets = computeRangeOffsets(root, range);
    if (!offsets) return;
    const text = sel.toString();
    if (!text.trim()) return;

    const rect = range.getBoundingClientRect();
    setPopup({
      open: true,
      x: rect.left + rect.width / 2,
      y: rect.top - 8,
      startOffset: offsets.start,
      endOffset: offsets.end,
      selectedText: text,
    });
  }

  function clearSelectionAndPopup() {
    window.getSelection()?.removeAllRanges();
    setPopup((p) => ({ ...p, open: false }));
  }

  // ---------- Mutations ----------
  const createAnnotation = useCallback(
    async (color: AnnotationColor, note?: string | null) => {
      const optimistic: AnnotationRow = {
        id: `tmp_${Math.random().toString(36).slice(2)}`,
        questionId,
        startOffset: popup.startOffset,
        endOffset: popup.endOffset,
        text: popup.selectedText,
        color,
        note: note ?? null,
      };
      setAnnotations((arr) => [...arr, optimistic]);
      clearSelectionAndPopup();

      const res = await fetch(`/api/attempts/${attemptId}/annotations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId,
          startOffset: optimistic.startOffset,
          endOffset: optimistic.endOffset,
          text: optimistic.text,
          color,
          note: note ?? null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.annotation) {
        setAnnotations((arr) =>
          arr.map((a) => (a.id === optimistic.id ? data.annotation : a)),
        );
      } else {
        // Roll back on failure.
        setAnnotations((arr) => arr.filter((a) => a.id !== optimistic.id));
      }
    },
    [attemptId, popup, questionId],
  );

  const deleteAnnotation = useCallback(
    async (id: string) => {
      setAnnotations((arr) => arr.filter((a) => a.id !== id));
      await fetch(`/api/attempts/${attemptId}/annotations/${id}`, {
        method: "DELETE",
      }).catch(() => {});
    },
    [attemptId],
  );

  const updateAnnotation = useCallback(
    async (id: string, patch: { note?: string | null; color?: AnnotationColor }) => {
      setAnnotations((arr) =>
        arr.map((a) => (a.id === id ? { ...a, ...patch } : a)),
      );
      await fetch(`/api/attempts/${attemptId}/annotations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      }).catch(() => {});
    },
    [attemptId],
  );

  // ---------- Click on existing highlight ----------
  function onClick(e: React.MouseEvent) {
    const target = (e.target as HTMLElement).closest("[data-annotation-id]");
    if (!target) return;
    const id = target.getAttribute("data-annotation-id");
    if (!id) return;
    const ann = annotations.find((a) => a.id === id);
    if (!ann) return;
    const next = window.prompt(
      `Note for "${ann.text.slice(0, 60)}…"\n(Leave blank to clear. Type "delete" to remove the highlight.)`,
      ann.note ?? "",
    );
    if (next === null) return;
    if (next.trim().toLowerCase() === "delete") {
      void deleteAnnotation(ann.id);
    } else {
      void updateAnnotation(ann.id, { note: next || null });
    }
  }

  return (
    <div
      ref={wrapperRef}
      onMouseUp={onMouseUp}
      onClick={onClick}
      className="annotated-passage relative"
    >
      <RichContent html={passageHtml} />

      {popup.open && (
        <AnnotationPopup
          x={popup.x}
          y={popup.y}
          onPick={(color) => void createAnnotation(color)}
          onNote={() => {
            const note = window.prompt("Add a note for this highlight:");
            if (note === null) return;
            void createAnnotation("YELLOW", note || null);
          }}
          onClose={clearSelectionAndPopup}
        />
      )}
    </div>
  );
}

function AnnotationPopup({
  x,
  y,
  onPick,
  onNote,
  onClose,
}: {
  x: number;
  y: number;
  onPick: (c: AnnotationColor) => void;
  onNote: () => void;
  onClose: () => void;
}) {
  // Click outside to dismiss.
  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      const t = e.target as HTMLElement;
      if (!t.closest("[data-annotation-popup]")) onClose();
    }
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [onClose]);

  return (
    <div
      data-annotation-popup
      style={{ position: "fixed", left: x, top: y, transform: "translate(-50%, -100%)" }}
      className="z-50 flex items-center gap-1 rounded-md border border-neutral-300 bg-white p-1 shadow-lg"
    >
      <button
        type="button"
        onClick={() => onPick("YELLOW")}
        className="h-6 w-6 rounded bg-yellow-300 hover:ring-2 hover:ring-yellow-500"
        title="Highlight yellow"
        aria-label="Highlight yellow"
      />
      <button
        type="button"
        onClick={() => onPick("BLUE")}
        className="h-6 w-6 rounded bg-sky-300 hover:ring-2 hover:ring-sky-500"
        title="Highlight blue"
        aria-label="Highlight blue"
      />
      <button
        type="button"
        onClick={() => onPick("PINK")}
        className="h-6 w-6 rounded bg-pink-300 hover:ring-2 hover:ring-pink-500"
        title="Highlight pink"
        aria-label="Highlight pink"
      />
      <button
        type="button"
        onClick={onNote}
        className="ml-1 rounded border border-neutral-300 px-2 py-0.5 text-xs hover:bg-neutral-100"
      >
        Add note
      </button>
    </div>
  );
}

// ---------- DOM utilities ----------

/** Climb up the tree looking for a particular attribute. */
function climbForAttr(node: Node | null, attr: string): HTMLElement | null {
  let cur: Node | null = node;
  while (cur && cur !== document) {
    if (cur instanceof HTMLElement && cur.hasAttribute(attr)) return cur;
    cur = cur.parentNode;
  }
  return null;
}

/** Compute plain-text offsets for a Range within a root element. */
function computeRangeOffsets(
  root: HTMLElement,
  range: Range,
): { start: number; end: number } | null {
  const start = textOffsetOf(root, range.startContainer, range.startOffset);
  const end = textOffsetOf(root, range.endContainer, range.endOffset);
  if (start < 0 || end < 0 || end <= start) return null;
  return { start, end };
}

function textOffsetOf(root: HTMLElement, node: Node, nodeOffset: number): number {
  // Walk text nodes in document order, accumulating length until we hit `node`.
  let offset = 0;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let cur: Node | null = walker.nextNode();
  while (cur) {
    if (cur === node) {
      return offset + nodeOffset;
    }
    offset += (cur.textContent || "").length;
    cur = walker.nextNode();
  }
  // If the range endpoint is not a text node (e.g. an element), use the
  // textContent length up to that element.
  if (node.nodeType === Node.ELEMENT_NODE) {
    const el = node as HTMLElement;
    if (root.contains(el)) {
      // Sum text up to the element-and-children of the offsetth child.
      let total = 0;
      const w2 = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      let n: Node | null = w2.nextNode();
      while (n) {
        if (el.contains(n)) break;
        total += (n.textContent || "").length;
        n = w2.nextNode();
      }
      return total;
    }
  }
  return -1;
}

/** Remove existing highlight wrappers, restoring underlying text nodes. */
function unwrapHighlights(root: HTMLElement) {
  const highlights = Array.from(root.querySelectorAll("[data-annotation-id]"));
  for (const span of highlights) {
    const parent = span.parentNode;
    if (!parent) continue;
    while (span.firstChild) parent.insertBefore(span.firstChild, span);
    parent.removeChild(span);
    parent.normalize();
  }
}

/** Wrap the text range [start, end) in colored spans, splitting text nodes as needed. */
function wrapRange(
  root: HTMLElement,
  start: number,
  end: number,
  ann: AnnotationRow,
) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let pos = 0;
  const wraps: { node: Text; from: number; to: number }[] = [];

  let cur: Node | null = walker.nextNode();
  while (cur) {
    const t = cur as Text;
    const len = t.data.length;
    const nodeStart = pos;
    const nodeEnd = pos + len;
    if (nodeEnd > start && nodeStart < end) {
      const from = Math.max(0, start - nodeStart);
      const to = Math.min(len, end - nodeStart);
      if (to > from) wraps.push({ node: t, from, to });
    }
    pos = nodeEnd;
    if (pos >= end) break;
    cur = walker.nextNode();
  }

  for (const w of wraps) {
    const { node, from, to } = w;
    // Split so the middle slice is its own text node, then wrap that slice.
    let middle: Text = node;
    if (from > 0) middle = middle.splitText(from);
    if (to - from < middle.data.length) middle.splitText(to - from);
    const span = document.createElement("span");
    span.setAttribute("data-annotation-id", ann.id);
    span.className = `${COLOR_BG[ann.color]} cursor-pointer rounded-sm px-px transition-colors hover:brightness-95`;
    if (ann.note) {
      span.title = ann.note;
      // small marker
      span.setAttribute("data-has-note", "1");
    }
    middle.parentNode!.replaceChild(span, middle);
    span.appendChild(middle);
  }
}
