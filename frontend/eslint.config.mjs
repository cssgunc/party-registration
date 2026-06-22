import { FlatCompat } from "@eslint/eslintrc";
import jsdoc from "eslint-plugin-jsdoc";
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
  // TSDoc enforcement. The stack is fully typed, so we require a description on
  // exported functions/classes/methods/components but NOT redundant @param/@returns
  // types (see frontend/AGENTS.md for the convention).
  //
  // Rollout in progress (plan workstream D): enforced only on the globs in `files`
  // below. As each area is documented, add its glob here; once the whole tree is
  // covered, collapse this to `src/**/*.{ts,tsx}`.
  {
    files: [
      "src/lib/api/party/**/*.{ts,tsx}",
      "src/app/staff/_components/shared/table/useServerTableState.ts",
    ],
    plugins: { jsdoc },
    rules: {
      "jsdoc/require-jsdoc": [
        "warn",
        {
          publicOnly: true,
          require: {
            FunctionDeclaration: true,
            ClassDeclaration: true,
            MethodDefinition: true,
            ArrowFunctionExpression: true,
            FunctionExpression: true,
          },
          checkConstructors: false,
          checkGetters: false,
          checkSetters: false,
        },
      ],
      "jsdoc/require-description": "warn",
      "jsdoc/no-types": "warn",
      "jsdoc/check-alignment": "warn",
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
