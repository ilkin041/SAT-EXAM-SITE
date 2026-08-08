/**
 * The LaTeX source for the SAT geometry reference sheet.
 *
 * This is the authoring copy. The typeset copy lives in
 * `reference-sheet-formulas.generated.ts`, produced by
 * `npm run gen:reference-sheet` and kept honest by `tests/reference-sheet.test.ts`.
 *
 * Two files instead of one because `ReferenceSheet` is a client component
 * inside the test interface: rendering these twelve formulas at runtime would
 * pull KaTeX back into the student bundle to typeset content that never
 * changes.
 */
export const REFERENCE_FORMULAS: { title: string; latex: string }[] = [
  { title: "Area of a circle", latex: "$$A = \\pi r^2$$" },
  { title: "Circumference of a circle", latex: "$$C = 2\\pi r$$" },
  { title: "Area of a rectangle", latex: "$$A = \\ell w$$" },
  { title: "Area of a triangle", latex: "$$A = \\tfrac{1}{2} b h$$" },
  { title: "Pythagorean theorem", latex: "$$c^2 = a^2 + b^2$$" },
  {
    title: "Special right triangle (45°–45°–90°)",
    latex: "$$\\text{sides in ratio } x : x : x\\sqrt{2}$$",
  },
  {
    title: "Special right triangle (30°–60°–90°)",
    latex: "$$\\text{sides in ratio } x : x\\sqrt{3} : 2x$$",
  },
  { title: "Volume of a rectangular prism", latex: "$$V = \\ell w h$$" },
  { title: "Volume of a cylinder", latex: "$$V = \\pi r^2 h$$" },
  { title: "Volume of a sphere", latex: "$$V = \\tfrac{4}{3}\\pi r^3$$" },
  { title: "Volume of a cone", latex: "$$V = \\tfrac{1}{3}\\pi r^2 h$$" },
  { title: "Volume of a pyramid", latex: "$$V = \\tfrac{1}{3}\\ell w h$$" },
];
