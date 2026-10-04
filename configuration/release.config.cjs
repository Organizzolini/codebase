/**
 * Semantic Release Configuration
 *
 * Automated versioning and changelog generation using semantic-release
 * with Conventional Commits (https://www.conventionalcommits.org/).
 *
 * Branch strategy: Only `main` triggers releases.
 * NPM publishing: Disabled — packages are not published to any registry.
 * Versioning: Fixed (entire codebase shares one version).
 * Auto-committed files: CHANGELOG.md, package.json, pnpm-lock.yaml
 *
 * Usage:
 *   pnpm semantic-release            # Manual release (requires GITHUB_TOKEN)
 *   pnpm semantic-release:dry-run    # Preview without changes
 *
 * Automated: Merging to `main` triggers the release-projects.yml workflow,
 * which analyzes commits since the last release, bumps the version,
 * updates CHANGELOG.md, and creates a GitHub release with tag.
 *
 * Per-project releases: Install `semantic-release-codebase` and configure
 * per-project release.config.cjs files if independent versioning is needed.
 *
 * Version Bump Rules:
 * ┌─────────────────────────────┬───────┬──────────────────────────────────────┐
 * │ Commit Type                 │ Bump  │ Example                              │
 * ├─────────────────────────────┼───────┼──────────────────────────────────────┤
 * │ BREAKING CHANGE (or `!`)   │ Major │ feat(api)!: redesign auth            │
 * │ feat                        │ Minor │ feat(caelundas): add moon phases     │
 * │ fix, perf, refactor, build  │ Patch │ fix(lexico): resolve timeout         │
 * │ docs, test, ci, chore       │ None  │ docs(readme): update                 │
 * │ scope: no-release           │ None  │ fix(no-release): temporary debug     │
 * └─────────────────────────────┴───────┴──────────────────────────────────────┘
 *
 * Changelog Sections (visible in release notes):
 *   ✨ Features • 🐛 Bug Fixes • ⚡ Performance • ♻️ Refactoring
 *   📦 Build • 📝 Docs • ⏪ Reverts
 *
 * Hidden from changelog: style, test, ci, chore
 *
 * Examples:
 *   # Minor release (1.2.3 → 1.3.0)
 *   feat(caelundas): add stellium detection
 *   fix(lexico): resolve mobile layout
 *
 *   # Patch release (1.3.0 → 1.3.1)
 *   fix(api): handle null values
 *   perf(database): add index to queries
 *
 *   # Major release (1.3.1 → 2.0.0)
 *   feat(api)!: redesign authentication
 *   BREAKING CHANGE: Auth endpoints now require OAuth2
 *
 *   # No release
 *   docs(readme): fix typos
 *   test(api): add tests
 *   fix(no-release): temporary debug
 *
 * Troubleshooting:
 *   Branch behind remote     → git pull origin main
 *   No release published     → Run pnpm semantic-release:dry-run to check commit analysis
 *   ENOCHANGE                → No new commits since last release (normal)
 *   EINVALIDGHTOKEN          → Set GITHUB_TOKEN environment variable
 *
 * Best Practices:
 *   - Use conventional commits format strictly
 *   - Test with --dry-run before releasing
 *   - Never manually edit CHANGELOG.md or bump versions
 *   - Squash feature branch commits into single conventional commit
 *   - Use BREAKING CHANGE deliberately
 *
 * Resources:
 *   - https://semantic-release.gitbook.io/
 *   - https://www.conventionalcommits.org/
 *   - .agents/skills/commit-code/SKILL.md
 *
 * @see https://semantic-release.gitbook.io/semantic-release/usage/configuration
 */

