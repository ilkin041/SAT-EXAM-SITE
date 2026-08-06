/**
 * Local ESLint rules that enforce the design policy in CLAUDE.md.
 *
 * Loaded as `eslint-plugin-sat` via the `file:./eslint-rules` devDependency,
 * which npm symlinks into node_modules so ESLint 8's plugin resolver finds it.
 */
module.exports = {
  rules: {
    "no-raw-color": require("./rules/no-raw-color"),
    "no-inline-color-style": require("./rules/no-inline-color-style"),
    "no-class-constants": require("./rules/no-class-constants"),
    "no-client-page": require("./rules/no-client-page"),
    "no-unresolved-tailwind-class": require("./rules/no-unresolved-tailwind-class"),
  },
};
