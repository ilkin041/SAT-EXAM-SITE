import crypto from "node:crypto";
import sanitizeHtml from "sanitize-html";

function normalizeQuestionContent(value: string | null | undefined): string {
  return sanitizeHtml(value ?? "", { allowedTags: [], allowedAttributes: {} })
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function questionContentHash(input: {
  stem: string;
  passage?: string | null;
}): string {
  const content = `${normalizeQuestionContent(input.passage)}\n--stem--\n${normalizeQuestionContent(input.stem)}`;
  return crypto.createHash("sha256").update(content).digest("hex");
}

export function selectQuestionImportIndices(input: {
  hashes: string[];
  existingHashes: Iterable<string>;
  keepDuplicateIndices?: Iterable<number>;
}): number[] {
  const seen = new Set(input.existingHashes);
  const keep = new Set(input.keepDuplicateIndices ?? []);
  const selected: number[] = [];
  input.hashes.forEach((hash, index) => {
    if (seen.has(hash) && !keep.has(index)) return;
    selected.push(index);
    seen.add(hash);
  });
  return selected;
}
