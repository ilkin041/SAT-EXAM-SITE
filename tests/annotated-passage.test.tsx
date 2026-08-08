import { useState } from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AnnotatedPassage, type AnnotationRow } from "@/components/annotated-passage";

/**
 * Regression cover for the highlight-erasure bug.
 *
 * Highlights are spans this component splices into HTML that React owns
 * through `dangerouslySetInnerHTML`. In the built app, re-rendering the test
 * interface re-applied that HTML — measured at six rewrites a second, with a
 * byte-identical string — and every rewrite threw the spans away. A student's
 * highlight disappeared about a second after they made it, while the header
 * still read "1 saved".
 *
 * The fix has two halves and this file covers both by *behaviour*, because the
 * cause is a React-internal decision to re-run `setInnerHTML` and pinning that
 * would be pinning React. `memo` on `RichHtml` stops the rewrite; the redraw
 * pass in `AnnotatedPassage` puts the highlight back if anything rebuilds the
 * passage anyway. The second test simulates that rebuild directly, so it fails
 * if the redraw pass goes back to running only when the annotations change.
 *
 * The ticking parent **renders the passage itself** rather than taking it as
 * `children`. That is the whole game: an element passed through `children` is
 * the same object on every render, React bails out of the subtree, and a test
 * built that way passes whether or not the bug is fixed. Both of these did,
 * until the harness was corrected.
 */

/** Stands in for the interface's timer: re-renders the passage once per click. */
function TickingPassage(props: { passageHtml: string; questionId: string }) {
  const [tick, setTick] = useState(0);
  return (
    <div>
      <button onClick={() => setTick((t) => t + 1)}>tick</button>
      <span data-testid="tick">{tick}</span>
      <AnnotatedPassage
        passageHtml={props.passageHtml}
        attemptId="attempt-1"
        questionId={props.questionId}
      />
    </div>
  );
}

const annotation: AnnotationRow = {
  id: "ann-1",
  questionId: "q1",
  // Offsets into the passage's plain text: "bravo" in "alpha bravo charlie".
  startOffset: 6,
  endOffset: 11,
  text: "bravo",
  color: "YELLOW",
  note: null,
};

function stubAnnotations(rows: (url: string) => AnnotationRow[]) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => ({ json: async () => ({ ok: true, annotations: rows(url) }) })),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("AnnotatedPassage", () => {
  it("keeps a saved highlight on screen across re-renders", async () => {
    stubAnnotations(() => [annotation]);
    const { container } = render(
      <TickingPassage passageHtml="<p>alpha bravo charlie</p>" questionId="q1" />,
    );

    await waitFor(() => {
      expect(container.querySelector("[data-annotation-id]")?.textContent).toBe("bravo");
    });

    await act(async () => {
      fireEvent.click(screen.getByText("tick"));
      fireEvent.click(screen.getByText("tick"));
      fireEvent.click(screen.getByText("tick"));
    });
    expect(screen.getByTestId("tick").textContent).toBe("3");

    const highlight = container.querySelector("[data-annotation-id]");
    expect(highlight, "the highlight was erased by a re-render").not.toBeNull();
    expect(highlight?.textContent).toBe("bravo");
    // Drawn once, not stacked up by the redraw pass.
    expect(container.querySelectorAll("[data-annotation-id]")).toHaveLength(1);
  });

  it("redraws the highlight if the passage HTML is rebuilt underneath it", async () => {
    stubAnnotations(() => [annotation]);
    const { container } = render(
      <TickingPassage passageHtml="<p>alpha bravo charlie</p>" questionId="q1" />,
    );
    await waitFor(() => {
      expect(container.querySelector("[data-annotation-id]")).not.toBeNull();
    });

    // Exactly what a re-applied `dangerouslySetInnerHTML` does: the passage
    // comes back and the spans spliced into it do not.
    container.querySelector(".rich-content")!.innerHTML = "<p>alpha bravo charlie</p>";
    expect(container.querySelector("[data-annotation-id]")).toBeNull();

    await act(async () => {
      fireEvent.click(screen.getByText("tick"));
    });

    const redrawn = container.querySelector("[data-annotation-id]");
    expect(redrawn, "the highlight was not redrawn after the passage rebuilt").not.toBeNull();
    expect(redrawn?.textContent).toBe("bravo");
  });

  it("drops the previous question's highlights when the question changes", async () => {
    // The second question's fetch never resolves, so the only thing that can
    // clear the first question's highlight is the reset. Otherwise this passes
    // on the response rather than on the behaviour under test.
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) =>
        url.includes("questionId=q1")
          ? { json: async () => ({ ok: true, annotations: [annotation] }) }
          : new Promise<never>(() => {}),
      ),
    );
    const { container, rerender } = render(
      <TickingPassage passageHtml="<p>alpha bravo charlie</p>" questionId="q1" />,
    );
    await waitFor(() => {
      expect(container.querySelector("[data-annotation-id]")).not.toBeNull();
    });

    // A different question with a different passage. The offsets belong to the
    // old one, so carrying them over highlights the wrong words.
    rerender(<TickingPassage passageHtml="<p>delta echo foxtrot</p>" questionId="q2" />);

    await waitFor(() => {
      expect(container.querySelector("[data-annotation-id]")).toBeNull();
    });
  });
});
