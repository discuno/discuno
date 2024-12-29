import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";
import pluginReact from "eslint-plugin-react";
// @ts-expect-error - config types
import drizzle from "eslint-plugin-drizzle";

/** @type {import('eslint').Linter.Config[]} */
// @ts-expect-error - config types
export default [
  {
    files: ["**/*.{js,mjs,cjs,ts,jsx,tsx}"],
    plugins: {
      drizzle,
      react: pluginReact,
    },
    settings: {
      react: {
        version: "detect", // Automatically detect the React version
        jsxRuntime: "automatic", // Enable automatic JSX runtime
      },
    },
    rules: {
      "react/jsx-uses-react": "off",
      "react/react-in-jsx-scope": "off",
      "@typescript-eslint/array-type": "off",
      "@typescript-eslint/consistent-type-definitions": "off",
      "@typescript-eslint/consistent-type-imports": [
        "warn",
        {
          prefer: "type-imports",
          fixStyle: "inline-type-imports",
        },
      ],
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/require-await": "off",
      "@typescript-eslint/no-misused-promises": [
        "error",
        {
          checksVoidReturn: {
            attributes: false,
          },
        },
      ],
      "drizzle/enforce-delete-with-where": [
        "error",
        {
          drizzleObjectName: ["db", "ctx.db"],
        },
      ],
      "drizzle/enforce-update-with-where": [
        "error",
        {
          drizzleObjectName: ["db", "ctx.db"],
        },
      ],
    },
  },
  {
    extends: ["plugin:react/jsx-runtime"],
  },
  {
    languageOptions: {
      parser: "@typescript-eslint/parser",
      parserOptions: {
        project: true,
      },

      globals: { ...globals.browser, ...globals.node },
    },
  },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  // @ts-expect-error - config types
  pluginReact.configs.flat.recommended,
];
