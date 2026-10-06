---
name: create-pull-request
description: Create and manage pull requests following this codebase's conventions. Use this skill when creating PRs, opening PRs for review, writing PR descriptions, or asked about PR workflows and best practices.
license: MIT
---

# Pull Request Conventions

This skill teaches how to create and manage pull requests for this codebase. Follow these conventions for consistent, reviewable PRs that pass CI validation.

## When to Use This Skill

- Creating a new pull request
- Writing PR titles and descriptions
- Preparing changes for review
- Understanding PR workflows and requirements
- Linking PRs to issues

## PR Title Format

PR titles **must** follow the same format as commit messages:

```text
<type>(<scope>): <gitmoji> <subject>
```

### Structure Rules

1. **Type**: Required, lowercase, from [allowed types](../../../configuration/conventional.config.cjs)
2. **Scope**: Required, lowercase, from [allowed scopes](../../../configuration/conventional.config.cjs)
3. **Gitmoji**: Required, emoji at start of subject
4. **Subject**: Required, lowercase, imperative mood, no period

### Valid Types

<!-- types-start -->

| Type       | Description                                                                         |
| ---------- | ----------------------------------------------------------------------------------- |
| `feat`     | A new feature or capability that adds value for users                               |
| `fix`      | A bug fix that addresses a specific issue or problem                                |
| `docs`     | Documentation, AGENTS.md, SKILL.md, README, and planning files                      |
| `test`     | Adding or correcting unit, integration, or end-to-end tests                         |
| `refactor` | Code restructuring that neither fixes a bug nor adds a feature                      |
| `style`    | Formatting, whitespace, or code structure changes with no semantic effect           |
| `perf`     | A code change that improves performance (caching, query optimization, etc.)         |
| `chore`    | Housekeeping that doesn't modify src or test files (gitignore, editor config, etc.) |
| `ci`       | GitHub Actions workflows, composite actions, and CI/CD scripts                      |
| `build`    | Build system, Vite/Docker/Helm config, or external dependency integration           |
| `revert`   | Reverts a previous commit                                                           |

<!-- types-end -->

### Valid Scopes

<!-- scopes-start -->

| Scope               | Description                                                                                                                               |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `ic-suite`          | In-house code measurement and validation toolchains (Callidescope, Codependix, Codometer, Conformetry) and their shared conventions       |
| `affirmancy`        | Python Jupyter notebook application for LangGraph affirmation generation                                                                  |
| `caelundas`         | Node.js CLI for astronomical calendar generation (NASA JPL ephemeris)                                                                     |
| `configuration`     | Workspace root config files (tsconfig, eslint, vitest, nx.json, etc.)                                                                     |
| `conformetry`       | Code generator templates and validation tests for generated instances                                                                     |
| `database`          | Shared Postgres package: environment, TypeORM module, base entities, test harness, and migrations                                         |
| `dependencies`      | Dependency version changes (upgrades, additions, removals via pnpm)                                                                       |
| `deployments`       | GitHub Actions workflows and CI/CD pipeline configuration                                                                                 |
| `documentation`     | Markdown docs, skills, planning files, and AGENTS.md files                                                                                |
| `infrastructure`    | Helm charts, Terraform configs, and Kubernetes resources                                                                                  |
| `JimmyPaolini`      | Static GitHub profile README project (markdown and assets)                                                                                |
| `lexico`            | TanStack Start SSR Latin dictionary web app with Supabase backend                                                                         |
| `components-web`    | Shared React/shadcn component library                                                                                                     |
| `lexico-entities`   | Shared TypeORM entities and GraphQL types                                                                                                 |
| `lexico-ingestion`  | Data ingestion scripts for Lexico                                                                                                         |
| `meanderaw`         | Greek meander (key/fret) SVG generator CLI and the composable motif/modifier library it reads                                             |
| `sempientor`        | Lexical gap discovery CLI that surveys English for morphological, phonotactic, and semantic gaps and coins words to fill them             |
| `callidescope`      | Call stack tracing and linting CLI, the configuration package it reads, and the packages that build and render its call graph             |
| `codependix`        | Dependency graph export CLI, the configuration package it reads, and the package that judges the graphs against declared rules            |
| `codometer`         | Code statistics measurement CLI, the configuration package it reads, and the packages that diff and render its pull request change report |
| `no-release`        | Escape hatch: suppress semantic-release for any commit type                                                                               |
| `release`           | Version bumps and release commits generated by semantic-release                                                                           |
| `reporting`         | Pull request change report generation and the packages that diff and render it                                                            |
| `scripts`           | Shell and TypeScript scripts in scripts/ (sync, setup, utilities)                                                                         |
| `testing`           | Vitest configuration, shared test utilities, and coverage setup                                                                           |
| `synchronization`   | Synchronization application and commands for automating workflows                                                                         |
| `validation`        | Validation CLI and the checks it runs, such as pull request metadata                                                                      |

