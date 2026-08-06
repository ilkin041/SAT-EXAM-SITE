import Link from "next/link";

interface ScorePoint {
  attemptId: string;
  date: Date;
  testTitle: string;
  total: number;
  readingWriting: number;
  math: number;
}

export function ScoreTrend({
  points,
  admin = false,
}: {
  points: ScorePoint[];
  admin?: boolean;
}) {
  const ordered = [...points].sort((a, b) => a.date.getTime() - b.date.getTime());
  if (ordered.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card/40 p-6 text-center text-sm text-muted-foreground">
        No full-length completed scores yet. Short-test estimates are excluded from trends.
      </div>
    );
  }

  const width = 720;
  const height = 210;
  const padX = 34;
  const padY = 24;
  const x = (index: number) =>
    ordered.length === 1
      ? width / 2
      : padX + (index / (ordered.length - 1)) * (width - padX * 2);
  const y = (score: number) =>
    padY + ((1600 - score) / 1200) * (height - padY * 2);
  const path = ordered.map((point, index) => `${x(index)},${y(point.total)}`).join(" ");
  const delta = ordered.length > 1 ? ordered.at(-1)!.total - ordered[0].total : null;

  return (
    <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-bold">Full-length score trend</h3>
          <p className="text-xs text-muted-foreground">400–1600 scale · route caps applied</p>
        </div>
        {delta !== null && (
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${delta >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
            {delta >= 0 ? "+" : ""}{delta} since first shown
          </span>
        )}
      </div>
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-52 min-w-[620px] w-full" role="img" aria-label="SAT score trend over time">
          {[400, 800, 1200, 1600].map((score) => (
            <g key={score}>
              <line x1={padX} x2={width - padX} y1={y(score)} y2={y(score)} className="stroke-border" strokeDasharray="4 4" />
              <text x="2" y={y(score) + 4} className="fill-muted-foreground text-[10px]">{score}</text>
            </g>
          ))}
          {ordered.length > 1 && <polyline points={path} fill="none" className="stroke-primary" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />}
          {ordered.map((point, index) => (
            <g key={point.attemptId}>
              <circle cx={x(index)} cy={y(point.total)} r="5" className="fill-primary stroke-card" strokeWidth="2" />
              <text x={x(index)} y={y(point.total) - 10} textAnchor="middle" className="fill-foreground text-[11px] font-bold">{point.total}</text>
              <text x={x(index)} y={height - 3} textAnchor="middle" className="fill-muted-foreground text-[9px]">
                {point.date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
              </text>
            </g>
          ))}
        </svg>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {ordered.slice(-6).reverse().map((point) => (
          <Link
            key={point.attemptId}
            href={admin ? `/admin/attempts/${point.attemptId}` : `/results/${point.attemptId}`}
            className="rounded-lg border border-border/70 px-3 py-2 text-xs transition-colors hover:bg-muted/40"
          >
            <div className="truncate font-semibold">{point.testTitle}</div>
            <div className="mt-1 text-muted-foreground">{point.total} · R&amp;W {point.readingWriting} · Math {point.math}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
