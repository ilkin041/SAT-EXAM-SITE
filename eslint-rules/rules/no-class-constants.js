"use strict";

/**
 * Bans module-level `FOO_CLS` / `FOO_CLASSES` string constants. A class list
 * hoisted out of the JSX it belongs to hides what a component actually renders
 * and drifts from it; use `cva` for variants or inline the classes.
 */

const NAME = /_(?:CLS|CLASSES)$/;

function isStringish(node) {
  if (!node) return false;
  return (
    (node.type === "Literal" && typeof node.value === "string") ||
    node.type === "TemplateLiteral" ||
    (node.type === "BinaryExpression" && node.operator === "+")
  );
}

module.exports = {
  meta: {
    type: "problem",
    docs: { description: "Disallow module-level *_CLS / *_CLASSES string constants" },
    schema: [],
    messages: {
      classConstant:
        "`{{name}}` hoists a class list out of its JSX. Inline the classes, or use `cva` if it varies.",
    },
  },
  create(context) {
    return {
      "Program > VariableDeclaration > VariableDeclarator"(node) {
        if (node.id.type !== "Identifier") return;
        if (!NAME.test(node.id.name)) return;
        if (!isStringish(node.init)) return;
        context.report({ node: node.id, messageId: "classConstant", data: { name: node.id.name } });
      },
      "Program > ExportNamedDeclaration > VariableDeclaration > VariableDeclarator"(node) {
        if (node.id.type !== "Identifier") return;
        if (!NAME.test(node.id.name)) return;
        if (!isStringish(node.init)) return;
        context.report({ node: node.id, messageId: "classConstant", data: { name: node.id.name } });
      },
    };
  },
};
