const nodeGlobals = {
  Buffer: "readonly",
  URL: "readonly",
  clearTimeout: "readonly",
  console: "readonly",
  process: "readonly",
  setTimeout: "readonly",
};

export default [
  {
    ignores: [
      "node_modules/**",
      "dist/**",
      "coverage/**",
      "apps/*/dist/**",
      "apps/android/android/**",
    ],
  },
  {
    files: ["**/*.{js,mjs}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: nodeGlobals,
    },
    rules: {
      "no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  {
    files: ["**/*.cjs"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "commonjs",
      globals: {
        ...nodeGlobals,
        __dirname: "readonly",
        module: "readonly",
        require: "readonly",
      },
    },
    rules: {
      "no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
];
