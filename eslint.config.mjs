import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript", "prettier"),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "scripts/**", // Allow console.log in scripts
    ],
  },
  {
    rules: {
      // Security & Code Quality
      "@typescript-eslint/no-unused-vars": "error",
      "@typescript-eslint/no-explicit-any": "off", // off instead of error for gradual migration
      "no-console": ["warn", { allow: ["warn", "error"] }], // Warn on console.log, allow warn/error temporarily

      // React Best Practices
      "react-hooks/exhaustive-deps": "warn",
      "react-hooks/rules-of-hooks": "error",

      // General Best Practices
      "prefer-spread": "warn",
      "no-var": "error",
      "prefer-const": "error",
      "no-debugger": "error",
      "no-eval": "error",
      "no-implied-eval": "error",

      // Temporarily relaxed for migration
      "@typescript-eslint/ban-ts-comment": "warn",
    },
  },
];

export default eslintConfig;
