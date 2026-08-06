"use strict";

const { findRawColor } = require("../raw-color");

/**
 * Bans literal colour values in .tsx. Colours come from the token system in
 * globals.css and the Tailwind theme; a spelled-out hex or rgba() is a colour
 * that will not follow the theme into dark mode. `hsl(var(--primary))` reads a
 * token and is fine.
 *
 * `src/app/test/attempt/**` is exempted in .eslintrc.js — the Bluebook chrome
 * deliberately ignores the theme and its four hardcoded colours are correct.
 */
module.exports = {
  meta: {
    type: "problem",
    docs: { description: "Disallow raw hex / rgb() / hsla() colour values in .tsx" },
    schema: [],
    messages: {
      rawColor:
        "Raw colour `{{value}}`. Use a Tailwind colour class, or a token: `hsl(var(--token))`.",
    },
  },
  create(context) {
    function check(node, raw) {
      const found = findRawColor(raw);
      if (found) context.report({ node, messageId: "rawColor", data: { value: found } });
    }

    return {
      Literal(node) {
        check(node, node.value);
      },
      TemplateElement(node) {
        check(node, node.value.raw);
      },
    };
  },
};
