import { Highlighter, Keyboard, ListChecks, Ruler, Sigma, Timer } from "lucide-react";
import { RoutingDiagram } from "@/components/marketing/routing-diagram";
import type { AdaptiveCapability } from "@/components/marketing/adaptive-capability";

/**
 * "What the product does" — the capability bento (T3.6). Replaces `Features`,
 * which was three equal cards saying three unequal things, one of them
 * ("Adaptive Testing") a claim the data could not back.
 *
 * Carries `id="product"`, which is what the header's Product nav item scrolls
 * to. `scroll-mt-16` clears the sticky 56px bar; without it the heading lands
 * underneath the header it was reached from.
 *
 * **Size encodes importance**, so the grid is asymmetric on purpose: adaptive
 * routing gets a tall tile with a diagram in it, the interface and the score
 * report get narrower ones with the detail in them, and the two facts that are
 * only facts get short tiles across the bottom. Spans only — **no
 * `col-start`/`row-start` anywhere.** Auto-placement then fills every track in
 * source order, which is what makes "no orphan tiles" a property of the grid
 * rather than of a hand-checked screenshot. The two layouts below (with and
 * without the adaptive tile) each tile a 12-column grid exactly.
 *
 * **No gradient anywhere in here.** `--gradient-primary` is already spoken for
 * on this page by the hero's demo rail, and policy allows it to be the hero
 * signature *or* a CTA, never two at once. `--gradient-accent` is unassigned
 * and stays that way. The tiles are flat surfaces, the same treatment
 * `Features` moved to in T1.8.
 *
 * The adaptive tile is nullable and that is the point: it renders only when
 * `loadAdaptiveCapability()` finds a public test that would genuinely route a
 * visitor. When it does not, the tile is *gone* — not disabled, not "coming
 * soon" — and the interface tile takes the large slot. That is what keeps the
 * acceptance criterion ("the adaptive claim matches what a new signup finds")
 * true without anybody remembering to check.
 */

interface Props {
  /** `null` when no public test would route a visitor. See the loader. */
  adaptive: AdaptiveCapability | null;
}

export function Capabilities({ adaptive }: Props) {
  return (
    <section id="product" className="scroll-mt-16">
      <div className="container mx-auto max-w-6xl px-4 py-16 md:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <p className="eyebrow text-primary">What you get</p>
          <h2 className="mt-3 text-h2 text-ink">Built to match the real thing</h2>
          <p className="mx-auto mt-3 max-w-[52ch] text-body-lg text-muted-foreground">
            Not a quiz app with an SAT theme. The same module structure, the same tools on
            screen, and a score report that tells you where to go next.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-12">
          {adaptive && (
            <Tile className="md:col-span-2 lg:col-span-7 lg:row-span-2">
              <TileHeading
                eyebrow="Adaptive mode"
                title="Module 2 is chosen by how you did on Module 1"
              />
              <p className="mt-3 max-w-[52ch] text-body text-muted-foreground">
                Do well enough on the first module and the second one is the harder set, which
                is the only route to the top of the scale. Fall short and you get the easier
                set, and that section scores out of {adaptive.easyRouteCap} instead of 800. It
                is the rule the Digital SAT itself uses, and the public adaptive test here runs
                it.
              </p>
              <div className="mt-6 rounded-xl border border-border/60 bg-paper-sunk p-4">
                <RoutingDiagram
                  thresholdPercent={adaptive.thresholdPercent}
                  easyRouteCap={adaptive.easyRouteCap}
                  module1Questions={adaptive.module1Questions}
                />
              </div>
            </Tile>
          )}

          {/* Promoted into the large slot when there is no adaptive tile. */}
          <Tile
            className={
              adaptive ? "lg:col-span-5" : "md:col-span-2 lg:col-span-7 lg:row-span-2"
            }
          >
            <TileHeading eyebrow="The interface" title="Every tool the real exam gives you" />
            <ul className="mt-4 space-y-2.5">
              <Spec icon={ListChecks} text="Answer eliminator, with the ABC toggle" />
              <Spec icon={Highlighter} text="Passage highlighting, and a note on a highlight" />
              <Spec icon={Sigma} text="The Desmos graphing calculator, built in" />
              <Spec icon={Ruler} text="The geometry reference sheet" />
              <Spec icon={Keyboard} text="Keyboard shortcuts for every control" />
              <Spec
                icon={Timer}
                text="A timer the server owns — closing the tab does not pause it"
              />
            </ul>
          </Tile>

          <Tile className="lg:col-span-5">
            <TileHeading eyebrow="After the test" title="A report that tells you what to do" />
            <p className="mt-3 text-body text-muted-foreground">
              A scaled score from 200 to 800 for each section and a total out of 1600, then the
              part that matters: how you did in every content domain you were tested on, the
              same split by question difficulty, and a written explanation on every question —
              including the ones you got right.
            </p>
          </Tile>

          <Tile className={adaptive ? "lg:col-span-6" : "lg:col-span-5"}>
            <TileHeading eyebrow="Devices" title="Works on an iPad" />
            <p className="mt-3 text-body text-muted-foreground">
              The full test runs in Safari or Chrome on a tablet — nothing to install. Built
              tablet-first, which is how the real exam is sat.
            </p>
          </Tile>

          <Tile className={adaptive ? "lg:col-span-6" : "lg:col-span-12"}>
            <TileHeading eyebrow="No sign-up wall" title="Start without an account" />
            <p className="mt-3 text-body text-muted-foreground">
              A public test is one click away, timed and scored like any other. The attempt is
              held against this browser by a signed cookie, so you can finish first and decide
              about an account afterwards.
            </p>
          </Tile>
        </div>
      </div>
    </section>
  );
}

/**
 * One tile. `h-full` so a tile sharing a row with a taller sibling still fills
 * it — without it the bento reads as a ragged collage rather than a grid.
 */
function Tile({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div
      className={`flex h-full flex-col rounded-2xl border border-border/60 bg-card p-6 shadow-card transition-shadow duration-200 hover:shadow-elevated md:p-7 ${className ?? ""}`}
    >
      {children}
    </div>
  );
}

/**
 * Every tile title is `text-h3`. The rungs above it are fluid `clamp()` and the
 * type scale forbids responsive size variants, so the hierarchy in this section
 * is carried by area — which is the whole idea of a bento — rather than by five
 * different heading sizes fighting the section's own `text-h2`.
 */
function TileHeading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <>
      <p className="eyebrow text-muted-foreground">{eyebrow}</p>
      <h3 className="mt-2 text-h3 text-ink">{title}</h3>
    </>
  );
}

/**
 * One line of the interface list. Specificity is the proof here — a reader who
 * has sat the real exam recognises "the ABC toggle" and cannot recognise "a
 * familiar testing experience" — so every row names one thing that exists in
 * `src/app/test/attempt/**` and nothing that does not.
 */
function Spec({
  icon: Icon,
  text,
}: {
  icon: React.ComponentType<{ className?: string }>;
  text: string;
}) {
  return (
    <li className="flex items-start gap-3 text-body text-muted-foreground">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
      <span>{text}</span>
    </li>
  );
}
