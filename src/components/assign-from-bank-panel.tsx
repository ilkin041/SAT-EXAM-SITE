"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { assignQuestionToModule } from "@/app/admin/tests/module-question-actions";
import { cn } from "@/lib/utils";

interface BankRow {
  id: string;
  sectionType: "READING_WRITING" | "MATH";
  type: "MULTIPLE_CHOICE" | "STUDENT_PRODUCED_RESPONSE";
  domain: string;
  skill: string | null;
  difficulty: "EASY" | "MEDIUM" | "HARD" | "MIXED";
  stemPreview: string;
  assignmentCount: number;
  inModule: boolean;
}

interface Props {
  open: boolean;
  moduleId: string;
  moduleLabel: string;
  /** The section type of the target module — used to pre-filter results. */
  moduleSectionType: "READING_WRITING" | "MATH";
  /** Question IDs already assigned to this module (so the panel can show "Already added"). */
  initiallyAssignedIds: string[];
  onClose: () => void;
}

const DEBOUNCE_MS = 250;

export function AssignFromBankPanel({
  open,
  moduleId,
  moduleLabel,
  moduleSectionType,
  initiallyAssignedIds,
  onClose,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [query, setQuery] = useState("");
  const [type, setType] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [domain, setDomain] = useState("");
  // Defaults to the module's section type — admin can widen with "All".
  const [sectionType, setSectionType] = useState<string>(moduleSectionType);
  const [results, setResults] = useState<BankRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track which questions were added during this session, so the row label
  // flips to "Added" immediately without waiting for a re-fetch.
  const [locallyAdded, setLocallyAdded] = useState<Set<string>>(
    () => new Set(initiallyAssignedIds),
  );

  // Reset the "added" set whenever the parent reports a fresh assigned list.
  useEffect(() => {
    setLocallyAdded(new Set(initiallyAssignedIds));
  }, [initiallyAssignedIds]);

  // Debounced search.
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const search = useCallback(() => {
    if (!open) return;
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (type) params.set("type", type);
    if (difficulty) params.set("difficulty", difficulty);
    if (domain) params.set("domain", domain);
    if (sectionType) params.set("sectionType", sectionType);
    params.set("moduleId", moduleId);
    fetch(`/api/admin/questions/search?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        if (data?.ok) setResults(data.questions ?? []);
        else setError(data?.error ?? "Search failed");
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [open, query, type, difficulty, domain, sectionType, moduleId]);

  // Kick off a search whenever a filter changes (debounced).
  useEffect(() => {
    if (!open) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(search, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [open, search]);

  // Esc to close.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  function add(id: string) {
    setLocallyAdded((s) => new Set(s).add(id));
    startTransition(async () => {
      const res = await assignQuestionToModule(moduleId, id);
      if (!res.ok) {
        // Roll back if the server refused (e.g. race condition).
        setLocallyAdded((s) => {
          const next = new Set(s);
          next.delete(id);
          return next;
        });
        setError(res.error);
        return;
      }
      // Pull fresh server data so the parent module list updates.
      router.refresh();
    });
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex animate-in fade-in"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Scrim */}
      <div className="absolute inset-0 bg-black/30" aria-hidden />

      {/* Panel */}
      <aside
        className="relative ml-auto flex h-full w-full max-w-2xl flex-col border-l border-border bg-card shadow-2xl"
        role="dialog"
        aria-label="Add questions from bank"
      >
        <header className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <h2 className="text-base font-semibold">Add from bank</h2>
            <p className="text-xs text-muted-foreground">{moduleLabel}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded p-1 hover:bg-accent"
          >
            ✕
          </button>
        </header>

        <div className="space-y-3 border-b border-border px-5 py-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search stem, passage, domain, skill…"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            autoFocus
          />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <select
              value={sectionType}
              onChange={(e) => setSectionType(e.target.value)}
              className="rounded-md border border-input bg-background px-2 py-1.5 text-xs"
              title="Section"
            >
              <option value="">All sections</option>
              <option value="READING_WRITING">English (R&amp;W)</option>
              <option value="MATH">Math</option>
            </select>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="rounded-md border border-input bg-background px-2 py-1.5 text-xs"
            >
              <option value="">All types</option>
              <option value="MULTIPLE_CHOICE">Multiple choice</option>
              <option value="STUDENT_PRODUCED_RESPONSE">Student-produced</option>
            </select>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              className="rounded-md border border-input bg-background px-2 py-1.5 text-xs"
            >
              <option value="">All difficulties</option>
              <option value="EASY">Easy</option>
              <option value="MEDIUM">Medium</option>
              <option value="HARD">Hard</option>
              <option value="MIXED">Mixed</option>
            </select>
            <input
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="Domain"
              className="rounded-md border border-input bg-background px-2 py-1.5 text-xs"
            />
          </div>
        </div>

        {error && (
          <div className="border-b border-destructive/30 bg-destructive/10 px-5 py-2 text-xs text-destructive">
            {error}
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {loading && results.length === 0 ? (
            <p className="p-5 text-sm text-muted-foreground">Searching…</p>
          ) : results.length === 0 ? (
            <p className="p-5 text-sm text-muted-foreground">No questions match.</p>
          ) : (
            <ul className="divide-y divide-border">
              {results.map((q) => {
                const added = q.inModule || locallyAdded.has(q.id);
                return (
                  <li key={q.id} className="flex items-start gap-3 px-5 py-3 text-sm">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span className="rounded-full border border-border bg-muted px-2 py-0.5">
                          {q.type === "MULTIPLE_CHOICE" ? "MC" : "SPR"}
                        </span>
                        <span className="rounded-full border border-border bg-muted px-2 py-0.5">
                          {q.difficulty}
                        </span>
                        <span>{q.domain}</span>
                        {q.skill && <span>· {q.skill}</span>}
                      </div>
                      <div className="mt-1 line-clamp-2">{q.stemPreview}</div>
                    </div>
                    <div className="shrink-0">
                      {added ? (
                        <span className="rounded-md border border-border bg-muted px-3 py-1 text-xs text-muted-foreground">
                          Already added
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => add(q.id)}
                          disabled={pending}
                          className={cn(
                            "rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60",
                          )}
                        >
                          Add
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <footer className="border-t border-border px-5 py-3 text-xs text-muted-foreground">
          Click <span className="font-medium text-foreground">Add</span> on any row to append it
          to this module. The panel stays open so you can keep adding.
        </footer>
      </aside>
    </div>
  );
}
