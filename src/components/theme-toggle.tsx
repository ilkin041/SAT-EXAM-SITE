"use client";

import { useCallback, useEffect, useState } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Check, Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

type ThemeChoice = "system" | "light" | "dark";
type Resolved = "light" | "dark";

const STORAGE_KEY = "theme";
const DARK_QUERY = "(prefers-color-scheme: dark)";

const OPTIONS: { value: ThemeChoice; label: string; Icon: typeof Sun }[] = [
  { value: "system", label: "System", Icon: Monitor },
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
];

function readChoice(): ThemeChoice {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {}
  return "system";
}

function systemResolved(): Resolved {
  return window.matchMedia(DARK_QUERY).matches ? "dark" : "light";
}

interface Props {
  /** `inverted` styles the trigger for the navy admin bar. */
  tone?: "default" | "inverted";
}

/**
 * Tri-state theme menu: System / Light / Dark. The `dark` class on <html> is
 * set before paint by <ThemeScript />; this component only reflects and
 * changes it. In `system` mode it follows OS changes live, not just on load.
 *
 * The test interface uses fixed Bluebook colors and ignores the theme;
 * everything else (dashboard, admin, marketing) respects it.
 */
export function ThemeToggle({ tone = "default" }: Props) {
  const [choice, setChoice] = useState<ThemeChoice>("system");
  const [resolved, setResolved] = useState<Resolved>("light");
  const [mounted, setMounted] = useState(false);

  const apply = useCallback((next: ThemeChoice) => {
    const value: Resolved = next === "system" ? systemResolved() : next;
    document.documentElement.classList.toggle("dark", value === "dark");
    setResolved(value);
  }, []);

  useEffect(() => {
    const initial = readChoice();
    setChoice(initial);
    apply(initial);
    setMounted(true);
  }, [apply]);

  // Live OS changes only matter while the choice is `system`.
  useEffect(() => {
    if (choice !== "system") return;
    const media = window.matchMedia(DARK_QUERY);
    const onChange = () => apply("system");
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [choice, apply]);

  function select(next: ThemeChoice) {
    setChoice(next);
    apply(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {}
  }

  const TriggerIcon = !mounted ? Monitor : resolved === "dark" ? Moon : Sun;
  const label = mounted ? `Theme: ${choice} (${resolved})` : "Theme";

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        aria-label={label}
        title="Theme"
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-md border transition-colors duration-150",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          tone === "inverted"
            ? "border-white/15 bg-white/5 text-white/90 hover:bg-white/10 hover:text-white focus-visible:ring-white focus-visible:ring-offset-brand-navy"
            : "border-input bg-card text-foreground hover:bg-accent",
        )}
      >
        <TriggerIcon className="h-4 w-4" aria-hidden />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="z-50 min-w-[160px] rounded-lg border border-border bg-card p-1 text-foreground shadow-elevated"
        >
          <DropdownMenu.RadioGroup
            value={choice}
            onValueChange={(v) => select(v as ThemeChoice)}
          >
            {OPTIONS.map(({ value, label: optionLabel, Icon }) => (
              <DropdownMenu.RadioItem
                key={value}
                value={value}
                className={cn(
                  "flex cursor-pointer select-none items-center gap-2 rounded-sm px-3 py-1.5 text-sm outline-none",
                  "data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground",
                )}
              >
                <Icon className="h-4 w-4" aria-hidden />
                <span className="flex-1">{optionLabel}</span>
                <DropdownMenu.ItemIndicator>
                  <Check className="h-3.5 w-3.5" aria-hidden />
                </DropdownMenu.ItemIndicator>
              </DropdownMenu.RadioItem>
            ))}
          </DropdownMenu.RadioGroup>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
