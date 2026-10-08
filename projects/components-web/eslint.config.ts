import baseConfig from "../../configuration/eslint.config";

export default [
  // 🛠️ Base Config
  ...baseConfig,

  // 🚫 Project Ignores
  // Exclude shadcn/ui generated components (auto-generated, not hand-authored)
  {
    ignores: ["src/components/**", "src/lib/**", "src/hooks/**"],
  },

  // 🧭 Self-referential path alias
  // The base config forbids aliases that point back into a project's own
  // directory, but this package is managed by the shadcn CLI: `components.json`
  // declares `@/components`, `@/hooks` and `@/lib`, and the CLI emits `@/`
  // imports every time a component is added. Rewriting the alias to relative
  // paths would be undone on the next `shadcn add`, so it stays.
  {
    files: ["tsconfig.json"],
    rules: {
      "no-restricted-syntax": "off",
    },
  },

  // 📦 Dependency Checks
  {
    files: ["**/*.json"],
    rules: {
      "@nx/dependency-checks": [
        "error",
        {
          ignoredDependencies: [
            "vite",
            "@vitejs/plugin-react",
            "vite-plugin-dts",
            "@nx/vite",
          ],
          ignoredFiles: [
            "{projectRoot}/eslint.config.{js,cjs,mjs,ts,cts,mts}",
            "{projectRoot}/vite.config.{js,ts,mjs,mts}",
          ],
        },
      ],
    },
  },
];
