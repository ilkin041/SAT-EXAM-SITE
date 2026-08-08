/**
 * The adaptive-routing diagram on the landing page's large capability tile
 * (T3.6). A server component — inline SVG plus CSS keyframes and nothing else,
 * so it costs the route zero client JavaScript.
 *
 * The whole diagram is drawn at rest: three boxes, three connectors, two
 * condition pills. The 6s loop only adds a travelling pulse and a branch
 * highlight, so it reads with the animation off, halfway through, and — the
 * acceptance criterion — without the caption underneath it. The keyframes and
 * the reduced-motion override live in `globals.css` under "Adaptive routing
 * diagram".
 *
 * **Two orientations, and that is a legibility fix, not decoration.** An SVG
 * scales its text with its viewBox, so the landscape diagram dropped into a
 * 360px column renders 245px wide — a 0.41 scale that takes an 11px label to
 * under 5px. There is no font size that survives both, because the same number
 * is being multiplied by two very different scales. So the narrow variant is
 * built in a ~260-unit box that renders close to 1:1 on a phone, with the two
 * branches side by side under the split rather than stacked to the right of it.
 * Only one is in the DOM's accessibility tree at a time: the other is
 * `display: none` via Tailwind's `hidden`, which removes it outright, so the
 * shared `aria-label` is never announced twice.
 *
 * `thresholdPercent` and `easyRouteCap` come from the database, not from this
 * file: the first is the `adaptiveThreshold` of the public test a visitor would
 * actually be routed by, the second is `EASY_ROUTE_CAP` from the scoring
 * module. Nothing here is a number the product cannot back.
 */

interface Props {
  /** `Test.adaptiveThreshold` as whole percent. */
  thresholdPercent: number;
  /** Scaled-score ceiling on a section routed to the easier Module 2. */
  easyRouteCap: number;
  /** Questions in Module 1 of that test. */
  module1Questions: number;
}

export function RoutingDiagram(props: Props) {
  const { thresholdPercent, easyRouteCap, module1Questions } = props;
  const label =
    `Module 1 holds ${module1Questions} mixed-difficulty questions. ` +
    `Score ${thresholdPercent}% or above on it and Module 2 is the harder set, which keeps the ` +
    `full 200 to 800 range. Score below ${thresholdPercent}% and Module 2 is the easier set, ` +
    `which caps the section at ${easyRouteCap}.`;

  return (
    <>
      <WideDiagram {...props} label={label} />
      <NarrowDiagram {...props} label={label} />
    </>
  );
}

/** Landscape: Module 1 on the left, the two branches stacked on the right. */
function WideDiagram({ thresholdPercent, easyRouteCap, module1Questions, label }: Props & { label: string }) {
  return (
    <svg
      viewBox="0 0 600 240"
      className="hidden h-auto w-full sm:block"
      role="img"
      aria-label={label}
    >
      {/* ---------- Module 1 ---------- */}
      <Card x={8} y={82} width={180} height={76} />
      <text x="28" y="115" className="fill-ink text-[13px] font-semibold">
        Module 1
      </text>
      <text x="28" y="136" className="fill-muted-foreground text-[11px]">
        <tspan className="tabular">{module1Questions}</tspan> questions, mixed
      </text>

      {/* ---------- Connectors, at rest ---------- */}
      <g className="stroke-border" strokeWidth="2" fill="none" strokeLinecap="round">
        <path d={WIDE_TRUNK} />
        <path d={WIDE_HARD} />
        <path d={WIDE_EASY} />
      </g>

      {/* The split. A filled node rather than a diamond: the condition is
          written on the branches, where the reader's eye already is. */}
      <circle cx="252" cy="120" r="6" className="fill-primary" />

      {/* ---------- Travelling pulses ---------- */}
      <Comets trunk={WIDE_TRUNK} hard={WIDE_HARD} easy={WIDE_EASY} />

      {/* ---------- Module 2, harder ---------- */}
      <Card x={348} y={20} width={240} height={76} highlight="hard" />
      <text x="368" y="53" className="fill-ink text-[13px] font-semibold">
        Module 2 — harder set
      </text>
      <text x="368" y="74" className="fill-muted-foreground text-[11px]">
        Keeps the full <tspan className="tabular">200–800</tspan> range
      </text>

      {/* ---------- Module 2, easier ---------- */}
      <Card x={348} y={144} width={240} height={76} highlight="easy" />
      <text x="368" y="177" className="fill-ink text-[13px] font-semibold">
        Module 2 — easier set
      </text>
      <text x="368" y="198" className="fill-muted-foreground text-[11px]">
        Section scores out of <tspan className="tabular">{easyRouteCap}</tspan>
      </text>

      {/* ---------- Condition pills, sitting on the branches ---------- */}
      <Pill x={256} y={79} width={92}>
        <tspan className="tabular">{thresholdPercent}%</tspan> or more
      </Pill>
      <Pill x={256} y={140} width={92}>
        under <tspan className="tabular">{thresholdPercent}%</tspan>
      </Pill>
    </svg>
  );
}

