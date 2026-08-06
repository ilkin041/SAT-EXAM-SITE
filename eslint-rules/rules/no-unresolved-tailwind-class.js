"use strict";

const fs = require("fs");
const path = require("path");

/**
 * Flags class names that compile to nothing.
 *
 * Tailwind fails silently: `py-4.5`, `bg-primary/8` and `dark:text-emerald-350`
 * are all plausible-looking and all emit zero CSS, so the surface is quietly
 * wrong with no error anywhere. T0.2 found nine of these by diffing the built
 * stylesheet by hand. This rule does the same diff at lint time by asking
 * Tailwind's own JIT engine to generate each candidate.
 *
 * A class is accepted if Tailwind generates a rule for it, or if it is defined
 * as a plain selector in one of the project stylesheets, or if it is listed in
 * the rule's `allow` option.
 */

const CLASS_ATTRS = new Set(["className", "class"]);
const CLASS_FNS = new Set(["cn", "clsx", "classNames", "cva", "twMerge", "twJoin"]);

// Marker classes that intentionally emit no CSS of their own.
const BUILTIN_ALLOW = ["group", "peer", "dark", "light"];

let engine = null;

/** `dark:hover:[&>svg]:text-primary` -> `text-primary`, ignoring `:` in brackets. */
function stripVariants(candidate) {
  let depth = 0;
  let start = 0;
  for (let i = 0; i < candidate.length; i++) {
    const ch = candidate[i];
    if (ch === "[" || ch === "(") depth++;
    else if (ch === "]" || ch === ")") depth--;
    else if (ch === ":" && depth === 0) start = i + 1;
  }
  return candidate.slice(start);
}

function getEngine(cwd, cssFiles, allow) {
  if (engine) return engine;

  const { createContext } = require("tailwindcss/lib/lib/setupContextUtils");
  const { generateRules } = require("tailwindcss/lib/lib/generateRules");
  const { loadConfig } = require("tailwindcss/lib/lib/load-config");
  const resolveConfig = require("tailwindcss/resolveConfig");

  const configPath = path.resolve(cwd, "tailwind.config.ts");
  const context = createContext(resolveConfig(loadConfig(configPath)));

  // Every `.foo` selector in the project stylesheets. Deliberately loose: it
  // over-collects (matching inside comments too), and over-collecting only ever
  // silences the rule for a name the stylesheet mentions.
  const known = new Set([...BUILTIN_ALLOW, ...allow]);
  for (const file of cssFiles) {
    const abs = path.resolve(cwd, file);
    if (!fs.existsSync(abs)) continue;
    const css = fs.readFileSync(abs, "utf8");
    for (const match of css.matchAll(/\.(-?[A-Za-z_][\w-]*)/g)) {
      known.add(match[1]);
    }
  }

  const cache = new Map();
  engine = {
    resolves(candidate) {
      if (cache.has(candidate)) return cache.get(candidate);
      // Strip `hover:` / `dark:` / `[&>svg]:` variants, so a class declared in
      // an `@layer utilities` block is still recognised under a variant that
      // Tailwind's engine cannot generate on its own. Only `group/name` and
      // `peer/name` lose their `/suffix` — everywhere else `/…` is an opacity
      // modifier and `bg-primary/8` must not pass because `bg-primary` does.
      let utility = stripVariants(candidate);
      const named = utility.match(/^(group|peer)\/[\w-]+$/);
      if (named) utility = named[1];

      let ok = known.has(candidate) || known.has(utility);
      if (!ok) {
        try {
          ok = generateRules([candidate], context).length > 0;
        } catch {
          ok = true; // Never fail the build on an engine crash.
        }
      }
      cache.set(candidate, ok);
      return ok;
    },
  };
  return engine;
}

/**
 * Split a class string into candidates, dropping tokens that were cut in half
 * by a `${}` interpolation.
 */
function candidates(raw, { truncatedStart, truncatedEnd }) {
  const parts = raw.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return [];
  if (truncatedStart && !/^\s/.test(raw)) parts.shift();
  if (truncatedEnd && !/\s$/.test(raw)) parts.pop();
  return parts;
}

