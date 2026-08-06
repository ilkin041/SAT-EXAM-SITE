import { describe, expect, it } from "vitest";
import { Linter } from "eslint";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const plugin = require("../eslint-rules");

/**
 * The guardrails from T0.4. These rules are the only thing making the
 * definition of done in CLAUDE.md enforceable, so a silent false negative in
 * one of them is worse than no rule at all — `bg-primary/8` slipped past an
 * early draft of the Tailwind rule because `bg-primary` resolves.
 */

const linter = new Linter();
for (const [name, rule] of Object.entries(plugin.rules)) {
  linter.defineRule(`sat/${name}`, rule as never);
}

const PARSER_OPTIONS = {
  ecmaVersion: 2022 as const,
  sourceType: "module" as const,
  ecmaFeatures: { jsx: true },
};

function lint(code: string, rule: string, filename = "src/app/probe/thing.tsx") {
  return linter.verify(
    code,
    { parserOptions: PARSER_OPTIONS, rules: { [`sat/${rule}`]: "error" } },
    filename
  );
}

function messagesFor(code: string, rule: string, filename?: string) {
  return lint(code, rule, filename).map((m: Linter.LintMessage) => m.message);
}

describe("sat/no-unresolved-tailwind-class", () => {
  const wrap = (classes: string) => `const x = <div className="${classes}" />;`;

  it.each([
    "py-4.5",
    "p-5.5",
    "h-4.5",
    "bg-primary/8",
    "dark:text-emerald-350",
    "text-amber-850",
    "dark:text-amber-250",
  ])("flags the dead class %s", (cls) => {
    expect(messagesFor(wrap(cls), "no-unresolved-tailwind-class")).toHaveLength(1);
  });

  it.each([
    "py-4",
    "p-5",
    "h-5 w-5",
    "bg-primary/[0.08]",
    "dark:text-emerald-300",
    "shadow-xs",
    "text-accent-warm",
    "font-mono tabular-nums",
    // Declared in globals.css, including under a variant Tailwind cannot
    // generate for a plain CSS class on its own.
    "hover-lift active-press",
    "hover:glow-primary",
    "group peer",
    "group/card group-hover/card:opacity-100",
    "data-[state=open]:bg-muted [&>svg]:size-4",
  ])("accepts %s", (cls) => {
    expect(messagesFor(wrap(cls), "no-unresolved-tailwind-class")).toEqual([]);
  });

  it("does not read cva variant keys as class names", () => {
    const code = `const v = cva("flex", { variants: { size: { sm: "p-2", lg: "p-4" } }, defaultVariants: { size: "sm" } });`;
    expect(messagesFor(code, "no-unresolved-tailwind-class")).toEqual([]);
  });

  it("skips tokens cut in half by an interpolation", () => {
    const code = "const x = <div className={`text-${tone}-500 flex`} />;";
    expect(messagesFor(code, "no-unresolved-tailwind-class")).toEqual([]);
  });
});

describe("sat/no-raw-color", () => {
  it("flags a hex literal", () => {
    const code = `const x = <div className="via-[#1e305e]" />;`;
    expect(messagesFor(code, "no-raw-color")).toHaveLength(1);
  });

  it("flags a spelled-out colour function", () => {
    const code = `const x = <div style={{ background: "hsla(228, 60%, 50%, 0.03)" }} />;`;
    expect(messagesFor(code, "no-raw-color")).toHaveLength(1);
  });

  it("accepts a colour function that reads a token", () => {
    const code = `const x = "linear-gradient(90deg, hsl(var(--primary) / 0.2), transparent)";`;
    expect(messagesFor(code, "no-raw-color")).toEqual([]);
  });

  it("does not mistake a fragment link for a colour", () => {
    const code = `const x = <a href="#features">Features</a>;`;
    expect(messagesFor(code, "no-raw-color")).toEqual([]);
  });
});

describe("sat/no-inline-color-style", () => {
  it("flags a raw colour in an inline style", () => {
    const code = `const x = <div style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)" }} />;`;
    expect(messagesFor(code, "no-inline-color-style")).toHaveLength(1);
  });

  it("flags a colour computed in JS", () => {
    const code = `const x = <div style={{ color: tone }} />;`;
    expect(messagesFor(code, "no-inline-color-style")).toHaveLength(1);
  });

  it("accepts a token-based inline colour", () => {
    const code = `const x = <div style={{ backgroundImage: "radial-gradient(circle, hsl(var(--foreground)) 1px, transparent 1px)" }} />;`;
    expect(messagesFor(code, "no-inline-color-style")).toEqual([]);
  });

  it("leaves dynamic geometry alone", () => {
    const code = "const x = <div style={{ width: `${pct}%`, transform: `translateX(${x}px)` }} />;";
    expect(messagesFor(code, "no-inline-color-style")).toEqual([]);
  });
});

describe("sat/no-class-constants", () => {
  it("flags a module-level *_CLS constant", () => {
    expect(messagesFor(`const SELECT_CLS = "h-10 rounded-xl";`, "no-class-constants")).toHaveLength(1);
  });

  it("flags an exported *_CLASSES constant", () => {
    expect(messagesFor(`export const CARD_CLASSES = "rounded-2xl";`, "no-class-constants")).toHaveLength(1);
  });

  it("ignores a local variable inside a component", () => {
    const code = `function C() { const SELECT_CLS = "h-10"; return null; }`;
    expect(messagesFor(code, "no-class-constants")).toEqual([]);
  });
});

describe("sat/no-client-page", () => {
  it('flags "use client" in a page', () => {
    const code = `"use client";\nexport default function P() { return null; }`;
    expect(messagesFor(code, "no-client-page", "src/app/dashboard/page.tsx")).toHaveLength(1);
  });

  it('flags "use client" in a layout', () => {
    const code = `"use client";\nexport default function L() { return null; }`;
    expect(messagesFor(code, "no-client-page", "src/app/admin/layout.tsx")).toHaveLength(1);
  });

  it("allows it in a client island", () => {
    const code = `"use client";\nexport function Form() { return null; }`;
    expect(messagesFor(code, "no-client-page", "src/app/login/login-form.tsx")).toEqual([]);
  });
});
