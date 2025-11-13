import js from "@eslint/js"
import globals from "globals"
import reactHooks from "eslint-plugin-react-hooks"
import reactRefresh from "eslint-plugin-react-refresh"
import tseslint from "typescript-eslint"
import reactX from "eslint-plugin-react-x"
import reactDom from "eslint-plugin-react-dom"
import prettier from "eslint-config-prettier"
import pluginQuery from "@tanstack/eslint-plugin-query"

import { defineConfig, globalIgnores } from "eslint/config"

export default defineConfig([
  globalIgnores(["dist", "public/mockServiceWorker.js"]),
  js.configs.recommended,
  reactX.configs["recommended-typescript"],
  reactDom.configs.recommended,
  reactHooks.configs.flat["recommended-latest"],
  reactRefresh.configs.vite,
  prettier,
  ...tseslint.config(
    {
      files: ["**/*.{ts,tsx}"],
      extends: [
        ...tseslint.configs.strictTypeChecked,
        ...tseslint.configs.stylisticTypeChecked,
        ...pluginQuery.configs["flat/recommended"],
      ],
      languageOptions: {
        ecmaVersion: 2020,
        globals: globals.browser,
        parserOptions: {
          project: ["./tsconfig.node.json", "./tsconfig.app.json"],
          tsconfigRootDir: import.meta.dirname,
        },
      },
      rules: {
        "@typescript-eslint/no-misused-promises": [
          "error",
          {
            checksVoidReturn: {
              attributes: false,
            },
          },
        ],
        "@typescript-eslint/unified-signatures": "off",
      },
    },
    {
      files: ["**/components/ui/**/*.{ts,tsx}"],
      rules: {
        "@typescript-eslint/consistent-type-definitions": "off",
        "@typescript-eslint/no-unnecessary-condition": "off",
        "@typescript-eslint/no-unnecessary-template-expression": "off",
        "@typescript-eslint/no-unnecessary-type-conversion": "off",
        "react-refresh/only-export-components": "off",
        "react-x/no-context-provider": "off",
        "react-x/no-use-context": "off",
        "react-x/no-unstable-context-value": "off",
      },
    },
    {
      files: ["**/types/openapi.gen.ts"],
      rules: {
        "@typescript-eslint/consistent-type-definitions": "off",
        "@typescript-eslint/consistent-indexed-object-style": "off",
      },
    }
  ),
])
