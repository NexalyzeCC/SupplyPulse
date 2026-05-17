import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    ".netlify/**", // CLI dev artefacts (telemetry bundles) — not source.
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  // Netlify functions are CommonJS Node.js — allow require() there.
  {
    files: ["netlify/**/*.js", "**/netlify/**/*.js"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-var-requires": "off",
      "import/no-commonjs": "off",
    },
  },
  // Local Node tooling scripts — CommonJS require().
  {
    files: ["scripts/**/*.js"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-var-requires": "off",
    },
  },
]);

export default eslintConfig;
