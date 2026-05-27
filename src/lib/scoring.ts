/**
 * Scoring helpers for SAT-style tests.
 *
 *  - Raw score = number of correct answers in a section.
 *  - Scaled score = 200–800 per section, looked up from an admin-supplied
 *    table or, by default, computed as a linear mapping.
 *  - Total = R&W scaled + Math scaled (400–1600).
 *
 * The scoring table on a Test is stored as JSON with this shape:
 *   { readingWriting?: number[]; math?: number[] }
 * Each array is indexed by raw score (so array length should be max + 1).
 */

export interface ScoringTable {
  readingWriting?: number[];
  math?: number[];
}

export const SCALED_MIN = 200;
export const SCALED_MAX = 800;

/**
 * Convert a raw score to a 200–800 scaled score.
 *
 *  - When a `table` is provided, the scaled score is read directly at index
 *    `raw` (clamped to the table's bounds). Tables are typically calibrated
 *    by item-response analysis; the order and any non-linearity is preserved.
 *  - With no table, falls back to a linear mapping where 0 correct → 200
 *    and `max` correct → 800. Values are rounded to the nearest integer.
 */
export function scaleScore(raw: number, max: number, table?: number[]): number {
  const clampedRaw = Math.max(0, Math.min(Math.round(raw), Math.max(0, max)));
  if (table && table.length > 0) {
    const idx = Math.min(clampedRaw, table.length - 1);
    const value = table[idx];
    if (typeof value === "number" && Number.isFinite(value)) {
      return clampScaled(value);
    }
  }
  if (max <= 0) return SCALED_MIN;
  const ratio = clampedRaw / max;
  return clampScaled(Math.round(SCALED_MIN + ratio * (SCALED_MAX - SCALED_MIN)));
}

function clampScaled(n: number) {
  return Math.max(SCALED_MIN, Math.min(SCALED_MAX, Math.round(n)));
}

// ---------- Aggregations over a TestAttempt ----------

export interface SectionRawScore {
  correct: number;
  total: number;
}

export interface AttemptRawScores {
  readingWriting: SectionRawScore;
  math: SectionRawScore;
}

export interface AttemptScaledScores {
  readingWriting: number;
  math: number;
  total: number;
}

export interface DomainStat {
  domain: string;
  correct: number;
  total: number;
}

export interface SectionDomainBreakdown {
  readingWriting: DomainStat[];
  math: DomainStat[];
}

/**
 * Compute raw per-section counts from a list of module results. The caller
 * supplies the section type for each result.
 */
export function computeRawScores(
  moduleResults: { sectionType: "READING_WRITING" | "MATH"; correctCount: number; totalCount: number }[],
): AttemptRawScores {
  const rw = { correct: 0, total: 0 };
  const math = { correct: 0, total: 0 };
  for (const r of moduleResults) {
    const bucket = r.sectionType === "READING_WRITING" ? rw : math;
    bucket.correct += r.correctCount;
    bucket.total += r.totalCount;
  }
  return { readingWriting: rw, math };
}

export function computeScaledScores(
  raw: AttemptRawScores,
  table?: ScoringTable | null,
): AttemptScaledScores {
  const rw = scaleScore(raw.readingWriting.correct, raw.readingWriting.total, table?.readingWriting);
  const math = scaleScore(raw.math.correct, raw.math.total, table?.math);
  return { readingWriting: rw, math, total: rw + math };
}

/**
 * Compute per-domain correct/total per section from the student's answers and
 * the questions they were served.
 */
export function computeDomainBreakdown(
  items: {
    sectionType: "READING_WRITING" | "MATH";
    domain: string;
    isCorrect: boolean;
  }[],
): SectionDomainBreakdown {
  const map = new Map<string, DomainStat>();

  const key = (s: "READING_WRITING" | "MATH", d: string) => `${s}|${d}`;

  for (const it of items) {
    const k = key(it.sectionType, it.domain);
    let cur = map.get(k);
    if (!cur) {
      cur = { domain: it.domain, correct: 0, total: 0 };
      map.set(k, cur);
    }
    cur.total += 1;
    if (it.isCorrect) cur.correct += 1;
  }

  const rw: DomainStat[] = [];
  const math: DomainStat[] = [];
  for (const [k, v] of map) {
    if (k.startsWith("READING_WRITING|")) rw.push(v);
    else math.push(v);
  }
  rw.sort((a, b) => a.domain.localeCompare(b.domain));
  math.sort((a, b) => a.domain.localeCompare(b.domain));
  return { readingWriting: rw, math };
}
