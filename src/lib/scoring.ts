/**
 * Scoring helpers for SAT-style tests.
 *
 *  - Raw score = number of correct answers in a section.
 *  - Scaled score = 200–800 per section, looked up from an admin-supplied
 *    table or, by default, from the embedded real Digital SAT conversion
 *    tables (54 R&W questions / 44 Math questions baseline).
 *  - Total = R&W scaled + Math scaled (400–1600).
 *
 * The scoring table on a Test is stored as JSON with this shape:
 *   { readingWriting?: number[]; math?: number[] }
 * Each array is indexed by raw score (so array length should be max + 1).
 *
 * When a table is used, the raw score is mapped proportionally onto the
 * table's index range so that tests with a different question count than
 * the table baseline still yield sensible scores.
 *
 * Example: a 10-question R&W test where the student gets 5 correct →
 *   proportionalIdx = round(5/10 × 54) = 27 → scaled 570
 */

export interface ScoringTable {
  readingWriting?: number[];
  math?: number[];
}

export const SCALED_MIN = 200;
export const SCALED_MAX = 800;

/**
 * Default Digital SAT Reading & Writing conversion table.
 * Index = raw score (0–54), value = scaled score (200–800).
 * Based on College Board Digital SAT released practice-test scoring guides.
 */
export const DEFAULT_RW_TABLE: number[] = [
  200, 200, 210, 230, 250, 270, 290, 310, 320, 340, // 0–9
  360, 380, 400, 410, 420, 440, 450, 460, 470, 490, // 10–19
  500, 510, 520, 530, 540, 550, 560, 570, 580, 590, // 20–29
  600, 610, 620, 630, 640, 650, 660, 670, 680, 700, // 30–39
  710, 720, 730, 740, 750, 760, 770, 780, 790, 790, // 40–49
  800, 800, 800, 800, 800,                           // 50–54
];

/**
 * Default Digital SAT Math conversion table.
 * Index = raw score (0–44), value = scaled score (200–800).
 */
export const DEFAULT_MATH_TABLE: number[] = [
  200, 210, 230, 250, 270, 290, 310, 330, 350, 380, // 0–9
  400, 420, 440, 460, 480, 500, 510, 520, 540, 560, // 10–19
  570, 580, 600, 610, 620, 640, 650, 670, 680, 700, // 20–29
  710, 720, 730, 740, 750, 760, 770, 780, 790, 800, // 30–39
  800, 800, 800, 800, 800,                           // 40–44
];

/**
 * Convert a raw score to a 200–800 scaled score.
 *
 * The `table` parameter is indexed by raw score, but the actual test may
 * have a different number of questions than the table's baseline. The raw
 * score is therefore mapped proportionally:
 *
 *   proportionalIdx = round(correct / max × (table.length − 1))
 *
 * This works correctly whether you're using the default 54- or 44-question
 * SAT table or a custom admin-supplied table sized to the test.
 *
 * Falls back to a linear 200–800 mapping if no table is provided.
 */
export function scaleScore(raw: number, max: number, table?: number[]): number {
  const clampedRaw = Math.max(0, Math.min(Math.round(raw), Math.max(0, max)));

  if (table && table.length > 0) {
    const tableMax = table.length - 1; // e.g. 54 for R&W, 44 for Math
    const proportionalIdx =
      max > 0
        ? Math.min(Math.round((clampedRaw / max) * tableMax), tableMax)
        : 0;
    const value = table[proportionalIdx];
    if (typeof value === "number" && Number.isFinite(value)) {
      return clampScaled(value);
    }
  }

  // Fallback linear (only reached when table is missing/corrupt)
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

/**
 * Convert raw scores to scaled scores using the admin-supplied scoring table
 * (if present) or the built-in Digital SAT default tables.
 *
 * Admin table entries override the defaults on a per-section basis, so you
 * can supply a custom Math table while keeping the default R&W table, etc.
 */
export function computeScaledScores(
  raw: AttemptRawScores,
  table?: ScoringTable | null,
): AttemptScaledScores {
  const rwTable = table?.readingWriting ?? DEFAULT_RW_TABLE;
  const mathTable = table?.math ?? DEFAULT_MATH_TABLE;
  const rw = scaleScore(raw.readingWriting.correct, raw.readingWriting.total, rwTable);
  const math = scaleScore(raw.math.correct, raw.math.total, mathTable);
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
