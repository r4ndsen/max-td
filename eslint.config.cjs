// ESLint flat config
/** @type {import('eslint').Linter.FlatConfig[]} */
module.exports = [
  {
    files: ["**/*.js"],
    ignores: [
      // vendor or legacy bundles can be added here if too noisy
      // "game.js",
    ],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        window: "readonly",
        document: "readonly",
        localStorage: "readonly",
        performance: "readonly",
        requestAnimationFrame: "readonly",
        cancelAnimationFrame: "readonly",
      },
    },
    rules: {
      // Prevent shadowing imported/outer names (e.g., don't shadow i18n `t`)
      "no-shadow": "error",
      "no-redeclare": "error",
      "no-undef": "error",
      // Keep signal but not too noisy
      "no-unused-vars": ["warn", { args: "none", varsIgnorePattern: "^_" }],
      eqeqeq: "error",
      "no-var": "error",
      "prefer-const": "warn",
    },
  },
  // UI modules: avoid colliding with i18n `t`
  {
    files: ["ui.js"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "VariableDeclarator[id.name='t']",
          message: "Avoid using a local variable named 't'; it collides with the i18n helper.",
        },
      ],
    },
  },
];
