export default [
  {
    ignores: [
      "node_modules/**",
      ".git/**",
      ".forge/tmp/**",
      ".next/**",
      "dist/**",
      "build/**",
      "coverage/**"
    ]
  },
  {
    files: ["**/*.js", "**/*.mjs", "**/*.cjs"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module"
    },
    rules: {
      "no-unused-vars": "off",
      "no-undef": "off"
    }
  }
];
