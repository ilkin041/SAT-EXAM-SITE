"use strict";

/**
 * Detects literal colour values in a string.
 *
 * A colour function is only "raw" when it spells the colour out. `hsl(var(--foreground))`
 * and `hsl(var(--primary) / 0.2)` read a token and therefore follow the theme
 * into dark mode, so they pass; `rgba(255,255,255,0.8)` and
 * `hsla(228, 60%, 50%, 0.03)` do not.
 */

// #rgb / #rgba / #rrggbb / #rrggbbaa, but not `#features` or a longer word.
const HEX = /(?<![\w#-])#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})(?![\w-])/;
const COLOR_FN = /\b(rgba?|hsla?|oklch|oklab|lab|lch)\s*\(/g;

/** Text between `open` (index of the `(`) and its matching `)`. */
function argsOf(str, open) {
  let depth = 0;
  for (let i = open; i < str.length; i++) {
    if (str[i] === "(") depth++;
    else if (str[i] === ")") {
      depth--;
      if (depth === 0) return str.slice(open + 1, i);
    }
  }
  return str.slice(open + 1);
}

/** @returns the offending substring, or null. */
function findRawColor(str) {
  if (typeof str !== "string") return null;

  const hex = str.match(HEX);
  if (hex) return hex[0];

  COLOR_FN.lastIndex = 0;
  let match;
  while ((match = COLOR_FN.exec(str)) !== null) {
    const open = match.index + match[0].length - 1;
    if (!argsOf(str, open).includes("var(--")) {
      return `${match[1]}(…)`;
    }
  }
  return null;
}

module.exports = { findRawColor };
