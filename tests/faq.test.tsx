import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Faq } from "@/components/marketing/faq";
import { FAQ_ITEMS, faqAnswerText } from "@/lib/faq";
import { faqPageJsonLd } from "@/lib/json-ld";
import { LANDING_SECTIONS } from "@/lib/marketing-nav";
import { SITE_URL } from "@/lib/site";
import sitemap from "@/app/sitemap";

/**
 * T3.7. The acceptance criterion is that the structured data matches the
 * visible content exactly, and the way that criterion rots is not a bad commit
 * — it is somebody editing the copy a year from now. So this file compares the
 * emitted graph against the *rendered DOM*, not against `FAQ_ITEMS`: reading
 * both out of the same array would pass no matter how far the page had drifted
 * from either.
 *
 * The crawlability test is the other half, and it is a regression test with a
 * specific bug in mind. Radix's accordion renders `isOpen && children`, so a
 * closed panel is absent from the DOM rather than hidden. Building this section
 * on it would put one answer in the HTML while the graph claimed eight, and a
 * crawler renders a page but never clicks it. Nothing about that is visible on
 * screen, which is exactly why it is pinned here.
 */

/** Renders the section and returns the parsed `FAQPage` graph plus the DOM. */
function renderFaq() {
  const { container } = render(<Faq />);

  const script = container.querySelector('script[type="application/ld+json"]');
  expect(script).not.toBeNull();
  // `JsonLd` escapes `<` so a string cannot close the block early; undo that
  // before parsing, exactly as a browser's HTML parser would.
  const graph = JSON.parse(script!.innerHTML.replace(/\\u003c/g, "<"));

  return { container, graph };
}

describe("FAQ_ITEMS", () => {
  it("holds the eight items the task specified", () => {
    expect(FAQ_ITEMS).toHaveLength(8);
  });

  it("gives every item a unique id and a non-empty answer", () => {
    const ids = FAQ_ITEMS.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);

    for (const item of FAQ_ITEMS) {
      expect(item.question.endsWith("?")).toBe(true);
      expect(item.answer.length).toBeGreaterThan(0);
      for (const paragraph of item.answer) expect(paragraph.trim()).not.toBe("");
    }
  });

  it("keeps markup out of the answers, so the two renderings cannot diverge", () => {
    // `acceptedAnswer.text` is a plain string. Anything the page could render
    // as an element — a link, a list, an emphasis — is content the graph would
    // carry as literal angle brackets or drop entirely.
    for (const item of FAQ_ITEMS) {
      for (const paragraph of item.answer) {
        expect(paragraph).not.toMatch(/<[a-z/]/i);
        expect(paragraph).not.toMatch(/\[.*\]\(.*\)/);
      }
    }
  });
});

describe("faqPageJsonLd", () => {
  it("is a FAQPage carrying every item", () => {
    const graph = faqPageJsonLd();

    expect(graph["@context"]).toBe("https://schema.org");
    expect(graph["@type"]).toBe("FAQPage");
    expect(graph.url).toBe(`${SITE_URL}/faq`);
    expect(graph.mainEntity).toHaveLength(FAQ_ITEMS.length);

    for (const [index, entity] of graph.mainEntity.entries()) {
      const item = FAQ_ITEMS[index];
      expect(entity["@type"]).toBe("Question");
      expect(entity.name).toBe(item.question);
      expect(entity.acceptedAnswer["@type"]).toBe("Answer");
      expect(entity.acceptedAnswer.text).toBe(faqAnswerText(item));
    }
  });

  it("claims nothing the product cannot back", () => {
    const graph = faqPageJsonLd() as unknown as Record<string, unknown>;
    expect(graph.aggregateRating).toBeUndefined();
    expect(graph.offers).toBeUndefined();
    expect(graph.review).toBeUndefined();
  });
});

describe("Faq section", () => {
  it("puts every answer in the DOM, including the collapsed ones", () => {
    // The regression test. Eight `<details>`, eight answers rendered, whether
    // or not the row is open. A disclosure that mounts its panel on click
    // fails here.
    const { container } = renderFaq();

    const rows = container.querySelectorAll("details");
    expect(rows).toHaveLength(FAQ_ITEMS.length);

    for (const [index, row] of Array.from(rows).entries()) {
      const item = FAQ_ITEMS[index];
      const paragraphs = Array.from(row.querySelectorAll("div p")).map(
        (p) => p.textContent,
      );
      expect(paragraphs).toEqual([...item.answer]);
    }
  });

  it("opens the first item and leaves the rest collapsed", () => {
    const { container } = renderFaq();
    const open = Array.from(container.querySelectorAll("details")).map(
      (row) => (row as HTMLDetailsElement).open,
    );

    expect(open[0]).toBe(true);
    expect(open.slice(1).every((state) => state === false)).toBe(true);
  });

  it("emits structured data identical to what the page renders", () => {
    // The acceptance criterion itself, read off the DOM rather than off the
    // source array. Question text and answer text both, in document order.
    const { container, graph } = renderFaq();
    const rows = Array.from(container.querySelectorAll("details"));

    expect(graph.mainEntity).toHaveLength(rows.length);

    for (const [index, row] of rows.entries()) {
      const question = row.querySelector("summary h2, summary h3")!.textContent;
      const answer = Array.from(row.querySelectorAll("div p"))
        .map((p) => p.textContent)
        .join("\n\n");

      expect(graph.mainEntity[index].name).toBe(question);
      expect(graph.mainEntity[index].acceptedAnswer.text).toBe(answer);
    }
  });

  it("puts the questions in the document outline at the level the page asks for", () => {
    // As a section of `/` the title is an `h2` and a question is an `h3`; as
    // the whole of `/faq` the title is the `h1` and a question moves up to
    // `h2`. A `<summary>` may hold a heading as its sole content, which is what
    // keeps these out of the "eight unlabelled buttons" shape.
    const section = render(<Faq />).container;
    expect(section.querySelectorAll("summary h3")).toHaveLength(FAQ_ITEMS.length);
    expect(section.querySelector("h2")).not.toBeNull();

    const page = render(<Faq headingLevel={1} />).container;
    expect(page.querySelectorAll("summary h2")).toHaveLength(FAQ_ITEMS.length);
    expect(page.querySelector("h1")).not.toBeNull();
  });

  it("keeps its links outside the marked-up answers", () => {
    // A link inside an answer is content `acceptedAnswer.text` cannot carry.
    const { container } = renderFaq();
    for (const row of Array.from(container.querySelectorAll("details"))) {
      expect(row.querySelector("a")).toBeNull();
    }
    // ...and the section still offers a way out.
    expect(container.querySelector('a[href="/practice"]')).not.toBeNull();
  });
});

describe("FAQ wiring", () => {
  it("declares its section so the header nav item resolves", () => {
    // `MarketingHeader` renders only the nav items whose section the page
    // declares. Without this the FAQ item stays hidden even though `/` has the
    // section — the failure is a missing link, which nothing else would catch.
    expect(LANDING_SECTIONS).toContain("faq");
  });

  it("lists /faq in the sitemap", () => {
    expect(sitemap().map((entry) => entry.url)).toContain(`${SITE_URL}/faq`);
  });
});
