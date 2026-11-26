import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "separate-type-imports" },
      ],
      eqeqeq: ["error", "always", { null: "ignore" }],
      "no-alert": "error",
      "no-console": "warn",
      "no-var": "error",
      "prefer-const": "error",
    },
  },
  {
    files: ["scripts/**/*.mjs"],
    rules: {
      "no-console": "off",
    },
  },
  globalIgnores([".next/**", ".vercel/**", "out/**", "build/**", "netlify-drop/**", ".tmp-api-export-backup/**", "coverage/**", "playwright-report/**", "test-results/**", "next-env.d.ts"]),
]);

export default eslintConfig;
