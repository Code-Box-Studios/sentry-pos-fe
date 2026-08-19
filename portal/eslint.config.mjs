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
    ignores: [
      "node_modules/**",
      ".next/**",
      "build/**",
      "next-env.d.ts",
      // Payload writes these; their shape is not ours to lint.
      "src/migrations/**",
      "src/payload-types.ts",
      "src/app/(payload)/cms/importMap.js",
    ],
  },
];

export default eslintConfig;