<!-- scopes-end -->

### Examples

✅ **Good PR titles:**

```text
feat(lexico): ✨ add user profile page
fix(caelundas): 🐛 correct aspect angle calculation
docs(codebase): 📝 update contributing guide
chore(dependencies): ⬆️ upgrade react to v19
refactor(components-web): ♻️ simplify button variants
```

❌ **Bad PR titles:**

```text
feat(lexico): add user profile page           # Missing gitmoji
feat(lexico): ✨ Added profile page.           # Wrong tense, period
Add new feature                                # Missing type, scope, gitmoji
fix: 🐛 fix bug                               # Missing scope
```

See [commit-code skill](../commit-code/SKILL.md) for complete formatting rules.

## PR Description

Write clear, comprehensive descriptions that help reviewers understand changes. The [PR template](../../../.github/PULL_REQUEST_TEMPLATE.md) provides the standard structure.

### Recommended Structure

<!-- pr-template-start -->

```markdown
## 🌰 Summary

<!-- Brief description of what this PR does (1-2 sentences) -->

## 📝 Details

- <!-- List of specific changes made -->

## 🧪 Testing

1. <!-- How to manually verify these changes work correctly -->

## 🔗 Related

- <!-- Link any relevant documentation or related resources like internal documentation, GitHub issues/pull requests -->
```

<!-- pr-template-end -->

### Description Guidelines

| Section    | Purpose                                                                   | Required |
| ---------- | ------------------------------------------------------------------------- | -------- |
| 🌰 Summary | Brief overview of the PR (1-2 sentences)                                  | Yes      |
| 📝 Details | Bulleted list of changes                                                  | Yes      |
| 🧪 Testing | How to verify the changes (commands and manual steps)                     | Yes      |
| 🔗 Related | Links to issues, specs, or related files/docs (never omit or leave empty) | Yes      |

> ⚠️ **Strict Validation:** CI validates that all 4 headings (`## 🌰 Summary`, `## 📝 Details`, `## 🧪 Testing`, `## 🔗 Related`) are present and non-empty, and that no HTML template comments (`<!-- ... -->`) remain. If there is no tracking issue, link to the relevant spec, files, or documentation in `🔗 Related`.

## Step-by-Step Workflow

### 1. Create Feature Branch

Branch name must follow conventions. See [checkout-branch skill](../checkout-branch/SKILL.md).

```bash
# Create branch from main
git checkout main
git pull origin main
git checkout -b feat/lexico-user-profile
```

### 2. Make Changes and Commit

Commits must follow conventions. See [commit-code skill](../commit-code/SKILL.md).

```bash
# Stage and commit changes
git add .
git commit -m "feat(lexico): ✨ add user profile component"
```

### 3. Push Branch

```bash
git push -u origin feat/lexico-user-profile
```

### 4. Create Pull Request

#### Validate PR Body Locally (Pre-flight Check)

Before opening the pull request, validate the generated markdown body against repository rules:

````bash
cat << 'EOF' > /tmp/pr_body.md
## 🌰 Summary

Adds a user profile page where users can view and edit their information.

## 📝 Details

- Add UserProfile component
- Add profile API endpoint
- Add profile route to router

## 🧪 Testing

```bash
nx run lexico-web:vitest
nx run lexico-web:develop  # Navigate to /profile
```

## 🔗 Related

- Closes #123
EOF

NODE_OPTIONS='' node --import @swc-node/register/esm-register \
  tools/validation/src/main.ts pull-request-body /tmp/pr_body.md
````

#### Using GitHub CLI (preferred)

```bash
gh pr create \
  --title "feat(lexico): ✨ add user profile page" \
  --assignee @me \
  --body-file /tmp/pr_body.md \
  --label type:feat \
  --label scope:lexico \
  --label source:agent
rm /tmp/pr_body.md
```

### 5. Address Review Feedback

```bash
# Make additional commits for feedback
git commit -m "fix(lexico): 🐛 address review feedback"
git push
```