module.exports = {
  meta: {
    type: "problem",
    docs: { description: "Disallow class names that compile to no CSS" },
    schema: [
      {
        type: "object",
        properties: {
          cssFiles: { type: "array", items: { type: "string" } },
          allow: { type: "array", items: { type: "string" } },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      unresolved:
        "`{{name}}` compiles to no CSS. It is not a Tailwind utility in this config and not defined in the project stylesheets — check the scale step, the shade, and the opacity value.",
    },
  },
  create(context) {
    const options = context.options[0] || {};
    const cssFiles = options.cssFiles || ["src/app/globals.css"];
    const allow = options.allow || [];
    const tw = getEngine(context.getCwd(), cssFiles, allow);

    function report(node, list) {
      for (const name of list) {
        if (name.startsWith("!")) continue; // `!important` prefix, rare here.
        if (!tw.resolves(name)) {
          context.report({ node, messageId: "unresolved", data: { name } });
        }
      }
    }

    /**
     * @param objectKeysAreClasses `clsx({ "is-open": open })` puts classes in the
     *   keys; a `cva` config object does not, so the caller says which it is.
     */
    function inspect(node, objectKeysAreClasses = true) {
      if (!node) return;
      if (node.type === "Literal" && typeof node.value === "string") {
        report(node, candidates(node.value, {}));
        return;
      }
      if (node.type === "TemplateLiteral") {
        node.quasis.forEach((quasi, i) => {
          report(
            quasi,
            candidates(quasi.value.raw, {
              truncatedStart: i > 0,
              truncatedEnd: i < node.quasis.length - 1,
            })
          );
        });
        return;
      }
      if (node.type === "ConditionalExpression") {
        inspect(node.consequent, objectKeysAreClasses);
        inspect(node.alternate, objectKeysAreClasses);
        return;
      }
      if (node.type === "LogicalExpression") {
        inspect(node.left, objectKeysAreClasses);
        inspect(node.right, objectKeysAreClasses);
        return;
      }
      if (node.type === "ArrayExpression") {
        node.elements.forEach((el) => inspect(el, objectKeysAreClasses));
        return;
      }
      if (node.type === "ObjectExpression" && objectKeysAreClasses) {
        // clsx({ "is-open": open }) — the keys are the classes.
        for (const prop of node.properties) {
          if (prop.type === "Property") inspect(prop.key);
        }
      }
    }

    /** `cva(base, { variants: { size: { sm: "..." } }, compoundVariants: [...] })` */
    function inspectCva(node) {
      inspect(node.arguments[0]);
      const config = node.arguments[1];
      if (!config || config.type !== "ObjectExpression") return;
      for (const prop of config.properties) {
        if (prop.type !== "Property" || prop.key.type !== "Identifier") continue;
        if (prop.key.name === "variants" && prop.value.type === "ObjectExpression") {
          for (const group of prop.value.properties) {
            if (group.type !== "Property" || group.value.type !== "ObjectExpression") continue;
            for (const variant of group.value.properties) {
              if (variant.type === "Property") inspect(variant.value, false);
            }
          }
        }
        if (prop.key.name === "compoundVariants" && prop.value.type === "ArrayExpression") {
          for (const entry of prop.value.elements) {
            if (!entry || entry.type !== "ObjectExpression") continue;
            for (const field of entry.properties) {
              if (
                field.type === "Property" &&
                field.key.type === "Identifier" &&
                CLASS_ATTRS.has(field.key.name)
              ) {
                inspect(field.value, false);
              }
            }
          }
        }
      }
    }

    return {
      JSXAttribute(node) {
        if (node.name.type !== "JSXIdentifier" || !CLASS_ATTRS.has(node.name.name)) return;
        const value = node.value;
        if (!value) return;
        if (value.type === "Literal") inspect(value);
        else if (value.type === "JSXExpressionContainer") inspect(value.expression);
      },
      CallExpression(node) {
        const callee = node.callee;
        const name =
          callee.type === "Identifier"
            ? callee.name
            : callee.type === "MemberExpression" && callee.property.type === "Identifier"
              ? callee.property.name
              : null;
        if (!name || !CLASS_FNS.has(name)) return;
        if (name === "cva") inspectCva(node);
        else node.arguments.forEach((arg) => inspect(arg));
      },
    };
  },
};
