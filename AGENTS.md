# Codebase Guidance

## Essential Commands

```bash
# Run tasks via Nx (always prefer this)
nx run <project>:<target>:<configuration>
nx run-many --target=typecheck-code,lint-code,format-code,deprecate-code,guard-code --all
nx affected --target=vitest --base=main

# Install dependencies
pnpm add --filter <project> <package>
pnpm add -w <package>  # Workspace root

# Tools that run directly (not via Nx)
docker build --platform linux/amd64 -t myapp .
kubectl get pods
helm upgrade --install myrelease ./chart
```

## Agent Workflow

Work in this repository integrates skills from both
[mattpocock/skills](https://github.com/mattpocock/skills) and
[obra/superpowers](https://github.com/obra/superpowers) to clarify, specify,
track, implement, and review non-trivial features, refactors, and bugfixes with
strict verification gates.

**Planning is human-gated; implementation is continuous.** During planning,
never chain skills automatically — stop after each step and wait for explicit
invocation. During implementation, subagents execute autonomously and may create
sub-issues without asking.

1. **Clarify**: Run [brainstorming](.agents/skills/brainstorming/SKILL.md) with
   [grill-with-docs](.agents/skills/grill-with-docs/SKILL.md) (domain models/ADRs)
   or [grill-me](.agents/skills/grill-me/SKILL.md) (plain interview). Follow
   [grilling](.agents/skills/grilling/SKILL.md) pacing (one numbered frontier
   with recommendations; ask [ask-matt](.agents/skills/ask-matt/SKILL.md) if
   unsure). When done, summarize understanding and **stop**.
2. **Specify**: Run [to-spec](.agents/skills/to-spec/SKILL.md) only on manual
   request. Publish the spec issue, link it, and **stop**.
3. **Decompose**: Run [to-tickets](.agents/skills/to-tickets/SKILL.md) only on
   manual request. Confirm breakdown, publish tickets/sub-issues, and **stop**.
   Reach for [wayfinder](.agents/skills/wayfinder/SKILL.md) if work exceeds one
   session. (Ignore `writing-plans` / `docs/superpowers/specs/` hand-offs; see
   [`docs/agents/issue-tracker.md`](docs/agents/issue-tracker.md)).
4. **Handoff**: Run [handoff](.agents/skills/handoff/SKILL.md) only on manual
   request for multi-session work. Post the `# Handoff` comment on the spec issue
   (see [Handoffs](#handoffs)) and **stop**.
5. **Build**: Set tickets to `status:in-progress` before testing (see
   [`docs/agents/issue-tracker.md`](docs/agents/issue-tracker.md)).
   - **Multi-ticket spec**: Dispatch each parent issue to a fresh subagent
     ([subagent-driven-development](.agents/skills/subagent-driven-development/SKILL.md));
     never implement sequentially in this session. Parallelize independent tickets
     ([dispatching-parallel-agents](.agents/skills/dispatching-parallel-agents/SKILL.md))
     or stack dependent ones ([gh-stack](.agents/skills/gh-stack/SKILL.md)). Brief each
     with its ticket, the spec, and steps 5–8. See
     [Multiple Pull Requests](#multiple-pull-requests).
   - **TDD loop**: Use [implement](.agents/skills/implement/SKILL.md) with
     [test-driven-development](.agents/skills/test-driven-development/SKILL.md) (strict
     red-green cycle) and [tdd](.agents/skills/tdd/SKILL.md) (confirmed seams, public
     interfaces; refactoring belongs to step 6). Test via `nx run <project>:vitest:<kind>`
     (see [Testing & Coverage](#testing--coverage)).
   - **Debugging**: Use [systematic-debugging](.agents/skills/systematic-debugging/SKILL.md)
     (root-cause gate) with [diagnosing-bugs](.agents/skills/diagnosing-bugs/SKILL.md).
6. **Review**: Request review via
   [requesting-code-review](.agents/skills/requesting-code-review/SKILL.md) (fresh subagent
   handed base/head commits), review with [code-review](.agents/skills/code-review/SKILL.md),
   and apply feedback via [receiving-code-review](.agents/skills/receiving-code-review/SKILL.md).
7. **Validate**: Run [validate-code](.agents/skills/validate-code/SKILL.md) gated by
   [verification-before-completion](.agents/skills/verification-before-completion/SKILL.md).
8. **Integrate**: Use [finishing-a-development-branch](.agents/skills/finishing-a-development-branch/SKILL.md)
   for the merge/PR decision, executing via [submit-changes](.agents/skills/submit-changes/SKILL.md),
   [commit-code](.agents/skills/commit-code/SKILL.md), and
   [create-pull-request](.agents/skills/create-pull-request/SKILL.md). Read its test step as
   `nx affected --target=vitest --base=main`.

Steps 5 through 8 are one ticket's lap, not the whole race — run directly by this
session for a single-ticket spec, or inside each dispatched subagent for a
multi-ticket one. A pull request opened sends you back to step 5 for the next
ticket or stack link. See [Multiple Pull Requests](#multiple-pull-requests).

The codebase-native skills still own this repository's mechanics — branch
names, commits, pull requests, Nx targets, and validation. Prefer them over any
general-purpose equivalent, and see the [Skills](#skills) list for the full set.

### Multiple Pull Requests

**A spec is done when every ticket under it is merged or open as a pull
request — never when the first one is.** The usual failure is a session that
builds the first ticket well, opens its pull request, reports the work complete,
and leaves the rest of the spec with nobody holding it. One ticket is one pull
request; the whole ticket set is the assignment.

Read the parent issues and their sub-issues before the first test and write the
dependency order down. That order, rather than the issue numbering, decides the
shape of the run:

- **Independent tickets run in parallel** — each in its own worktree cut from
  `main` via [using-git-worktrees](.agents/skills/using-git-worktrees/SKILL.md),
  dispatched with
  [dispatching-parallel-agents](.agents/skills/dispatching-parallel-agents/SKILL.md).
- **Dependent tickets stack** — each branched off the ticket it needs rather
  than off `main` and submitted with
  [gh-stack](.agents/skills/gh-stack/SKILL.md), so every pull request still
  reviews as its own diff. Typecheck the upper layers after rebasing a lower
  one: a replay can be conflict-free and still leave them broken. Dispatch the
  next link in the chain once the ticket beneath it has an open pull request —
  not once it merges, per the rule below.

Each dispatched ticket subagent is self-contained: its own worktree, branch,
implementation, tests, validation, and pull request, all inside that
subagent's context. This orchestrating session never reads the files a
dispatched ticket touches — only the report the subagent returns. That
separation, not just the parallelism, is why tickets are dispatched rather
than implemented here one after another: it is what keeps this session able
to re-plan the remaining tickets, answer a subagent's mid-task question, or
reorder the stack without running out of room.

Two things keep the run from stalling. **An open pull request is a finished
ticket**, so do not idle waiting for a review or a merge before starting the
next one — the only thing that forces an order is a ticket whose branch
another must sit on, which is what the stack is for. And **a blocked ticket
does not end the run**, so build every ticket that is not blocked, then say
plainly which were left and why. Quietly narrowing a spec to its first ticket
is the failure this section exists to prevent.

Close by reporting the set — one row per ticket with its branch, its pull
request, and its status.

### Handoffs

A planning session ends where an implementation session begins, and whatever the
handoff document does not say, the next agent invents. It is also the only record
that step 1's approval gate was passed, which is what makes an uninterrupted
implementation run legitimate. Five repository rules override
[handoff](.agents/skills/handoff/SKILL.md)'s defaults:

- **Post it as a comment on the spec issue**, not in the operating system's
  temporary directory the skill defaults to — the next session cannot be pointed
  at that, and the next reboot may empty it. On the issue, the next session gets
  the plan, the tickets, and the brief from one link.
- **Prescribe the workflow skills, do not suggest them.** A list of skills an
  agent "may find useful" is a list an agent skips. Write a numbered "How to run
  this" section naming each skill in call order:
  [using-git-worktrees](.agents/skills/using-git-worktrees/SKILL.md) for each
  ticket's own worktree, then
  [subagent-driven-development](.agents/skills/subagent-driven-development/SKILL.md)
  at ticket granularity — a fresh subagent per parent issue, dispatched
  together with
  [dispatching-parallel-agents](.agents/skills/dispatching-parallel-agents/SKILL.md)
  for the tickets that are independent, or one at a time down a
  [gh-stack](.agents/skills/gh-stack/SKILL.md) chain for the ones that are
  not — and, inside each dispatched ticket,
  [implement](.agents/skills/implement/SKILL.md) and
  [tdd](.agents/skills/tdd/SKILL.md), with subagent-driven-development invoked
  again at task granularity if that ticket itself splits into several tasks,
  then steps 6–8 above. Say plainly that this session is the orchestrator: it
  dispatches tickets and reads their reports back, and implements a ticket in
  its own context only when the spec holds exactly one.
- **Answer the two questions those skills otherwise stop and ask.**
  `subagent-driven-development` keys its workspace and ledger off a **plan file
  path**, so say to export the issue's plan to a local scratch file first. And
  `tdd` will not write a test at an unconfirmed seam, so point it at the spec's
  Testing Decisions and say to treat those as the confirmation — otherwise a
  session told to run uninterrupted stops before its first test.
- **Say how the work is cut into pull requests, and that every one of them is
  this session's job.** One ticket per pull request, and name each branch or at
  least the type and scope every branch must take — a squashed title is all
  semantic-release ever sees, so the ticket split decides
  [Release Significance](.github/CONTRIBUTING.md#release-significance). Then give the dependency order:
  which tickets are independent and run in parallel off `main`, and which stack
  with [gh-stack](.agents/skills/gh-stack/SKILL.md) because one needs another's
  branch underneath it. "This session's job" means dispatching and
  orchestrating every one of them — see
  [Multiple Pull Requests](#multiple-pull-requests) for why that, not
  implementing each ticket directly, is the rule. A brief that lists tickets
  without stating that the session owns **all** of them is a brief that
  returns one pull request and nothing else, so write the exit condition
  out — every ticket merged or open — and point at that same section.
- **Assign a model and thinking level per role.** Orchestrating a ticket set,
  implementing one ticket, and reviewing a diff are different problems and should
  not draw the same reasoning budget. No table of model names lives here on
  purpose — it would be stale within a release or two.

## Projects

Every project lives in `projects/`: directly as `projects/<project>`, or one
level deeper when a domain groups several (`projects/lexico/<project>`, and
`projects/ic-suite/<toolchain>/<project>` for the IC suite). Its
`type:application` or `type:package` tag, not its folder, says which kind it is. Read the
current set rather than a list kept here — a hand-maintained list drifts, and
nothing would gate this one:

```bash
nx show projects
```

[`README.md`](README.md) carries the annotated table, one row per project, and
`nx run codebase:check-readme-projects` fails when it misses one.

**A commit scope is not a project.** The scope vocabulary is the closed set in
[Conventional Naming](.github/CONTRIBUTING.md#commit-guidelines), and it collapses each toolchain to
a single name: every `callidescope-*`, `codependix-*`, `codometer-*`, and
`conformetry-*` package commits under `callidescope`, `codependix`, `codometer`,
and `conformetry` respectively. Deriving a scope from a directory name is how an
invented scope fails validation.

## Work Scope

- When coding or refactoring, focus on one project at a time, or for sufficiently large requests only one module/folder at a time.
- If a request spans multiple projects or scopes, complete the first project end-to-end before starting the next one.
- If the work is truly independent across projects, split it into separate subagents or separate passes so each agent stays project-scoped.
- Avoid mixing unrelated project changes in one context unless the task is explicitly orchestrating them.
- This also keeps a pull request's commits at one release significance: see [Release Significance](.github/CONTRIBUTING.md#release-significance) for why a branch that stays within one project or module rarely accumulates a commit more significant than the type its title was going to use.

## Code Quality & Conventions

**Every coding agent MUST run the [validate-code skill](.agents/skills/validate-code/SKILL.md) before declaring any implementation task complete.** This is non-negotiable.

```bash
# Auto-fix all format, lint, and unused-code issues
pnpm exec nx affected --target=typecheck-code,lint-code,format-code,deprecate-code,guard-code --configuration=write --base=main

# Verify no issues remain — all checks must pass
pnpm exec nx affected --target=typecheck-code,lint-code,format-code,deprecate-code,guard-code --configuration=check --base=main
```

For new/untracked files not yet picked up by `nx affected`:

```bash
pnpm exec nx run <project>:typecheck-code,lint-code,format-code,deprecate-code,guard-code --configuration=write
pnpm exec nx run <project>:typecheck-code,lint-code,format-code,deprecate-code,guard-code --configuration=check
```

**Do not commit until both commands pass cleanly.** If they fail, use the [triage-integration skill](.agents/skills/triage-integration/SKILL.md) to diagnose and fix the errors.

**TypeScript type coverage rule:** For any touched TypeScript project that defines a `type-coverage` target, run both `typecheck` and `type-coverage` before declaring implementation complete. Passing `typecheck` alone is not sufficient when `type-coverage` is available.

**Never silence errors with disable comments or configuration changes.** Do not use `// eslint-disable`, `// eslint-disable-next-line`, `// @ts-ignore`, `// @ts-expect-error`, `/* eslint-disable */`, `nocheck`, or similar suppression comments to work around lint or type errors. Do not loosen TypeScript `compilerOptions` (e.g. enabling `skipLibCheck`, disabling `strict` flags) or add ESLint `ignores`/`rules` overrides to suppress specific errors. Instead, triage the root cause and fix the code. Suppression is only permitted when the user explicitly requests it.

See the [validate-code skill](.agents/skills/validate-code/SKILL.md) for the full validation workflow and per-tool fix guidance.

### IC-Suite

Four in-house toolchains measure this workspace and gate what they measure:

- **callidescope**: Call-stack depth, breadth
- **codependix**: Dependency-graph boundary rules
- **codometer**: Sizes, counts, comment-block length
- **conformetry**: Generated code against its template

Use the respective agent skills (e.g., `codometer-measure`, `callidescope-triage`) to interact with these toolchains. Scaffold with `conformetry-generate` instead of hand-crafting. Never manually edit limits, bypass rules, or hand-edit generated output to make a check pass.

### Project Structure & Boundaries

- **Strict folder structure** is enforced by ESLint. Always use `conformetry-generate` (e.g., `nx g conformetry:<generator>`) to scaffold new files and modules to ensure correct placement. See `configuration/codebase-structure.json` for the raw rules.
- **Respect Nx module boundaries** defined in `eslint.config.ts`. Applications cannot import applications, and packages cannot import applications. Use the `codependix-navigate` skill to check dependency rules.

### Testing & Coverage

Tests must accompany code. Run tests via `nx run <project>:vitest:<unit|integration>`. Coverage and size gates are strictly enforced; do not lower thresholds to pass CI. Consult the [testing-strategy skill](.agents/skills/testing-strategy/SKILL.md) for testing requirements and patterns.

### Language Conventions & Size Limits

For naming conventions, abbreviations, formatting, and language-specific rules, invoke the `write-typescript` or `write-python` skills. Strict size limits apply (e.g., max 512 lines per file, 128 words per comment block). Split files and refactor rather than ignoring limits.

## Git Workflow

[`CONTRIBUTING.md`](.github/CONTRIBUTING.md) contains the full narrative for worktrees, hooks, branch naming, commits, releases, and the pull request process. **Do not execute raw Git commands for these workflows.** Instead, rely entirely on the provided skills which inherently enforce this repository's conventions:

- **Worktrees & Branches**: Use [using-git-worktrees](.agents/skills/using-git-worktrees/SKILL.md) and [checkout-branch](.agents/skills/checkout-branch/SKILL.md).
- **Commits**: Use [commit-code](.agents/skills/commit-code/SKILL.md) to generate Conventional Commits with Gitmoji.
- **Pull Requests**: Use [create-pull-request](.agents/skills/create-pull-request/SKILL.md) and [submit-changes](.agents/skills/submit-changes/SKILL.md).
- **Stacking/Splitting Work**: Use [gh-stack](.agents/skills/gh-stack/SKILL.md).

**Agent-Specific Rules:**

- **Never bypass git hooks** with `--no-verify` — fix the underlying issue instead.
- **Do not run signing-check scripts manually**; Husky already runs these.
- **Never run `git submodule update --init` for `projects/JimmyPaolini`.** That submodule is deliberately uninitialized everywhere. If `pnpm install` rewrites its `pnpm-lock.yaml` entry, **revert the lockfile** rather than reconciling it.
- **Release Significance:** The PR title determines the semantic-release bump. Ensure the PR title's type is at least as significant as the highest commit on the branch.
- **Pull Request Compliance:**
  - Every PR description must carry all 4 mandatory sections (`## 🌰 Summary`, `## 📝 Details`, `## 🧪 Testing`, `## 🔗 Related`) with real content and no unfilled placeholder comments. Never omit `🔗 Related` (link to specs, files, or documentation if no issue exists).
  - Pre-flight validate PR descriptions locally using `projects/validation/src/main.ts pull-request-body <path-to-body>` before creating the PR.
  - Set all required metadata at creation: `--assignee @me`, `--label type:<type>`, `--label scope:<scope>`, and `--label source:agent`.
- **Conventional Naming:** If you need to view the current valid Types and Scopes without using a skill, read `configuration/conventional.config.cjs`.

## Agent Context

`.agents/skills/` and this file are the single sources of truth.
Use the [symlink-files](.agents/skills/symlink-files/SKILL.md) skill to understand how other entry points mirror them.

### Session Hooks

Startup scripts run at the start of every agent session and inject their failure as additional context. **Fix what they report before writing any code.** Use the [agent-session-hooks](.agents/skills/agent-session-hooks/SKILL.md) skill to understand how they work or to add a new check.

### Instructions

Guidelines for creating custom instruction files, skills, agents, and prompts for GitHub Copilot. See [`.github/instructions/`](.github/instructions) for actual implementations:

- `agent-skills.instructions.md`: Structure and format for skill files
- `agents.instructions.md`: Building specialized agent workflows
- `instructions.instructions.md`: Writing context-specific guidance
- `prompt.instructions.md`: Designing reusable prompt templates

### Skills

Specialized domain knowledge for working on specific systems or patterns, in
[`.agents/skills/`](.agents/skills). Every agent is given the installed skills
directly, so they are not listed here — reading the directory is what tells you
which ones exist right now, including the ones installed from other
repositories.

Writing or editing one — in `.agents/skills/`, or in the four `*-agents`
packages this repository publishes — is its own task with its own two skills:
[writing-skills](.agents/skills/writing-skills/SKILL.md) for how a skill is
built and verified before it ships, and
[writing-for-agents](.agents/skills/writing-for-agents/SKILL.md) for the prose
inside it.

**Every skill is committed**, vendored ones included. Use the [install-skills](.agents/skills/install-skills/SKILL.md) skill to understand how skills are updated (`skills update`), installed, and excluded from repository tooling.

### Agent Skills Configuration

The [mattpocock/skills](https://github.com/mattpocock/skills) engineering skills
read their per-repository configuration from `docs/agents/`. Edit these files
directly; re-run `/setup-matt-pocock-skills` only to switch issue trackers or
start over.

| Concern       | Setting                                                                                                                    | Reference                                                      |
| ------------- | -------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| Issue tracker | GitHub Issues in `Organizzolini/codebase`, via the `gh` CLI — a spec, then one issue per pull request, then one per commit | [`docs/agents/issue-tracker.md`](docs/agents/issue-tracker.md) |
| Triage labels | The five canonical roles mapped onto this repository's `status:` label family                                              | [`docs/agents/triage-labels.md`](docs/agents/triage-labels.md) |
| Domain docs   | Single-context — one root `CONTEXT.md` plus root `docs/adr/`                                                               | [`docs/agents/domain.md`](docs/agents/domain.md)               |

`CONTEXT.md` and `docs/adr/` are both populated now.
[domain-modeling](.agents/skills/domain-modeling/SKILL.md) grows them lazily, as
terms and decisions actually get resolved — so add to them when a decision
lands, rather than scaffolding ahead of the work.

<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

## General Guidelines for working with Nx

- For navigating/exploring the workspace, invoke the `nx-workspace` skill first - it has patterns for querying projects, targets, and dependencies
- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- Prefix nx commands with the workspace's package manager (e.g., `pnpm nx build`, `npm exec nx test`) - avoids using globally installed CLI
- You have access to the Nx MCP server and its tools, use them to help the user
- For Nx plugin best practices, check `node_modules/@nx/<plugin>/PLUGIN.md`. Not all plugins have this file - proceed without it if unavailable.
- NEVER guess CLI flags - always check nx_docs or `--help` first when unsure

## Scaffolding & Generators

- For scaffolding tasks (creating apps, libs, project structure, setup), ALWAYS invoke the `nx-generate` skill FIRST before exploring or calling MCP tools

## When to use nx_docs

- USE for: advanced config options, unfamiliar flags, migration guides, plugin configuration, edge cases
- DON'T USE for: basic generator syntax (`nx g @nx/react:app`), standard commands, things you already know
- The `nx-generate` skill handles generator discovery internally - don't call nx_docs just to look up generator syntax

<!-- nx configuration end-->

<!-- Hand-written, and deliberately outside the Nx-managed block above:
     anything between those markers is regenerated and would be lost. -->

- **This workspace has no `test` target.** The `nx-*` skills are installed from
  [nrwl/nx](https://github.com/nrwl/nx) and their examples use the conventional
  `nx run-many -t test`, which fails here. Read `test` as `vitest` — or
  `pytest` for a `language:python` project — and see
  [Testing & Coverage](#testing--coverage) for the real target names.

<!-- OPENWIKI:START -->

## OpenWiki

This repository uses OpenWiki for recurring code documentation. Start with `openwiki/quickstart.md`, then follow its links to architecture, workflows, domain concepts, operations, integrations, testing guidance, and source maps.

The scheduled OpenWiki GitHub Actions workflow refreshes the repository wiki. Do not hand-edit generated OpenWiki pages unless explicitly asked; prefer updating source code/docs and letting OpenWiki regenerate.

<!-- OPENWIKI:END -->
