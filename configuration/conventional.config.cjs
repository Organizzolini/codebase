/**
 * Shared conventional commit configuration
 *
 * This file is the single source of truth for types, scopes, and emoji mappings used across:
 * - commitlint.config.ts (commit message validation)
 * - validate-branch-name.config.js (branch name validation)
 * - release.config.cjs (release rules and changelog sections)
 * - .vscode/settings.json (scope autocomplete)
 * - .agents/skills/commit-code/SKILL.md (reference tables)
 *
 * When adding/removing types, scopes, or emojis, update this file only.
 * Run `nx run synchronization:conventional-config:write` to propagate changes.
 */

/**
 * Canonical gitmoji — one emoji per commit type.
 * Each entry is the source of truth for the type key, its description, and its canonical emoji.
 * See https://gitmoji.dev for the full list of available emojis.
 */
const types = [
  {
    code: ":sparkles:",
    description: "A new feature or capability that adds value for users",
    emoji: "✨",
    name: "feat",
  },
  {
    code: ":bug:",
    description: "A bug fix that addresses a specific issue or problem",
    emoji: "🐛",
    name: "fix",
  },
  {
    code: ":memo:",
    description:
      "Documentation, AGENTS.md, SKILL.md, README, and planning files",
    emoji: "📝",
    name: "docs",
  },
  {
    code: ":test_tube:",
    description: "Adding or correcting unit, integration, or end-to-end tests",
    emoji: "🧪",
    name: "test",
  },
  {
    code: ":recycle:",
    description:
      "Code restructuring that neither fixes a bug nor adds a feature",
    emoji: "♻️",
    name: "refactor",
  },
  {
    code: ":art:",
    description:
      "Formatting, whitespace, or code structure changes with no semantic effect",
    emoji: "🎨",
    name: "style",
  },
  {
    code: ":zap:",
    description:
      "A code change that improves performance (caching, query optimization, etc.)",
    emoji: "⚡️",
    name: "perf",
  },
  {
    code: ":wrench:",
    description:
      "Housekeeping that doesn't modify src or test files (gitignore, editor config, etc.)",
    emoji: "🔧",
    name: "chore",
  },
  {
    code: ":construction_worker:",
    description:
      "GitHub Actions workflows, composite actions, and CI/CD scripts",
    emoji: "👷",
    name: "ci",
  },
  {
    code: ":package:",
    description:
      "Build system, Vite/Docker/Helm config, or external dependency integration",
    emoji: "📦️",
    name: "build",
  },
  {
    code: ":rewind:",
    description: "Reverts a previous commit",
    emoji: "⏪️",
    name: "revert",
  },
];

const scopes = [
  {
    description: "In-house code measurement and validation toolchains (Callidescope, Codependix, Codometer, Conformetry) and their shared conventions",
    name: "ic-suite",
  },
  {
    description:
      "Python Jupyter notebook application for LangGraph affirmation generation",
    name: "affirmancy",
  },
  {
    description:
      "Node.js CLI for astronomical calendar generation (NASA JPL ephemeris)",
    name: "caelundas",
  },
  {
    description:
      "Workspace root config files (tsconfig, eslint, vitest, nx.json, etc.)",
    name: "configuration",
  },
  {
    description:
      "Code generator templates and validation tests for generated instances",
    name: "conformetry",
  },
  {
    description:
      "Shared Postgres package: environment, TypeORM module, base entities, test harness, and migrations",
    name: "database",
  },
  {
    description:
      "Dependency version changes (upgrades, additions, removals via pnpm)",
    name: "dependencies",
  },
  {
    description: "GitHub Actions workflows and CI/CD pipeline configuration",
    name: "deployments",
  },
  {
    description: "Markdown docs, skills, planning files, and AGENTS.md files",
    name: "documentation",
  },
  {
    description: "Helm charts, Terraform configs, and Kubernetes resources",
    name: "infrastructure",
  },
  {
    description: "Static GitHub profile README project (markdown and assets)",
    name: "JimmyPaolini",
  },
  {
    description:
      "TanStack Start SSR Latin dictionary web app with Supabase backend",
    name: "lexico",
  },
  {
    description: "Shared React/shadcn component library",
    name: "components-web",
  },
  {
    description: "Shared TypeORM entities and GraphQL types",
    name: "lexico-entities",
  },
  {
    description: "Data ingestion scripts for Lexico",
    name: "lexico-cli",
  },
  {
    description:
      "Greek meander (key/fret) SVG generator CLI and the composable motif/modifier library it reads",
    name: "meanderaw",
  },
  {
    description:
      "Lexical gap discovery CLI that surveys English for morphological, phonotactic, and semantic gaps and coins words to fill them",
    name: "sempientor",
  },
  {
    description:
      "Call stack tracing and linting CLI, the configuration package it reads, and the packages that build and render its call graph",
    name: "callidescope",
  },
  {
    description:
      "Dependency graph export CLI, the configuration package it reads, and the package that judges the graphs against declared rules",
    name: "codependix",
  },
  {
    description:
      "Code statistics measurement CLI, the configuration package it reads, and the packages that diff and render its pull request change report",
    name: "codometer",
  },
  {
    description: "Escape hatch: suppress semantic-release for any commit type",
    name: "no-release",
  },
  {
    description:
      "Version bumps and release commits generated by semantic-release",
    name: "release",
  },
  {
    description:
      "Pull request change report generation and the packages that diff and render it",
    name: "reporting",
  },
  {
    description:
      "Shell and TypeScript scripts in scripts/ (sync, setup, utilities)",
    name: "scripts",
  },
  {
    description:
      "Vitest configuration, shared test utilities, and coverage setup",
    name: "testing",
  },
  {
    description:
      "Synchronization application and commands for automating workflows",
    name: "synchronization",
  },
  {
    description:
      "Validation CLI and the checks it runs, such as pull request metadata",
    name: "validation",
  },
];

module.exports = { scopes, types };
