# Contributing to Codebase

Thank you for contributing! This guide covers the development workflow, code standards, and release process.

[AGENTS.md](../AGENTS.md) is the deeper reference for conventions, project layout, and the toolchains this repository publishes. This guide is the shorter path: what to install, what to run, and what the checks will reject.

## Table of Contents

- [Contributing to Codebase](#contributing-to-codebase)
  - [Table of Contents](#table-of-contents)
  - [Getting Started](#getting-started)
    - [Option 1: Local Setup (macOS, Recommended)](#option-1-local-setup-macos-recommended)
    - [Option 2: Dev Container](#option-2-dev-container)
    - [Commit Signing (Required)](#commit-signing-required)
    - [Workspace Structure](#workspace-structure)
  - [Development Workflow](#development-workflow)
    - [Basic Commands](#basic-commands)
    - [Python Projects](#python-projects)
    - [The Gates](#the-gates)
  - [Code Standards](#code-standards)
    - [Nx Boundaries](#nx-boundaries)
    - [Size Limits](#size-limits)
    - [Coverage Gates](#coverage-gates)
  - [In-House Toolchains](#in-house-toolchains)
  - [Git Hooks (Husky)](#git-hooks-husky)
  - [Working in a Git Worktree](#working-in-a-git-worktree)
  - [Branch Naming Guidelines](#branch-naming-guidelines)
  - [Commit Guidelines](#commit-guidelines)
    - [Types](#types)
    - [Scopes](#scopes)
  - [Release Significance](#release-significance)
  - [Issues and Planning](#issues-and-planning)
  - [Pull Request Process](#pull-request-process)
  - [Release Process](#release-process)
  - [Code Ownership](#code-ownership)
  - [Environment Variables](#environment-variables)
    - [Root (`.env.default`)](#root-envdefault)
    - [caelundas (`applications/caelundas/.env.default`)](#caelundas-applicationscaelundasenvdefault)
  - [Dependency Update Workflow](#dependency-update-workflow)
  - [Additional Resources](#additional-resources)
  - [Getting Help](#getting-help)
  - [License](#license)

## Getting Started

### Option 1: Local Setup (macOS, Recommended)

The fastest way to get started on macOS is the setup script, which installs every required tool via Homebrew and then installs project dependencies.

**Prerequisites:**

- **macOS** with [Homebrew](https://brew.sh/) installed
- **Git**: Latest stable version
- **[Docker Desktop](https://www.docker.com/products/docker-desktop/)**: Required for the SearxNG, Open WebUI, and caelundas containers

**Setup:**

```bash
git clone https://github.com/Organizzolini/codebase.git
```

```bash
cd codebase && bash scripts/local/setup.sh
```

The script runs four stages in order, each sourced so that shell changes carry forward:

| Stage | Script                          | What it does                                                    |
| ----- | ------------------------------- | --------------------------------------------------------------- |
| 1     | `scripts/utilities.sh`          | Validates the working directory, loads `.env`, enables `set -e` |
| 2     | `scripts/local/software.sh`     | Installs system tools and configures the shell                  |
| 3     | `scripts/local/environment.sh`  | Creates `.env` files from `.env.default` templates              |
| 4     | `scripts/local/dependencies.sh` | Runs `pnpm install`, `uv sync`, and Terraform setup             |

**What gets installed:**

- **Node.js** toolchain — `nvm`, the Node version pinned in `.nvmrc`, and `pnpm`
- **Python** toolchain — `uv` plus the Python it manages
- **Ollama**, and it pulls the `gemma4:e2b` model the affirmations ReAct agent uses
- **PostgreSQL** for local database work
- **GnuPG** and `pinentry-mac`, because commits must be signed
- **Infrastructure and quality tools** — `gitleaks`, `terraform`, `trivy`, `supabase`, `jq`, `gh`, `helm`, `kubectl`

Stage 3 copies `.env.default` to `.env` for the workspace root and for **every** project that ships a template — existing `.env` files are never overwritten. It also appends `LOCAL_WORKSPACE_FOLDER` to the root `.env` so `docker-compose` volume mounts resolve.

Setup prints a version summary at the end. If a tool is missing from it, re-run the script rather than installing by hand.

### Option 2: Dev Container

Alternatively, use the included dev container for a fully configured environment (useful for Codespaces or when you prefer container isolation).

**Prerequisites:**

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (or Docker Engine on Linux)
- [VS Code](https://code.visualstudio.com/) with [Dev Containers extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers)

**Setup:**

1. Clone the repository: `git clone https://github.com/Organizzolini/codebase.git`
2. Open the folder in VS Code
3. Open the command palette (`Ctrl/Cmd+Shift+P`) → **Dev Containers: Reopen in Container**
4. Select a configuration when prompted:
   - **Codebase Devcontainer (Local)** — local machine, Docker-outside-of-Docker (recommended)
   - **Codebase Devcontainer (Cloud)** — GitHub Codespaces or when full Docker isolation is needed, Docker-in-Docker
5. Wait for the container build (~2-3 minutes first time)
6. Start developing!

**Included Tools:**

| Tool         | Version                     | Purpose                                                      |
| ------------ | --------------------------- | ------------------------------------------------------------ |
| Node.js      | 24.16.0                     | JavaScript runtime                                           |
| pnpm         | 11.2.2                      | Package manager                                              |
| Terraform    | latest                      | Infrastructure provisioning (Linode)                         |
| kubectl      | latest                      | Kubernetes cluster management                                |
| Helm         | latest                      | Kubernetes package manager                                   |
| GitHub CLI   | latest                      | Repository operations                                        |
| Supabase CLI | latest                      | Local Supabase stack and migrations for lexico               |
| Docker       | DooD (local) / DinD (cloud) | Docker-outside-of-Docker on local; Docker-in-Docker in cloud |

The repository pins Node through both `.nvmrc` and `.node-version`, and `package.json` declares `engines.node` to match. `.nvmrc` is declarative and only takes effect after running `nvm use`, or after enabling automatic `nvm` directory switching in your shell. Use the pinned version — newer Node majors have broken this repository's commit hooks in ways that are hard to read from the error output.

pnpm is pinned by `packageManager` in the root `package.json`, so Corepack selects the right version on its own.

**Port Forwarding:**

| Port  | Service            | Auto-Forward |
| ----- | ------------------ | ------------ |
| 3000  | Lexico Dev Server  | Notify       |
| 3001  | Open WebUI         | Notify       |
| 8889  | SearxNG            | Notify       |
| 11434 | Ollama API         | Silent       |
| 54321 | Supabase API       | Silent       |
| 54322 | Supabase Database  | Silent       |
| 54323 | Supabase Studio    | Notify       |
| 54324 | Supabase Email     | Silent       |
| 54325 | Supabase Analytics | Silent       |

See [.devcontainer/README.md](../.devcontainer/README.md) for detailed configuration and troubleshooting.

### Commit Signing (Required)

Every commit must be GPG-signed. The `pre-commit` hook refuses to run without a working signing configuration, `pre-push` verifies the signature on every commit being pushed, and `main` is protected against unsigned commits — so this is the first thing to get right, before your first commit.

The local setup script installs `gnupg` and `pinentry-mac` and points `gpg-agent` at the latter, but it cannot create a key for you. If you do not already have one:

```bash
gpg --quick-generate-key "Your Name <you@example.com>" rsa4096 sign 0
```

Then point git at it and turn signing on:

```bash
git config --global user.signingkey "$(gpg --list-secret-keys --keyid-format=long | grep '^sec' | awk '{print $2}' | cut -d'/' -f2)"
```

```bash
git config --global commit.gpgsign true
```

Finally, export the public key and add it to [your GitHub account](https://github.com/settings/keys) so GitHub marks the commits verified:

```bash
gpg --armor --export "$(git config --get user.signingkey)"
```

`scripts/git/check-commit-signing-configuration.sh` checks all of it — `commit.gpgsign`, `user.signingkey`, that a secret key exists for that key, and that signing actually succeeds. Husky runs it for you; never invoke it, or `check-push-commit-signatures.sh`, by hand during a normal commit or push.

### Workspace Structure

```text
codebase/
├── applications/       # Deployable applications (6)
├── packages/           # Shared libraries and toolchain packages (38)
├── tools/              # Repository-internal CLIs (2)
├── configuration/      # Every shared tool config, plus the Husky hooks
├── docs/               # Architecture decision records and agent configuration
├── documentation/      # Development guides and planning notes
├── openwiki/           # Generated code documentation — do not hand-edit
├── infrastructure/     # Docker, Helm charts, Terraform
├── scripts/            # Setup, git, and utility scripts
└── .agents/skills/     # Agent skills; every other agent entrypoint symlinks here
```

Every project lives in `applications/`, `packages/`, or `tools/` — a file directly in one of those directories is a lint error, not a style preference. The full annotated project list is in [README.md](../README.md), kept in step with the workspace by the `check-readme-projects` target; `nx show projects` prints the same set.

**A package removed from the workspace can still look like a project on a stale checkout.** `check-readme-projects` and `nx show projects` both key off any directory holding its own `package.json`, not off what git tracks — so a checkout that had a since-removed package built or installed before the removal lands keeps that package's `node_modules/`, `coverage/`, and other untracked build output, and pnpm or Nx can keep treating the directory as a real project from those leftovers alone. `pull`ing the removal only deletes the tracked files; the untracked ones stay until something deletes them. If `check-readme-projects` names a project that was removed on `main`, or `nx show projects` lists one you know is gone, delete that directory outright rather than tracking down which file is still there — nothing in a removed package's directory is meant to survive.

Scaffold new projects, modules, and components with a conformetry generator rather than by hand; code written in a shape a template already describes starts life failing conformance.

```bash
pnpm exec nx g conformetry:<generator>
```

## Development Workflow

### Basic Commands

```bash
# Create a feature branch (see branch naming conventions)
git checkout -b feat/lexico-your-feature
```

```bash
# Run an application — target names differ by project
pnpm exec nx run lexico:develop           # Vite dev server with hot reload
pnpm exec nx run caelundas:start          # CLI entry point
pnpm exec nx run meanderaw-cli:repl           # Interactive REPL
```

```bash
# Run tests
pnpm exec nx run <project>:vitest             # Coverage is the default configuration
pnpm exec nx run <project>:vitest:watch       # Watch mode
pnpm exec nx run caelundas:vitest:unit        # One kind: unit, integration, end-to-end
pnpm exec nx run <project>:test-code      # Aggregate — reaches pytest too
```

```bash
# Code quality — lint-code runs every static analyser in one task graph
pnpm exec nx run-many --target=lint-code                            # check (default)
pnpm exec nx run-many --target=lint-code --configuration=write      # auto-fix
```

```bash
# Or reach for a single tool
pnpm exec nx run-many --target=eslint            # or --configuration=write to fix
pnpm exec nx run-many --target=typecheck
pnpm exec nx run-many --target=type-coverage
pnpm exec nx run-many --target=oxfmt --configuration=write
pnpm exec nx run-many --target=spell-check
pnpm exec nx run-many --target=markdown-lint     # or --configuration=write
pnpm exec nx run-many --target=knip              # or --configuration=write (caution!)
```

```bash
# Affected projects only — the fastest useful check
pnpm exec nx affected --target=lint-code --base=main
```

Always run tasks through Nx rather than the underlying tool, so caching and the task graph apply. Note there is **no `test` target** in this workspace — it is `vitest` for TypeScript projects and `pytest` for Python ones, both reachable through `test-code`.

### Python Projects

`affirmations` is a Python project and does not share the TypeScript tool names. It lives in the shared `uv` workspace at the repository root, so its dependencies come from the root `pyproject.toml` and `uv.lock` rather than a manifest of its own.

| Concern   | TypeScript                   | Python          |
| --------- | ---------------------------- | --------------- |
| Format    | `oxfmt`                      | `ruff-format`   |
| Lint      | `eslint`, `oxlint`           | `ruff-lint`     |
| Types     | `typecheck`, `type-coverage` | `pyright`, `ty` |
| Tests     | `vitest`                     | `pytest`        |
| Dead code | `knip`                       | `vulture`       |

The composite targets pick whichever set a project's `language:*` tag selects, so `lint-code` and `test-code` work unchanged either way — which is the reason to reach for those rather than a tool by name. See [write-python](.agents/skills/write-python/SKILL.md) for the full setup.

### The Gates

Five workflows run on every pull request. Each maps to targets you can run locally before pushing. GitHub shows each with an emoji prefix — 🧑‍🔧 Lint Codebase, 🧑‍🔬 Test Coverage, 🕵️ Secure Code, 👷 Make Projects, 🧑‍⚖️ Comply Code.

| Workflow      | Runs                                                                                                                     | Local equivalent                                  |
| ------------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------- |
| Lint Codebase | Format, lint, typecheck, type coverage, spelling, markdown, YAML, dead code, conformance, and the synchronization checks | `nx affected --target=lint-code`                  |
| Test Coverage | Unit, integration, and end-to-end tests with coverage thresholds                                                         | `nx affected --target=test-code`                  |
| Secure Code   | Secrets, Python AST, dependency vulnerabilities, licenses, infrastructure misconfiguration                               | `nx affected --target=secure-code`                |
| Make Projects | Builds every buildable project and gates its declared bundle size                                                        | `nx affected --target=build-projects`             |
| Comply Code   | Branch name, pull request title, body, labels, assignees, and release significance                                       | See [Pull Request Process](#pull-request-process) |
| Enforce Code  | CODEOWNERS rules and workflow security                                                                                   | `tools/validation/src/main.ts audit-governance`   |

🚀 Continuous Deployment runs post-merge on `main` to release the workspace and to build and verify the dev container image. Builds are verified before merge, in the merge queue, and a pull request that changes the dev container builds and tests it there too.

## Code Standards

- **TypeScript**: Explicit return types, no `any`, type imports (`import { type Foo }`), strict null checks, no non-null assertions, `readonly` on never-mutated class properties, exhaustive switches over union types, `.js` extensions on relative imports
- **No abbreviations**: write `request`, `response`, `index`, and `error` in full rather than shortening them — enforced by ESLint for TypeScript identifiers and by CSpell everywhere else, comments and string literals included
- **File naming**: kebab-case; module files take a suffix (`*.service.ts`, `*.command.ts`, `*.module.ts`, `*.constants.ts`, `*.types.ts`, `*.utilities.ts`)
- **Imports**: Auto-sorted (Node built-ins → external → workspace → parent → sibling → index → types), and alphabetical order is enforced for named imports, object literals, object types, class members, and switch cases
- **Formatting**: `oxfmt` is the formatter, not Prettier — 80-column width, 2-space indent, double quotes, trailing commas
- **React**: React 19, TanStack Router, shadcn/ui through `@codebase/lexico-components`, Tailwind CSS
- **Documentation**: TSDoc on public APIs where it adds non-obvious context; update docs alongside code

**Never silence an error.** No `eslint-disable`, `@ts-ignore`, `@ts-expect-error`, or `nocheck` comments; no loosening `compilerOptions`; no adding ESLint `ignores` or rule overrides to suppress a specific failure. Triage the root cause instead. Suppression is only acceptable when explicitly requested.

See [configuration/eslint.config.ts](configuration/eslint.config.ts) for the complete rule set, and [configuration/codebase-structure.json](configuration/codebase-structure.json) for the folder and file placement rules — placement is a lint error here, not a preference.

### Nx Boundaries

`@nx/enforce-module-boundaries` derives import rules from the tags each project declares in its `project.json`. A violation fails `eslint`, not `typecheck`, so it surfaces later than you would expect — check these before adding a cross-project import.

- **`type:application` may only import `type:package` projects.** Applications never import each other.
- **`type:package` may never import a `type:application`.**
- **`framework:react` may not import `framework:nestjs`.**
- **`domain:lexico` and `domain:caelundas` may never import each other.**
- **Each toolchain's packages form a strict layered graph** keyed on `name:*` tags, where every package declares exactly which siblings it may import. Read the `depConstraints` list in [configuration/eslint.config.ts](configuration/eslint.config.ts) before wiring a new dependency between them.

`@nx/dependency-checks` additionally requires that every imported package is declared in that project's own `package.json` — which is why a dependency goes in through `pnpm add --filter <project>` rather than a hand edit.

Cross-project imports use the workspace package name (`@codebase/logger`), never a relative path out of the project. Inside a project, prefer relative paths over path aliases.

### Size Limits

Hard ESLint errors on source files. Test files and `*.config.*` files are exempt.

| Limit                   | Max                 |
| ----------------------- | ------------------- |
| Lines per file          | 512                 |
| Lines per function      | 128                 |
| Statements per function | 16                  |
| Block nesting depth     | 4                   |
| Nested callbacks        | 3                   |
| Classes per file        | 1                   |
| Function parameters     | 3 — constructors 12 |
| Cyclomatic complexity   | 8 (warning)         |

When a file nears 512 lines, split it along the module file suffixes instead of raising the limit.

### Coverage Gates

- **Test coverage: 96%** for branches, functions, lines, and statements, from [configuration/vitest.config.ts](configuration/vitest.config.ts). New code needs tests in the same change.
- **Type coverage** is per project, declared as `typeCoverage.atLeast` in that project's `package.json` — most packages sit at 100 with `strict: true`; the workspace root requires 95. Passing `typecheck` proves nothing about this gate, so run both.
- **Bundle size** is per project, declared in that project's `codometer.config.ts` and gated by its `codometer` target. A breach fails 👷 Make Projects and names the project.

Lowering a threshold to make a change pass is not an option — fix the code.

## In-House Toolchains

Four toolchains are developed in this repository and gate its own code. You are most likely to meet them as a failing check, so it is worth knowing which one is talking.

| Toolchain      | What it does                                                                                                                   | What fails a pull request                                                       |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| `conformetry`  | Scaffolds projects, modules, and components from templates, then measures the generated instances back against those templates | `conformetry-validate`, inside `guard-code` in the 💂 Guard check |
| `codometer`    | Measures a directory — languages, declared conventions, compressed size — against the limits its configuration declares        | that project's `codometer` target, inside Make Projects                         |
| `codependix`   | Exports Nx, NestJS module, and file-level import graphs, and judges them against declared boundary rules                       | `codebase:codependix`, inside `guard-code` in the 💂 Guard check |
| `callidescope` | Traces call stacks through injected dependencies and flags stacks that are too deep or callables that reach too widely         | the inferred per-project `callidescope-gate` target, inside `guard-code` in the 💂 Guard check |

Each is documented in its command-line package — [conformetry-cli](../packages/ic-suite/conformetry/conformetry-cli/README.md), [codometer-cli](../packages/ic-suite/codometer/codometer-cli/README.md), [codependix-cli](../packages/ic-suite/codependix/codependix-cli/README.md), [callidescope-cli](../packages/ic-suite/callidescope/callidescope-cli/README.md) — and each has agent skills for the same three moments, which read just as well for a human: running it, configuring it, and acting on what it said (codependix adds a fourth, for reading a graph the repository already committed). They are the `conformetry-*`, `codometer-*`, `codependix-*`, and `callidescope-*` entries under [.agents/skills](../.agents/skills).

Conformetry is the one you should reach for deliberately rather than only meet as a failure: **generate rather than hand-craft**, because code written in a shape a template already describes starts life failing conformance. `nx g conformetry:` lists the generators, and `conformetry templates` describes what each one produces.

Every configuration these four read lives in [configuration/](../configuration), one file per toolchain, alongside per-project `codometer.config.ts` files that spread the shared object.

> ⚠️ **Each toolchain ships an `*-examples` package that contains code which is deliberately wrong** — a breaching limit, a `tsconfig.json` the compiler cannot parse, a stack eight frames deep, an instance missing an export. Each is the reproduction of a failure you will hit, and "fixing" one deletes the only place that behavior is demonstrated. Every examples package's `AGENTS.md` lists its own, and maps "the tool said X" to the example that reproduces X in about a second.

## Git Hooks (Husky)

Three Husky hooks enforce quality gates locally, from [configuration/.husky/](../configuration/.husky). **Never bypass them with `--no-verify`** — fix the underlying issue instead.

| Hook         | Trigger      | What it runs                                                                                                       | Config                                                                |
| ------------ | ------------ | ------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------- |
| `pre-commit` | `git commit` | GPG signing configuration check, then **lint-staged**: format, lint, typecheck, spelling, and more on staged files | [lint-staged.config.ts](../configuration/lint-staged.config.ts)       |
| `commit-msg` | `git commit` | **commitlint**: validates the Conventional Commits format                                                          | [commitlint.config.ts](../configuration/commitlint.config.ts)         |
| `pre-push`   | `git push`   | **validate-branch-name**, then a commit signature check over the pushed commits                                    | [validate-branch-name.config.cjs](../validate-branch-name.config.cjs) |

If a hook fails, the git operation is blocked until you fix the error. `pre-commit` writes its full output to `last-lint-staged-output.log`, which is where to look when the terminal output is truncated.

Both signing checks are run by Husky already — do not invoke `scripts/git/` signing scripts by hand in a normal commit or push.

## Working in a Git Worktree

Worktrees are the normal way to run several branches side by side here, and three traps are specific to this repository.

- **`pnpm-lock.yaml` goes dirty on its own.** `pnpm install` or `lint-code --write` rewrites the `applications/JimmyPaolini` entry, because a placeholder `package.json` is inconsistently present across checkouts. Revert the lockfile rather than trying to reconcile it.
- **Never run `git submodule update --init` for `applications/JimmyPaolini`.** That submodule is deliberately left uninitialized everywhere, locally and in CI. A `-` prefix in `git submodule status` is expected here, not broken.
- **The stash stack is shared with every other worktree.** A bare `git stash pop` can take someone else's work. Prefer a temporary commit, or `git stash push -u -m "<unique-tag>"` and `git stash apply <sha>`.

The branch name is not free-form in a worktree either — derive one from the tables below and validate it before creating anything, since an unvalidated branch cannot be pushed. If the branch already exists locally, attach a worktree to it rather than creating a second branch. See [using-git-worktrees](../.agents/skills/using-git-worktrees/SKILL.md).

## Branch Naming Guidelines

**Required format:** `<type>/<scope>-<description>` — all three parts required.

- **Type and scope** must be exact values from the [Types](#types) and [Scopes](#scopes) tables. An invented scope fails validation even when the branch name reads well.
- **Description** is kebab-case matching `[a-z0-9-]+` — no uppercase, underscores, dots, or extra slashes.

**Examples**: `feat/lexico-user-auth`, `fix/caelundas-timezone-bug`, `docs/documentation-contributing-guide`

Validate before pushing:

```bash
pnpm exec validate-branch-name -t "<branch-name>"
```

Only `main` is exempt. Automated prefixes are also accepted: `copilot/*`, `dependabot/*`, `jimmypaolini/copilot/*`, `renovate/*`. Both the pre-push hook and 🧑‍⚖️ Comply Code reject anything else, so an unvalidated branch wastes the push. See [checkout-branch](.agents/skills/checkout-branch/SKILL.md) for deriving a name, and [rename-branch](.agents/skills/rename-branch/SKILL.md) for fixing one.

## Commit Guidelines

Format: `<type>(<scope>): <gitmoji> <subject>` — a single line, max 128 characters.

- **Type and scope** come from the tables below, both lowercase
- **Gitmoji required** as the first token of the subject
- Subject is lowercase, present-imperative (`add`, not `added` or `adds`), with no trailing period
- **Body and footer are forbidden**, except lines that are exactly `Co-authored-by:` trailers. Everything else belongs in the subject or the pull request description
- Never list multiple changes — summarize at a higher level, or split the commit

Common gitmojis: ✨ `feat` · 🐛 `fix` · 📝 `docs` · 🧪 `test` · ♻️ `refactor` · 🎨 `style` · ⚡️ `perf` · 🔧 `chore` · 👷 `ci` · 📦 `build` · ⏪ `revert`

**Breaking changes**: add `!` after the scope, or a `BREAKING CHANGE:` footer.

**Examples**:

```text
feat(lexico): ✨ add user profile page
fix(caelundas): 🐛 correct aspect angle calculation
docs(documentation): 📝 update contributing guide
feat(lexico)!: 💥 redesign authentication
```

Commits are validated by commitlint through Husky. See [commit-code](.agents/skills/commit-code/SKILL.md) for details.

### Types

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

### Scopes

<!-- scopes-start -->

| Scope               | Description                                                                                                                               |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `ic-suite`          | In-house code measurement and validation toolchains (Callidescope, Codependix, Codometer, Conformetry) and their shared conventions       |
| `affirmations`      | Python Jupyter notebook application for LangGraph affirmation generation                                                                  |
| `caelundas`         | Node.js CLI for astronomical calendar generation (NASA JPL ephemeris)                                                                     |
| `configuration`     | Workspace root config files (tsconfig, eslint, vitest, nx.json, etc.)                                                                     |
| `conformetry`       | Code generator templates and validation tests for generated instances                                                                     |
| `dependencies`      | Dependency version changes (upgrades, additions, removals via pnpm)                                                                       |
| `deployments`       | GitHub Actions workflows and CI/CD pipeline configuration                                                                                 |
| `documentation`     | Markdown docs, skills, planning files, and AGENTS.md files                                                                                |
| `infrastructure`    | Helm charts, Terraform configs, and Kubernetes resources                                                                                  |
| `JimmyPaolini`      | Static GitHub profile README project (markdown and assets)                                                                                |
| `lexico`            | TanStack Start SSR Latin dictionary web app with Supabase backend                                                                         |
| `lexico-components` | Shared React/shadcn component library                                                                                                     |
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

If a change genuinely spans scopes, list them comma-separated (`feat(lexico,logger): ...`) rather than reaching for an umbrella scope. Better still, keep one project or module per pull request — see [Release Significance](#release-significance) for why.

## Release Significance

This repository squash-merges using the pull request title, so **the title is the only thing semantic-release ever sees**. Every individual commit on the branch is discarded at squash time.

The `pull-request-release-significance` check reads the branch's commits and fails the pull request when the title's type is **less** release-significant than the most significant commit on the branch, or when the title shares no scope overlap with a commit.

**Practical effect:** pick the type and scope for the branch as a whole before you start committing, and keep every commit at or below that significance.

- A `feat` commit on a branch titled `chore` or `ci` fails the check — either retitle the pull request as `feat`, or move that commit to its own branch.
- Mixing `feat` and `fix` work is fine; title it `feat`, since `feat` outranks `fix`. Mixing only breaks when a later commit is _more_ significant than the type already chosen.

This is also why one project or module per pull request is the rule: the fewer concerns a branch carries, the less likely it accumulates a commit that outranks its title.

## Issues and Planning

Issues and specs live as GitHub issues in [Organizzolini/codebase](https://github.com/Organizzolini/codebase/issues). Blank issues are disabled, so a human-filed issue goes through the single template, whose Type and Scope dropdowns are kept in step with `configuration/conventional.config.cjs` by a synchronization target:

```bash
gh issue create --template issue.yml
```

Issue titles follow the same `<type>(<scope>): <gitmoji> <subject>` convention as commits. Unlike a pull request title this is not enforced, so a quick backlog-idea title is a normal shape for an issue. Labels are the `type:*` and `scope:*` labels matching the title, one `source:*` label, and a triage label — `status:needs-triage`, `status:needs-info`, `status:ready-for-agent`, `status:ready-for-human`, or `wontfix`. A sixth, `status:in-progress`, is applied once implementation begins rather than during triage.

The Continuous Compliance workflow checks issue metadata on `opened`, `edited`, `labeled`, and `unlabeled`, and on `opened` first reconciles the labels a submitted form implies. It has its own README badge, so a red one there means an issue and nothing else.

Planned work is filed in three layers — a spec, one parent issue per pull request beneath it, and one sub-issue per planned commit beneath that:

```text
spec issue          the specification the work came from
└── parent issue    one per pull request
    └── sub-issue   one per planned commit
```

See [docs/agents/issue-tracker.md](docs/agents/issue-tracker.md) and [docs/agents/triage-labels.md](docs/agents/triage-labels.md) for the full conventions.

## Pull Request Process

1. **Push and open**: `git push -u origin <branch>`, then `gh pr create` and fill in the template. Do not use `--fill` — it substitutes the commit message for the body and drops the four required headings
2. **Title** follows the commit format — `<type>(<scope>): <gitmoji> <subject>`, checked by the same commitlint configuration, so every commit rule applies
3. **Description** must contain all four headings from [.github/PULL_REQUEST_TEMPLATE.md](.github/PULL_REQUEST_TEMPLATE.md) verbatim — 🌰 Summary, 📝 Details, 🧪 Testing, 🔗 Related. Comply Code greps for each and fails when one is missing
4. **Labels and assignees** must agree with the title: exactly one `type:*` label matching the title's type, exactly the `scope:*` labels the title names and no extras, at least one assignee, and exactly one `source:*` label (`source:agent` or `source:human`) declaring who opened it. The `do-not-merge` label blocks the pull request while present
5. **Automated checks**: the five workflows in [The Gates](#the-gates) must pass
6. **Code review**: requires `@JimmyPaolini` approval ([CODEOWNERS](.github/CODEOWNERS))
7. **Merge**: squash and merge, then delete the branch

Comply Code creates any label missing from the vocabulary when a pull request is opened or reopened, so a fresh pull request already has the labels it needs. That vocabulary lives in [configuration/conventional.config.cjs](configuration/conventional.config.cjs) and is never hard-coded elsewhere.

Merges go through a merge queue, and the check workflows run again on the queued merge commit — a pull request that was green on its own can still fail there once `main` has moved underneath it.

A pull request with merge conflicts runs almost none of these workflows — a short list of green checks means nothing was validated. Resolve conflicts before reading the checks as a pass.

See [create-pull-request](.agents/skills/create-pull-request/SKILL.md) and [update-pull-request](.agents/skills/update-pull-request/SKILL.md) for the full workflow.

## Release Process

Releases operate at two distinct tiers:

1. **Workspace Root (Repository)**: Uses [semantic-release](https://semantic-release.gitbook.io/), fully automated on merge to `main` by the 🦸 Continuous Deployment workflow (`push-releases` target). Versioning is fixed — the whole codebase shares one version — and nothing is published to a package registry.
2. **IC-Suite Packages (Publishable Packages)**: Uses [Nx Release](https://nx.dev/features/manage-releases) to independently version and publish the 28 publishable packages across the four toolchains (`callidescope`, `codependix`, `codometer`, `conformetry`). Each package is versioned from its own commit history, and upstream bumps automatically cascade patch bumps to internal dependents. The 8 unpublished packages (`*-agents` and `*-examples` across the four suites) are explicitly excluded in `nx.json` (`release.projects`) in addition to their private manifest flags.

**Version bumps**, from `releaseRules` in [release.config.cjs](../configuration/release.config.cjs):

| Bump  | Types                                                                           |
| ----- | ------------------------------------------------------------------------------- |
| Major | Any breaking change — `!` after the scope, or a `BREAKING CHANGE:` footer       |
| Minor | `feat`                                                                          |
| Patch | `fix`, `perf`, `refactor`, `build`, `revert`                                    |
| None  | `docs`, `style`, `test`, `ci`, `chore`, or any type with the `no-release` scope |

**Workflow**: merge to `main` → semantic-release analyzes the squashed commit → bumps the version → updates `CHANGELOG.md` → creates the tag and GitHub release.

**Test locally:**

```bash
# Preview workspace root semantic-release
pnpm semantic-release:dry-run

# Preview IC-suite package releases and versions
pnpm exec nx release --dry-run
pnpm exec nx release version --dry-run
```

Never hand-edit `CHANGELOG.md` or bump a version manually. A green Continuous Deployment run does not by itself mean a release happened — most runs are correctly no-ops.

## Code Ownership

All files are owned by `@JimmyPaolini` (see [.github/CODEOWNERS](.github/CODEOWNERS)).

Pull requests require owner approval before merging.

## Environment Variables

Each project ships a `.env.default` template with safe placeholder values. `scripts/local/environment.sh` copies each to `.env` during setup and never overwrites an existing one. To do it by hand, copy `.env.default` to `.env` in the directory you need and fill in the values.

### Root (`.env.default`)

| Variable                                     | Purpose                                                             |
| -------------------------------------------- | ------------------------------------------------------------------- |
| `GH_TOKEN` / `GITHUB_TOKEN`                  | GitHub token for `gh`, release automation, and agent sessions       |
| `CODEBASE_ENVIRONMENT`                       | Environment: `local`, `devcontainer-local`, or `devcontainer-cloud` |
| `LOCAL_WORKSPACE_FOLDER`                     | Workspace path, appended by setup for `docker-compose` mounts       |
| `OLLAMA_HOST`                                | Ollama server URL (default: `http://localhost:11434`)               |
| `SEARXNG_HOST`                               | SearxNG server URL (default: `http://localhost:8889`)               |
| `POSTGRES_HOST` / `POSTGRES_PORT`            | Local PostgreSQL connection target (`localhost`, `5432`)            |
| `POSTGRES_USER` / `POSTGRES_PASSWORD`        | Local PostgreSQL credentials (`postgres` / `postgres`)              |
| `POSTGRES_DB`                                | Local PostgreSQL database name (`postgres`)                         |
| `GEMINI_API_KEY`                             | Gemini key used by OpenWiki documentation generation                |
| `OPENWIKI_PROVIDER` / `OPENWIKI_MODEL`       | OpenWiki model selection                                            |
| `OPENWIKI_TELEMETRY_DISABLED`                | Opts OpenWiki out of telemetry                                      |
| `TF_VAR_linode_token`                        | Linode API token for Terraform provisioning                         |
| `TF_VAR_linode_kubernetes_engine_cluster_id` | Linode Kubernetes Engine cluster ID for deployments                 |

### caelundas (`applications/caelundas/.env.default`)

| Variable           | Default      | Purpose                                       |
| ------------------ | ------------ | --------------------------------------------- |
| `LATITUDE`         | `39.949309`  | Observer latitude for ephemeris calculations  |
| `LONGITUDE`        | `-75.17169`  | Observer longitude for ephemeris calculations |
| `START_DATE`       | `2026-07-01` | Calculation start date (YYYY-MM-DD)           |
| `END_DATE`         | `2026-07-31` | Calculation end date (YYYY-MM-DD)             |
| `OUTPUT_DIRECTORY` | `./output`   | Directory for generated calendar files        |

Other projects ship their own templates; read the `.env.default` beside the project you are working on.

## Dependency Update Workflow

The 🧑‍🚒 Upgrade Dependencies workflow runs weekly and opens a reviewable pull request with dependency bumps and refreshed agent skills. To check or update by hand:

```bash
pnpm outdated
```

```bash
pnpm update
```

Add a dependency through the package manager so the manifest and lockfile stay in step — `@nx/dependency-checks` fails lint when an imported package is missing from its project's `package.json`:

```bash
pnpm add --filter <project> <package>
```

```bash
pnpm add -w <package>
```

## Additional Resources

- [AGENTS.md](../AGENTS.md) — the full conventions reference, mirrored to `.claude/CLAUDE.md` and `.github/copilot-instructions.md`
- [CONTEXT.md](../CONTEXT.md) — domain model and shared vocabulary
- [docs/adr](../docs/adr) — architecture decision records
- [openwiki/quickstart.md](../openwiki/quickstart.md) — generated code documentation
- [.agents/skills](../.agents/skills) — agent skills, the canonical source for every agent entrypoint
- [Commit Messages Guide](../.agents/skills/commit-code/SKILL.md)
- [Code Validation Guide](../.agents/skills/validate-code/SKILL.md)
- [Semantic Release Config](../configuration/release.config.cjs)
- [GitHub Actions Workflows](./workflows)
- [Gitmoji Reference](https://gitmoji.dev)
- [Nx Documentation](https://nx.dev)
- [Conventional Commits](https://www.conventionalcommits.org/)

## Getting Help

- **Issues:** [GitHub Issues](https://github.com/Organizzolini/codebase/issues)
- **Discussions:** [GitHub Discussions](https://github.com/Organizzolini/codebase/discussions)
- **Security:** [SECURITY.md](SECURITY.md)
- **Owner:** [@JimmyPaolini](https://github.com/JimmyPaolini)

## License

MIT License. Copyright (c) Jimmy Paolini.
