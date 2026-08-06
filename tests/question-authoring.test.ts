import { describe, expect, it } from "vitest";
import {
  questionContentHash,
  selectQuestionImportIndices,
} from "@/lib/question-content-hash";
import {
  isDomainForSection,
  normalizeQuestionDomain,
} from "@/lib/question-taxonomy";

describe("question content hashes", () => {
  it("normalizes markup, case, and whitespace", () => {
    const first = questionContentHash({
      passage: "<p>  Shared PASSAGE </p>",
      stem: "<strong>What is x?</strong>",
    });
    const second = questionContentHash({
      passage: "shared passage",
      stem: " what IS   x? ",
    });

    expect(first).toBe(second);
  });

  it("includes passage content when identifying duplicates", () => {
    expect(questionContentHash({ stem: "Same stem", passage: "A" })).not.toBe(
      questionContentHash({ stem: "Same stem", passage: "B" }),
    );
  });

  it("adds nothing when every imported hash already exists", () => {
    expect(
      selectQuestionImportIndices({
        hashes: ["hash-a", "hash-b"],
        existingHashes: ["hash-a", "hash-b"],
      }),
    ).toEqual([]);
  });

  it("allows an explicitly kept duplicate row", () => {
    expect(
      selectQuestionImportIndices({
        hashes: ["hash-a", "hash-a"],
        existingHashes: ["hash-a"],
        keepDuplicateIndices: [1],
      }),
    ).toEqual([1]);
  });
});

describe("closed SAT domain taxonomy", () => {
  it("normalizes legacy aliases to canonical domains", () => {
    expect(normalizeQuestionDomain("Geometry")).toBe("Geometry and Trigonometry");
    expect(normalizeQuestionDomain("Problem Solving and Data Analysis")).toBe(
      "Problem-Solving and Data Analysis",
    );
  });

  it("rejects domains assigned to the wrong section", () => {
    expect(isDomainForSection("Algebra", "MATH")).toBe(true);
    expect(isDomainForSection("Algebra", "READING_WRITING")).toBe(false);
  });
});