### 6. Merge PR

After approval, merge using the GitHub UI or CLI:

```bash
gh pr merge --squash --delete-branch
```

## CI Requirements

All PRs must pass these checks before merging:

| Check                | Command                                                | Description                                                                                                                      |
| -------------------- | ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| Branch Name          | `validate-branch-name`                                 | Branch follows naming conventions                                                                                                |
| PR Title             | `commitlint`                                           | Title follows commit message format                                                                                              |
| PR Body              | Section validation                                     | Required sections: 🌰 Summary, 📝 Details, 🧪 Testing, 🔗 Related                                                                |
| Release Significance | `validation pull-request-release-significance`         | Title's type is at least as significant as the most significant commit, and the title shares at least one scope with each commit |
| Lint                 | `nx affected --target=lint-code`                       | Every static check: ESLint, oxlint, oxfmt, typecheck, spell-check, knip, and more                                                |
| Test                 | `nx affected --target=vitest --configuration=coverage` | Unit and integration tests against the coverage gates                                                                            |

There is no `lint`, `format`, or `clean` target in this workspace. `nx affected
--target=lint` exits 0 printing "No tasks were run", so it is a check that
passes without checking anything — always name a real target.

Run locally before pushing:

```bash
# Run all checks on affected projects
nx affected --target=lint-code --configuration=write --base=main
nx affected --target=lint-code --configuration=check --base=main
nx affected --target=vitest --configuration=coverage --base=main
```

## Draft PRs

Use draft PRs for work in progress:

```bash
# Create draft PR
gh pr create --draft --assignee @me --title "feat(lexico): ✨ [WIP] add user profile"

# Mark ready for review when complete
gh pr ready
```

## Linking Issues and Documentation

Reference issues and relevant documentation in the PR description:

### Issues

| Keyword           | Effect                      |
| ----------------- | --------------------------- |
| `Closes #123`     | Closes issue when PR merges |
| `Fixes #123`      | Closes issue when PR merges |
| `Resolves #123`   | Closes issue when PR merges |
| `Related to #123` | Links without closing       |

### Documentation

Include relevant links to help reviewers understand context:

- Internal docs: links to AGENTS.md, SKILL.md, planning files, or ADRs
- External docs: library documentation, RFCs, specifications
- Related PRs: links to dependent or prerequisite pull requests

## Assignees

Always assign PRs to yourself:

```bash
gh pr create --assignee @me
```

## Labels

Validate Conventions checks that labels agree with the title: exactly one `type:*` label matching the title's type, one `scope:*` label per scope named in the title (no extras), exactly one `source:*` label (`source:agent` or `source:human`) declaring who opened the pull request, and no `do-not-merge` label. Set them at creation time rather than waiting for the reconciliation step to backfill them:

```bash
gh pr create --label type:feat --label scope:lexico --label source:human
```

See the [triage-integration skill](../triage-integration/SKILL.md) for the full label vocabulary, the reconciliation step that creates missing labels on `opened`/`reopened`, and how to fix each metadata failure.

## Review Requests

Request reviews from appropriate team members:

```bash
gh pr create --reviewer JimmyPaolini
```

## Updating PR Branch

Keep your branch up to date with main:

If you plan to rebase and force-push, run [backup-code](../backup-code/SKILL.md) first to create a recoverable checkpoint.

```bash
# Update from main
git fetch origin main
git rebase origin/main
git push --force-with-lease
```

Or use GitHub's "Update branch" button in the PR UI.

## Squash Merging

This codebase uses **squash merging** by default:

