"use strict";

const path = require("path");

/**
 * Keeps the RSC-first rule from CLAUDE.md enforceable: no `"use client"` in any
 * page.tsx or layout.tsx. Client behaviour belongs in an island the server page
 * imports, so the route itself stays a server component.
 */

const GUARDED = new Set(["page.tsx", "layout.tsx", "page.jsx", "layout.jsx"]);

module.exports = {
  meta: {
    type: "problem",
    docs: { description: 'Disallow "use client" in page.tsx / layout.tsx' },
    schema: [],
    messages: {
      useClient:
        '"use client" in {{file}} makes the whole route a client component. Extract the interactive part into a `*-client.tsx` island and import it from this server component.',
    },
  },
  create(context) {
    const filename = context.getFilename();
    const base = path.basename(filename);
    if (!GUARDED.has(base)) return {};

    return {
      Program(node) {
        for (const statement of node.body) {
          if (
            statement.type !== "ExpressionStatement" ||
            statement.expression.type !== "Literal" ||
            typeof statement.expression.value !== "string"
          ) {
            break; // Directive prologue is over.
          }
          if (statement.expression.value === "use client") {
            context.report({ node: statement, messageId: "useClient", data: { file: base } });
          }
        }
      },
    };
  },
};
