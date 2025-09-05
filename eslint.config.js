import { FlatCompat } from "@eslint/eslintrc";
import js from "@eslint/js";
import typescriptEslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import drizzle from "eslint-plugin-drizzle";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all
});

const eslintConfig = [
    {
        ignores: [
            ".next/**",
            "node_modules/**",
            "dist/**",
            "drizzle/**",
            "next-env.d.ts",
            "eslint.config.js",
        ],
    },
    ...compat.extends(
        "next/core-web-vitals",
        "plugin:@typescript-eslint/recommended-type-checked",
        "plugin:@typescript-eslint/stylistic-type-checked"
    ),
    {
        files: ["**/*.{js,mjs,cjs,ts,tsx}"],
        plugins: {
            "@typescript-eslint": typescriptEslint,
            drizzle,
        },

        languageOptions: {
            parser: tsParser,
            parserOptions: {
                project: true,
            },
        },

        rules: {
            "@typescript-eslint/array-type": "off",
            "@typescript-eslint/consistent-type-definitions": "off",

            "@typescript-eslint/consistent-type-imports": ["warn", {
                prefer: "type-imports",
                fixStyle: "inline-type-imports",
            }],

            "@typescript-eslint/no-unused-vars": ["warn", {
                argsIgnorePattern: "^_",
            }],

            "@typescript-eslint/require-await": "off",

            "@typescript-eslint/no-misused-promises": ["error", {
                checksVoidReturn: {
                    attributes: false,
                },
            }],

            "drizzle/enforce-delete-with-where": ["error", {
                drizzleObjectName: ["db", "ctx.db"],
            }],

            "drizzle/enforce-update-with-where": ["error", {
                drizzleObjectName: ["db", "ctx.db"],
            }],
        },
    },
];

export default eslintConfig; 