- All commits in the PR become a single commit on main
- PR title becomes the commit message
- Keep PR title clean and following conventions
- **The title is the only thing semantic-release reads** — every commit's own type is discarded once squashed. Pick the title's type and scope overlap to match the branch's work, while keeping the title at least as significant as the most significant commit; see [commit-code's Release Significance section](../commit-code/SKILL.md#release-significance) for the type-to-bump mapping and the [pull-request-release-significance](../../../tools/validation/src/modules/pull-request-release-significance/pull-request-release-significance.command.ts) check that enforces it

## Pre-Flight Checklist

Before creating the PR, verify:

- [ ] Branch name follows `<type>/<scope>-<description>` format
- [ ] All changes are committed and pushed to remote
- [ ] Title follows `<type>(<scope>): <gitmoji> <subject>` format (max 128 chars)
- [ ] Subject uses imperative mood and lowercase after gitmoji
- [ ] Description includes Summary, Details, and Testing sections
- [ ] Related issues and documentation are linked in the Related section
- [ ] The title's type and scopes are at least as release-significant as every commit on the branch — see [Release Significance](../commit-code/SKILL.md#release-significance)
- [ ] Local CI checks pass: `nx affected --target=lint-code --configuration=check --base=main && nx affected --target=vitest --configuration=coverage --base=main`

## Common Patterns

### Feature PR

````text
Title: feat(lexico): ✨ add dictionary search autocomplete

## 🌰 Summary

Adds autocomplete suggestions to the dictionary search input.

## 📝 Details

- Add SearchAutocomplete component
- Integrate with search API for suggestions
- Add keyboard navigation support
- Add loading and empty states

## 🧪 Testing

```bash
nx run lexico-web:vitest
nx run lexico-web:develop
```

1. Navigate to search page and type a query.

## 🔗 Related

- Closes #234
````

### Bug Fix PR

````text
Title: fix(caelundas): 🐛 correct timezone offset in ephemeris

## 🌰 Summary

Fixes incorrect timezone handling for ephemeris calculations near DST boundaries.

## 📝 Details

- Use moment-timezone for DST-aware calculations
- Add edge case handling for DST transitions
- Add regression tests

## 🧪 Testing

```bash
nx run caelundas-cli:vitest:unit
nx run caelundas-cli:vitest:integration
```

## 🔗 Related

- Fixes #456
````

### Documentation PR

```text
Title: docs(codebase): 📝 add contributing guide

## 🌰 Summary

Adds comprehensive CONTRIBUTING.md with setup instructions and guidelines.

## 📝 Details

- Add CONTRIBUTING.md
- Update README.md with link to contributing guide
- Add development setup section

## 🧪 Testing

1. Review the documentation changes in the PR diff.

## 🔗 Related

- <!-- No related issues or documentation links -->
```

### Dependency Update PR

````text
Title: chore(dependencies): ⬆️ upgrade tanstack router to v1.50

## 🌰 Summary

Updates TanStack Router to latest version with bug fixes.

## 📝 Details

- Upgrade @tanstack/react-router from 1.45.0 to 1.50.0
- Update peer dependencies
- Fix breaking changes in route definitions

## 🧪 Testing

```bash
nx run lexico-web:vitest
nx run lexico-web:develop
```

1. All routes should work as before.

## 🔗 Related

- <!-- No related issues or documentation links -->
````

## Troubleshooting

| Issue             | Cause                     | Solution                                                                |
| ----------------- | ------------------------- | ----------------------------------------------------------------------- |
| CI failing        | Code issues               | Run lint, typecheck, test locally                                       |
| Merge conflicts   | Branch out of date        | Rebase on main                                                          |
| PR title rejected | Format incorrect          | Follow commit message conventions                                       |
| PR body rejected  | Missing required sections | Add ## 🌰 Summary, ## 📝 Details, ## 🧪 Testing, ## 🔗 Related sections |
| Tests failing     | Missing dependencies      | Run `pnpm install`                                                      |
| Typecheck errors  | Type issues               | Fix TypeScript errors                                                   |

If a rebase or force-push update goes wrong, use [restore-code](../restore-code/SKILL.md) to recover from your backup artifact.

## Quick Reference

```bash
# Create branch
git checkout -b <type>/<scope>-<description>

# Create PR with GitHub CLI
gh pr create --title "<type>(<scope>): <gitmoji> <subject>" --assignee @me --body "..."

# Run CI checks locally
nx affected --target=lint-code --configuration=check --base=main &&
  nx affected --target=vitest --configuration=coverage --base=main

# Update branch
git fetch origin main && git rebase origin/main && git push --force-with-lease

# Merge PR
gh pr merge --squash --delete-branch
```

## Resources

- [PR template](../../../.github/PULL_REQUEST_TEMPLATE.md) — Default PR description template
- [commit-code skill](../commit-code/SKILL.md) — Commit and PR title format
- [checkout-branch skill](../checkout-branch/SKILL.md) — Branch naming conventions
- [triage-integration skill](../triage-integration/SKILL.md) — Diagnosing failing CI checks on a PR
- [backup-code](../backup-code/SKILL.md) — Safety checkpoint before history rewrite
- [restore-code](../restore-code/SKILL.md) — Recovery workflow after failed branch update
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Gitmoji](https://gitmoji.dev)
