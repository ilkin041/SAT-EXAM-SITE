export const QUESTION_DOMAINS = {
  READING_WRITING: [
    "Information and Ideas",
    "Craft and Structure",
    "Expression of Ideas",
    "Standard English Conventions",
  ],
  MATH: [
    "Algebra",
    "Advanced Math",
    "Problem-Solving and Data Analysis",
    "Geometry and Trigonometry",
  ],
} as const;

export type QuestionDomain = (typeof QUESTION_DOMAINS)[keyof typeof QUESTION_DOMAINS][number];
export type QuestionSectionType = keyof typeof QUESTION_DOMAINS;

const DOMAIN_ALIASES: Record<string, QuestionDomain> = {
  geometry: "Geometry and Trigonometry",
  "problem solving and data analysis": "Problem-Solving and Data Analysis",
};

export const ALL_QUESTION_DOMAINS = [
  ...QUESTION_DOMAINS.READING_WRITING,
  ...QUESTION_DOMAINS.MATH,
] as const;

export function normalizeQuestionDomain(value: string): QuestionDomain | null {
  const trimmed = value.trim();
  const exact = ALL_QUESTION_DOMAINS.find(
    (domain) => domain.toLocaleLowerCase() === trimmed.toLocaleLowerCase(),
  );
  return exact ?? DOMAIN_ALIASES[trimmed.toLocaleLowerCase()] ?? null;
}

export function isDomainForSection(
  domain: string,
  sectionType: QuestionSectionType,
): domain is QuestionDomain {
  return (QUESTION_DOMAINS[sectionType] as readonly string[]).includes(domain);
}
