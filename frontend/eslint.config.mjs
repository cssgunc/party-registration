import { FlatCompat } from "@eslint/eslintrc";
import noManualMemo from "eslint-plugin-react-no-manual-memo";
import { dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    plugins: { "react-no-manual-memo": noManualMemo },
    rules: {
      "react-no-manual-memo/no-hook-memo": "warn",
      "react-no-manual-memo/no-component-memo": "warn",
      "react-no-manual-memo/no-custom-memo-hook": "warn",
    },
  },
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
  },
];

export default eslintConfig;
