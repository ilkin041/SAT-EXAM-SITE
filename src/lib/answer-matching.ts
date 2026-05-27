import type { Question } from "@prisma/client";

/**
 * Normalize a student-produced-response string so equivalent forms compare equal:
 *   "1 / 2" -> "1/2", "0.50" -> "0.5", " -3 " -> "-3"
 */
export function normalizeSPR(raw: string): string {
  if (!raw) return "";
  let s = raw.trim();
  // Remove all whitespace
  s = s.replace(/\s+/g, "");
  // Collapse double decimals
  s = s.replace(/^\+/, ""); // leading + is meaningless

  // Fraction normalization: keep as-is but trim leading + and trailing zeros if it's a pure decimal.
  if (/^-?\d*\.\d+$/.test(s)) {
    // Strip trailing zeros after decimal: 0.50 -> 0.5, 4.0 -> 4
    s = s.replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");
  }
  // Leading zero on decimals: .5 stays .5; 0.5 stays 0.5 (don't unify or you'd reject ".5" vs "0.5")
  // Lowercase any letters (rare for SPR, but harmless).
  return s.toLowerCase();
}

export function sprMatches(response: string, acceptedAnswers: string[]): boolean {
  if (!response) return false;
  const norm = normalizeSPR(response);
  if (!norm) return false;
  return acceptedAnswers.some((a) => normalizeSPR(a) === norm);
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
  if (accepted.length === 0) return normalizeSPR(response) === normalizeSPR(question.correctAnswer);
  return sprMatches(response, accepted);
}
