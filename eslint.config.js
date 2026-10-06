import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["scripts/media/*.cjs"],
    languageOptions: {
      globals: Object.fromEntries(
        [
          "require",
          "module",
          "__dirname",
          "URL",
          "fetch",
          "process",
          "Buffer",
          "console",
        ].map((name) => [name, "readonly"]),
      ),
    },
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
  {
    ignores: ["lib/**", "node_modules/**"],
  },
);
