import type { Question } from "@prisma/client";

type ParsedSPR = {
  value: number;
  kind: "integer" | "decimal" | "fraction" | "mixed" | "percent";
  decimalPlaces: number;
};

/**
 * Normalize harmless formatting while retaining a readable answer form.
 * Numeric equivalence (fractions, mixed numbers, decimals, and percentages)
 * is handled by sprMatches rather than by lossy string conversion.
 */
export function normalizeSPR(raw: string): string {
  if (!raw) return "";
  const trimmed = raw.trim().replace(/^\+/, "");
  const mixed = trimmed.match(/^(-?\d+)\s+(\d+)\s*\/\s*(\d+)$/);
  if (mixed) {
    const whole = Number(mixed[1]);
    const numerator = Number(mixed[2]);
    const denominator = Number(mixed[3]);
    if (denominator !== 0) {
      const sign = mixed[1].startsWith("-") ? -1 : 1;
      return `${sign * (Math.abs(whole) * denominator + numerator)}/${denominator}`;
    }
  }

  let normalized = trimmed.replace(/\s+/g, "");
  if (/^-?\d*\.\d+$/.test(normalized)) {
    normalized = normalized.replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");
  }
  return normalized.toLowerCase();
}

function parseSPR(raw: string): ParsedSPR | null {
  const source = raw.trim().replace(/^\+/, "");
  if (!source) return null;

  const mixed = source.match(/^(-?\d+)\s+(\d+)\s*\/\s*(\d+)$/);
  if (mixed) {
    const whole = Number(mixed[1]);
    const numerator = Number(mixed[2]);
    const denominator = Number(mixed[3]);
    if (!Number.isFinite(whole) || denominator === 0) return null;
    const sign = mixed[1].startsWith("-") ? -1 : 1;
    return {
      value: sign * (Math.abs(whole) + numerator / denominator),
      kind: "mixed",
      decimalPlaces: 0,
    };
  }

  const compact = source.replace(/\s+/g, "");
  const fraction = compact.match(/^(-?\d+)\/(\d+)$/);
  if (fraction) {
    const numerator = Number(fraction[1]);
    const denominator = Number(fraction[2]);
    if (denominator === 0) return null;
    return { value: numerator / denominator, kind: "fraction", decimalPlaces: 0 };
  }

  const percent = compact.match(/^(-?(?:\d+(?:\.\d*)?|\.\d+))%$/);
  if (percent) {
    const value = Number(percent[1]);
    if (!Number.isFinite(value)) return null;
    return {
      value: value / 100,
      kind: "percent",
      decimalPlaces: percent[1].split(".")[1]?.length ?? 0,
    };
  }

  if (!/^-?(?:\d+(?:\.\d*)?|\.\d+)$/.test(compact)) return null;
  const value = Number(compact);
  if (!Number.isFinite(value)) return null;
  const decimalPlaces = compact.split(".")[1]?.length ?? 0;
  return {
    value,
    kind: decimalPlaces > 0 ? "decimal" : "integer",
    decimalPlaces,
  };
}

function numericallyEquivalent(left: ParsedSPR, right: ParsedSPR): boolean {
  const difference = Math.abs(left.value - right.value);
  if (difference <= 1e-12) return true;

  const rationalKinds = new Set(["fraction", "mixed"]);
  const leftIsRational = rationalKinds.has(left.kind);
  const rightIsRational = rationalKinds.has(right.kind);
  if (leftIsRational === rightIsRational) return false;

  const decimal = leftIsRational ? right : left;
  // Bluebook accepts a non-terminating fraction rounded or truncated to the
  // available response field. Two decimal places are intentionally too coarse.
  if (decimal.kind !== "decimal" || decimal.decimalPlaces < 3) return false;
  return difference <= 10 ** -decimal.decimalPlaces + Number.EPSILON;
}

export function sprMatches(response: string, acceptedAnswers: string[]): boolean {
  if (!response) return false;
  const normalized = normalizeSPR(response);
  if (!normalized) return false;
  const parsedResponse = parseSPR(response);

  return acceptedAnswers.some((accepted) => {
    if (normalizeSPR(accepted) === normalized) return true;
    const parsedAccepted = parseSPR(accepted);
    return Boolean(
      parsedResponse &&
        parsedAccepted &&
        numericallyEquivalent(parsedResponse, parsedAccepted),
    );
  });
}

export function isAnswerCorrect(
  question: Pick<Question, "type" | "correctAnswer" | "acceptedAnswers">,
  response: string,
): boolean {
  if (!response) return false;
  if (question.type === "MULTIPLE_CHOICE") {
    return response === question.correctAnswer;
  }
  const accepted = Array.isArray(question.acceptedAnswers)
    ? (question.acceptedAnswers as string[])
    : [question.correctAnswer];
  return sprMatches(response, accepted.length > 0 ? accepted : [question.correctAnswer]);
}
