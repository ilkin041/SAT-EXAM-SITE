import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    container: { center: true, padding: "1rem", screens: { "2xl": "1400px" } },
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", '"Plus Jakarta Sans"', "Inter", "system-ui", "sans-serif"],
        // IBM Plex Mono, loaded in `src/app/layout.tsx`. Tailwind ships no
        // `fontFamily.mono` unless you declare one, so before T0.2 every
        // `font-mono` in the app fell back to the browser default and before
        // T1.1 it fell back to the system stack below. The system stack is kept
        // as the fallback chain for the `display: swap` window.
        mono: [
          "var(--font-mono)",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "Consolas",
          '"Liberation Mono"',
          '"Courier New"',
          "monospace",
        ],
      },
      /*
       * The type scale (T1.1). Eight steps, no more — `text-3xl` and friends
       * still exist because they are Tailwind defaults, but nothing in a page
       * file should reach for them. Each utility carries size, weight, tracking
       * and line-height together, so a heading is one class rather than four,
       * and every facet reads from the custom properties in `globals.css` so
       * there is exactly one source of truth.
       *
       * Marketing body is `text-body-lg` at `max-w-[52ch]`. App body is
       * `text-body`. `text-eyebrow` is mono/uppercase — prefer the `.eyebrow`
       * utility, which bundles the family and casing too.
       */
      fontSize: {
        display: [
          "var(--text-display)",
          {
            lineHeight: "var(--text-display-leading)",
            letterSpacing: "var(--text-display-tracking)",
            fontWeight: "var(--text-display-weight)",
          },
        ],
        h1: [
          "var(--text-h1)",
          {
            lineHeight: "var(--text-h1-leading)",
            letterSpacing: "var(--text-h1-tracking)",
            fontWeight: "var(--text-h1-weight)",
          },
        ],
        h2: [
          "var(--text-h2)",
          {
            lineHeight: "var(--text-h2-leading)",
            letterSpacing: "var(--text-h2-tracking)",
            fontWeight: "var(--text-h2-weight)",
          },
        ],
        h3: [
          "var(--text-h3)",
          {
            lineHeight: "var(--text-h3-leading)",
            letterSpacing: "var(--text-h3-tracking)",
            fontWeight: "var(--text-h3-weight)",
          },
        ],
        "body-lg": [
          "var(--text-body-lg)",
          {
            lineHeight: "var(--text-body-lg-leading)",
            fontWeight: "var(--text-body-lg-weight)",
          },
        ],
        body: [
          "var(--text-body)",
          {
            lineHeight: "var(--text-body-leading)",
            fontWeight: "var(--text-body-weight)",
          },
        ],
        caption: [
          "var(--text-caption)",
          {
            lineHeight: "var(--text-caption-leading)",
            fontWeight: "var(--text-caption-weight)",
          },
        ],
        eyebrow: [
          "var(--text-eyebrow)",
          {
            lineHeight: "var(--text-eyebrow-leading)",
            letterSpacing: "var(--text-eyebrow-tracking)",
            fontWeight: "var(--text-eyebrow-weight)",
          },
        ],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
          // Defined in globals.css since the token system landed but never
          // mapped, so `text-accent-warm` / `bg-accent-pop` produced nothing.
          // See the gradient budget in CLAUDE.md before reaching for these:
          // `accent-warm` is time/pacing only, `accent-pop` is key actions.
          pop: "hsl(var(--accent-pop))",
          warm: "hsl(var(--accent-warm))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Editorial pair. `ink` is the highest-contrast text colour on a page,
        // `paper` the sheet it sits on, `paper-sunk` a recessed well within it
        // (table stripes, code blocks, inset panels). Mapped here rather than
        // left as bare custom properties — T0.2 already had to clean up tokens
        // that existed in CSS but resolved to nothing as a class.
        ink: "hsl(var(--ink))",
        paper: {
          DEFAULT: "hsl(var(--paper))",
          sunk: "hsl(var(--paper-sunk))",
        },
        // Anchor brand color — distinct from --primary so nav surfaces can
        // sit darker than the primary button background without recoloring
        // every button on the page.
        brand: {
          navy: "hsl(var(--brand-navy))",
          // Midpoint of the admin bar gradient. Only `AdminNav` should use it.
          "navy-light": "hsl(var(--brand-navy-light))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      boxShadow: {
        // Hairline lift, one step below Tailwind's `sm`. `shadow-xs` is a v4
        // utility that 13 call sites already used against v3; several pair it
        // with `hover:shadow-sm`, so it is defined here rather than collapsed
        // into `sm` (which would flatten those hovers to a no-op).
        xs: "0 1px 2px 0 rgb(0 0 0 / 0.04)",
        // Layered shadows for natural depth
        card: "0 1px 3px 0 rgb(0 0 0 / 0.04), 0 2px 8px -1px rgb(0 0 0 / 0.04)",
        elevated:
          "0 4px 16px -3px rgb(0 0 0 / 0.08), 0 2px 6px -2px rgb(0 0 0 / 0.05)",
        "elevated-lg":
          "0 8px 30px -5px rgb(0 0 0 / 0.1), 0 4px 12px -4px rgb(0 0 0 / 0.06)",
        focus:
          "0 0 0 2px hsl(var(--background)), 0 0 0 4px hsl(var(--ring))",
        // Glow shadows — mapped from CSS vars for convenience
        glow: "var(--glow-primary)",
        "glow-accent": "var(--glow-accent)",
        "glow-warm": "var(--glow-warm)",
        "glow-success": "var(--glow-success)",
        // Inner shadow for inputs
        "inner-sm": "inset 0 1px 2px 0 rgb(0 0 0 / 0.04)",
      },
      transitionDuration: {
        DEFAULT: "200ms",
        fast: "150ms",
        slow: "350ms",
      },
      transitionTimingFunction: {
        DEFAULT: "cubic-bezier(0.4, 0, 0.2, 1)",
        spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
        smooth: "cubic-bezier(0.16, 1, 0.3, 1)",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "slide-up-fade": {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.95)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
        "pulse-glow": {
          "0%, 100%": {
            boxShadow: "0 0 8px 0 hsla(228, 60%, 50%, 0.15)",
          },
          "50%": {
            boxShadow: "0 0 20px 4px hsla(228, 60%, 50%, 0.3)",
          },
        },
        "gradient-shift": {
          "0%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
          "100%": { backgroundPosition: "0% 50%" },
        },
        shimmer: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
        // Radix Accordion measures the panel and publishes its height as a
        // custom property; these are the only two keyframes that can read it,
        // which is why they live here rather than in globals.css.
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        // ScoreDial sweeps from an empty ring to its score. Both endpoints are
        // custom properties because the target is per-instance and set inline —
        // a static server render has no value change for a transition to catch,
        // which is why this is keyframes and not `transition-all`.
        "score-dial": {
          from: { strokeDashoffset: "var(--dial-circumference)" },
          to: { strokeDashoffset: "var(--dial-offset)" },
        },
      },
      animation: {
        "fade-in": "fade-in 200ms ease-out",
        "slide-up": "slide-up 250ms ease-out",
        "slide-up-fade": "slide-up-fade 350ms ease-out",
        "scale-in": "scale-in 250ms ease-out",
        float: "float 4s ease-in-out infinite",
        "pulse-glow": "pulse-glow 2.5s ease-in-out infinite",
        "gradient-shift": "gradient-shift 15s ease infinite",
        shimmer: "shimmer 2s ease-in-out infinite",
        "accordion-down": "accordion-down 200ms ease-out",
        "accordion-up": "accordion-up 200ms ease-out",
        // `forwards` is load-bearing twice over: it holds the final offset
        // after the sweep, and it is what makes the global reduced-motion
        // override (duration 0.01ms) land on a full ring rather than an empty
        // one.
        "score-dial": "score-dial 1s ease-out forwards",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