/** Portrait: Module 1 on top, the two branches side by side beneath the split. */
function NarrowDiagram({ thresholdPercent, easyRouteCap, module1Questions, label }: Props & { label: string }) {
  return (
    <svg
      viewBox="0 0 260 280"
      className="mx-auto h-auto w-full max-w-[260px] sm:hidden"
      role="img"
      aria-label={label}
    >
      {/* ---------- Module 1 ---------- */}
      <Card x={6} y={6} width={248} height={56} />
      <text x="22" y="31" className="fill-ink text-[13px] font-semibold">
        Module 1
      </text>
      <text x="22" y="50" className="fill-muted-foreground text-[11px]">
        <tspan className="tabular">{module1Questions}</tspan> questions, mixed
      </text>

      <g className="stroke-border" strokeWidth="2" fill="none" strokeLinecap="round">
        <path d={NARROW_TRUNK} />
        <path d={NARROW_HARD} />
        <path d={NARROW_EASY} />
      </g>
      <circle cx="130" cy="98" r="5" className="fill-primary" />

      <Comets trunk={NARROW_TRUNK} hard={NARROW_HARD} easy={NARROW_EASY} />

      {/* ---------- Module 2, harder ---------- */}
      <Card x={6} y={186} width={118} height={88} highlight="hard" />
      <text x="20" y="210" className="fill-ink text-[13px] font-semibold">
        Module 2
      </text>
      <text x="20" y="230" className="fill-muted-foreground text-[11px]">
        harder set
      </text>
      <text x="20" y="254" className="fill-muted-foreground text-[11px]">
        keeps <tspan className="tabular">200–800</tspan>
      </text>

      {/* ---------- Module 2, easier ---------- */}
      <Card x={136} y={186} width={118} height={88} highlight="easy" />
      <text x="150" y="210" className="fill-ink text-[13px] font-semibold">
        Module 2
      </text>
      <text x="150" y="230" className="fill-muted-foreground text-[11px]">
        easier set
      </text>
      <text x="150" y="254" className="fill-muted-foreground text-[11px]">
        out of <tspan className="tabular">{easyRouteCap}</tspan>
      </text>

      {/* ---------- Condition pills ---------- */}
      <Pill x={26} y={140} width={78}>
        <tspan className="tabular">{thresholdPercent}%</tspan> or more
      </Pill>
      <Pill x={156} y={140} width={78}>
        under <tspan className="tabular">{thresholdPercent}%</tspan>
      </Pill>
    </svg>
  );
}

// ---------- Connector geometry ----------
//
// Declared once each because the resting stroke and the travelling pulse are
// two paths over the same curve; a copied `d` string is a diagram whose comet
// drifts off its own line the first time somebody nudges one of them.

const WIDE_TRUNK = "M188,120 H246";
const WIDE_HARD = "M258,120 C302,120 302,58 348,58";
const WIDE_EASY = "M258,120 C302,120 302,182 348,182";

const NARROW_TRUNK = "M130,62 V92";
const NARROW_HARD = "M130,103 C130,140 65,140 65,186";
const NARROW_EASY = "M130,103 C130,140 195,140 195,186";

// ---------- Shared parts ----------

/**
 * A box, plus the tinted overlay that lights it when the pulse arrives.
 * `pathLength="100"` on the comets is what lets one set of keyframes drive a
 * straight trunk and two curves of different lengths.
 */
function Card({
  x,
  y,
  width,
  height,
  highlight,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  highlight?: "hard" | "easy";
}) {
  return (
    <>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx="14"
        className="fill-card stroke-border"
        strokeWidth="1.5"
      />
      {highlight && (
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          rx="14"
          className={`route-highlight fill-primary stroke-primary ${
            highlight === "hard" ? "route-highlight-hard" : "route-highlight-easy"
          }`}
          fillOpacity="0.08"
          strokeWidth="1.5"
        />
      )}
    </>
  );
}

function Comets({ trunk, hard, easy }: { trunk: string; hard: string; easy: string }) {
  return (
    <g className="stroke-primary" strokeWidth="3" fill="none" strokeLinecap="round">
      <path d={trunk} pathLength="100" className="route-comet route-comet-trunk" />
      <path d={hard} pathLength="100" className="route-comet route-comet-hard" />
      <path d={easy} pathLength="100" className="route-comet route-comet-easy" />
    </g>
  );
}

/** A condition label sitting on its branch, with a card fill so it stays readable. */
function Pill({
  x,
  y,
  width,
  children,
}: {
  x: number;
  y: number;
  width: number;
  children: React.ReactNode;
}) {
  return (
    <>
      <rect
        x={x}
        y={y}
        width={width}
        height="22"
        rx="11"
        className="fill-card stroke-border"
        strokeWidth="1.5"
      />
      <text
        x={x + width / 2}
        y={y + 15}
        textAnchor="middle"
        className="fill-muted-foreground text-[11px] font-semibold"
      >
        {children}
      </text>
    </>
  );
}