module.exports = {
  branches: ["main"],
  plugins: [
    // Analyzes commits to determine the version bump type
    [
      "@semantic-release/commit-analyzer",
      {
        preset: "conventionalcommits",
        releaseRules: [
          { breaking: true, release: "major" }, // BREAKING CHANGE or `!` suffix → major
          { revert: true, release: "patch" }, // Reverted commits → patch
          { type: "feat", release: "minor" }, // New features → minor
          { type: "fix", release: "patch" }, // Bug fixes → patch
          { type: "perf", release: "patch" }, // Performance improvements → patch
          { type: "docs", release: false }, // Documentation only → no release
          { type: "style", release: false }, // Formatting/whitespace → no release
          { type: "refactor", release: "patch" }, // Code restructuring → patch
          { type: "test", release: false }, // Test additions/changes → no release
          { type: "build", release: "patch" }, // Build system changes → patch
          { type: "ci", release: false }, // CI/CD changes → no release
          { type: "chore", release: false }, // Housekeeping → no release
          { scope: "no-release", release: false }, // Escape hatch: any type with this scope → no release
        ],
      },
    ],

    // Generates release notes grouped by gitmoji-labeled sections
    [
      "@semantic-release/release-notes-generator",
      {
        preset: "conventionalcommits",
        presetConfig: {
          types: [
            { type: "feat", section: "✨ Features" }, // A new feature or capability that adds value for users
            { type: "fix", section: "🐛 Bug Fixes" }, // A bug fix that addresses a specific issue or problem
            { type: "perf", section: "⚡ Performance Improvements" }, // A code change that improves performance (caching, query optimization, etc.)
            { type: "revert", section: "⏪ Reverts" }, // Reverts a previous commit
            { type: "docs", section: "📝 Documentation", hidden: false }, // Documentation, AGENTS.md, SKILL.md, README, and planning files
            { type: "style", section: "💄 Styles", hidden: true }, // Formatting, whitespace, or code structure changes with no semantic effect
            { type: "refactor", section: "♻️ Code Refactoring" }, // Code restructuring that neither fixes a bug nor adds a feature
            { type: "test", section: "🧪 Tests", hidden: true }, // Adding or correcting unit, integration, or end-to-end tests
            { type: "build", section: "📦 Build System" }, // Build system, Vite/Docker/Helm config, or external dependency integration
            { type: "ci", section: "👷 CI/CD", hidden: true }, // GitHub Actions workflows, composite actions, and CI/CD scripts
            { type: "chore", section: "🔧 Chores", hidden: true }, // Housekeeping that doesn't modify src or test files (gitignore, editor config, etc.)
          ],
        },
      },
    ],

    // Writes release notes to CHANGELOG.md (auto-generated — never edit manually)
    [
      "@semantic-release/changelog",
      {
        changelogFile: "CHANGELOG.md",
        changelogTitle: `# Changelog\n\nAll notable changes to this project will be documented in this file. See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.`,
      },
    ],

    // Updates package.json version field without publishing to npm
    [
      "@semantic-release/npm",
      {
        npmPublish: false,
      },
    ],

    // Commits version-bumped files back to the repository
    [
      "@semantic-release/git",
      {
        // Every markdown file a report is spliced into rides along, because
        // the steps just before this commit regenerate all of them: codometer
        // rewrites the root README.md badge block, callidescope rewrites a
        // call-stack section in each project's README.md, and the module-graph
        // synchronization rewrites a diagram in each project's README.md and
        // AGENTS.md. Publishing on a branch instead made every pull request
        // rewrite the same blocks and conflict with every other one;
        // publishing on main makes them release artifacts, updated exactly
        // when the changelog is.
        assets: [
          "CHANGELOG.md",
          "README.md",
          "applications/*/AGENTS.md",
          "applications/*/README.md",
          "package.json",
          "packages/*/AGENTS.md",
          "packages/*/README.md",
          "pnpm-lock.yaml",
          "tools/*/AGENTS.md",
          "tools/*/README.md",
        ],
        message: "chore(release): 🔖 version ${nextRelease.version}",
      },
    ],

    // Creates a GitHub release with tag (comments/labels disabled to reduce noise)
    [
      "@semantic-release/github",
      {
        successComment: false, // Don't comment on issues/PRs included in the release
        failComment: false, // Don't open issues on release failure
        releasedLabels: false, // Don't add labels to released issues/PRs
      },
    ],
  ],
};
