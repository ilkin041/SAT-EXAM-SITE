import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    container: { center: true, padding: "1rem", screens: { "2xl": "1400px" } },
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", '"Plus Jakarta Sans"', "Inter", "system-ui", "sans-serif"],
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
        // Anchor brand color — distinct from --primary so nav surfaces can
        // sit darker than the primary button background without recoloring
        // every button on the page.
        brand: {
          navy: "hsl(var(--brand-navy))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      boxShadow: {
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
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
