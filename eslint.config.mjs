import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // Imagens vêm do Supabase Storage / SVGs locais; <img> simples basta no MVP (ver DECISIONS.md).
      "@next/next/no-img-element": "off",
    },
  },
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      ".next-dev/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "src/types/db.ts",
      "playwright-report/**",
      "test-results/**",
    ],
  },
];

export default eslintConfig;
