"use strict";

const { findRawColor } = require("../raw-color");

/**
 * Bans colour set from inside `style={{ }}`.
 *
 * Dynamic geometry — width, height, transform, offsets fed by real data — is
 * exactly what inline styles are for and is left alone. Colour is different:
 * `background: "hsla(228, 60%, 50%, 0.03)"` cannot follow the theme, and
 * `color: someValue` puts colour choice into JS where no token can reach it.
 * A token reference (`hsl(var(--primary))`) in a string is allowed.
 */

const COLOR_PROPS = new Set([
  "color",
  "background",
  "backgroundColor",
  "backgroundImage",
  "borderColor",
  "borderTopColor",
  "borderRightColor",
  "borderBottomColor",
  "borderLeftColor",
  "outlineColor",
  "caretColor",
  "accentColor",
  "textDecorationColor",
  "textEmphasisColor",
  "columnRuleColor",
  "fill",
  "stroke",
  "boxShadow",
  "textShadow",
]);

function propName(key) {
  if (!key) return null;
  if (key.type === "Identifier") return key.name;
  if (key.type === "Literal" && typeof key.value === "string") return key.value;
  return null;
}

module.exports = {
  meta: {
    type: "problem",
    docs: { description: "Disallow raw or computed colour in inline style objects" },
    schema: [],
    messages: {
      rawColor:
        "Inline `{{prop}}` sets the raw colour `{{value}}`. Move it to a class, or reference a token: `hsl(var(--token))`.",
      dynamicColor:
        "Inline `{{prop}}` is computed in JS, so no token or theme can reach it. Pick between classes instead.",
    },
  },
  create(context) {
    return {
      JSXAttribute(node) {
        if (node.name.type !== "JSXIdentifier" || node.name.name !== "style") return;
        const value = node.value;
        if (!value || value.type !== "JSXExpressionContainer") return;
        const expr = value.expression;
        if (!expr || expr.type !== "ObjectExpression") return;

        for (const prop of expr.properties) {
          if (prop.type !== "Property") continue;
          const name = propName(prop.key);
          if (!name || !COLOR_PROPS.has(name)) continue;

          const v = prop.value;
          const isStatic =
            (v.type === "Literal" && typeof v.value === "string") ||
            (v.type === "TemplateLiteral" && v.expressions.length === 0);

          if (!isStatic) {
            context.report({ node: prop, messageId: "dynamicColor", data: { prop: name } });
            continue;
          }

          const text = v.type === "Literal" ? v.value : v.quasis[0].value.raw;
          const found = findRawColor(text);
          if (found) {
            context.report({
              node: prop,
              messageId: "rawColor",
              data: { prop: name, value: found },
            });
          }
        }
      },
    };
  },
};
