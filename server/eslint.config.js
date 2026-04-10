import js from "@eslint/js";
import globals from "globals";

export default [
  {
    ignores: ["coverage", "dist"]
  },
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: globals.node
    },
    ...js.configs.recommended
  }
];
