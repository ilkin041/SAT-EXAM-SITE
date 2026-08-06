/**
 * Blocking script injected into <head> so the theme class is on <html> before
 * first paint. Without it every page renders light and flips on hydration.
 *
 * Storage key is `theme` with values "system" | "light" | "dark"; anything else
 * (including a missing key) is treated as "system". Kept in sync with
 * <ThemeToggle /> — the two must agree on key and values.
 */
const script = `(function(){try{var c=localStorage.getItem("theme");if(c!=="light"&&c!=="dark")c="system";var d=c==="dark"||(c==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d)}catch(e){}})();`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
