# Issue tracker: GitHub

Issues and specs for this repository live as GitHub issues in [Organizzolini/codebase](https://github.com/Organizzolini/codebase). Use the `gh` CLI for all operations.

## This repository's conventions

Two repository rules override the generic guidance below.

- **Issue and spec titles follow the commit convention** — `<type>(<scope>): <gitmoji> <subject>`, with `type` and `scope` taken from the Conventional Naming tables in [AGENTS.md](../../AGENTS.md). A pull request opened against an issue is validated against the same commitlint configuration, so matching the format on the issue keeps the two aligned. Unlike a pull request title, this is not enforced — a quick backlog-idea title is a normal, intentional shape for an issue.
- **Apply the `type:*` and `scope:*` labels** that correspond to the title, alongside the triage labels in [triage-labels.md](./triage-labels.md), and one `source:*` label (`source:agent` for an issue an agent files, `source:human` for one a person files through the template).

The single issue template lives at `.github/ISSUE_TEMPLATE/issue.yml`, with required Type and Scope dropdowns kept in sync with `configuration/conventional.config.cjs` by `nx run synchronization:synchronize:write`. `blank_issues_enabled: false` in `.github/ISSUE_TEMPLATE/config.yml` means every human-filed issue goes through it — `gh issue create --template issue.yml` fills it in from the terminal. An agent creating an issue directly through `gh issue create --title ... --body ...` bypasses the form entirely, which is expected: this is the human path, and an agent applies its own `source:agent`, `type:*`, and `scope:*` labels by hand as described above.

This is enforced two ways. First, the template's required dropdowns and disabled blank issues stop most drift at the source. Second, the 🦹 Continuous Compliance GitHub Actions workflow runs on an issue's `opened`/`edited`/`labeled`/`unlabeled` events as well as on a weekly scheduled cron (every Friday at 8:18 AM NYC time): an `issue-metadata` check (`projects/validation`) validates issue labels, parent-child hierarchy depths (maximum 3 tiers: Spec → PR → Commit), and release significance constraints across open issues. In addition, the scheduled matrix job runs `audit-governance` (`projects/validation`) to enforce `.github/CODEOWNERS` validity and GitHub Actions workflow security policies. On `opened` an `issue-labels` command (`projects/synchronization`) reconciles the labels a submitted form implies onto the issue first, so a freshly filed template issue already carries them before the check runs.

The README's Continuous Compliance badge is this workflow's own status badge. It validates both issue metadata and repository governance policies across open issues and workflow configurations.

### GitHub Projects is not currently reachable

The `gh` token in use carries `gist`, `read:org`, `repo`, and `workflow` — but **not `read:project`**. Issue operations all work; anything touching Projects does not. Grant the scope before relying on a Projects board:

```bash
gh auth refresh --scopes read:project,read:org
```

## Planning shape: a spec, its pull requests, and their commits

When planning work — `/to-tickets`, `/to-spec`, or any breakdown that lands in
this tracker — file **one parent issue per pull request**, and **one sub-issue
per commit** that pull request is expected to contain. Where the breakdown came
from a spec, that spec is the third layer above both:

```text
spec issue                  the output of /to-spec
└── parent issue            one per pull request
    └── sub-issue           one per planned commit
```

- **The parent issue is the pull request.** Its title is the title that pull
  request will carry, in the commit convention above, and its scope is one
  project or module — the same bound [Work Scope](../../AGENTS.md#work-scope)
  puts on a branch. Work that will not fit in one reviewable pull request is two
  parent issues, not one parent with more sub-issues.
- **Each sub-issue is one commit.** Title it the way that commit message will
  read, so the branch's history can be written straight off the sub-issue list.
  Link it with GitHub's native sub-issue relationship rather than a task list,
  the same mechanism the wayfinder map uses below.
- **Keep every sub-issue at or below the parent's release significance.** A
  squash merge shows semantic-release only the pull request title, and the
  [pull-request-release-significance](../../projects/validation/src/modules/pull-request-release-significance/pull-request-release-significance.command.ts)
  check fails a pull request whose branch carries a commit more significant than
  its title, or a scope the title does not name. Planning the commits as
  sub-issues is where that is cheapest to get right: a `feat` sub-issue under a
  `chore` parent is a retitle now, or a failed check later. See
  [Release Significance](../../AGENTS.md#release-significance).
- **The spec issue is the parent of every parent issue.** When a grilling
  session produced a spec, link each pull request issue to it with the same
  native sub-issue relationship, so the spec carries a progress bar over the
  work and each pull request shows what it implements. The spec is never the
  parent of a commit sub-issue — those hang off the pull request they belong to,
  and an issue has exactly one parent.
- **The handoff document is a comment on the spec issue**, headed `# Handoff`,
  not a file. A fresh session should need only the spec URL to pick the work up.
  Keep it free of local filesystem paths — this repository is public.

**Approximate, deliberately.** The sub-issues are a plan for the commits, not a
contract. Implementation turns up work nobody could see from the outside — a
commit splits in two, two collapse into one, a fourth appears. That is the
expected outcome, not a planning failure. Aim for the right shape and count,
then let the branch correct it: add, close, or retitle sub-issues as the work
resolves, so the issue list still describes the pull request by the time it
opens. Do not stall planning trying to predict commits exactly, and do not
force the implementation to match a plan the code has already disagreed with.

```bash
# Parent issue — one per pull request
gh issue create --title "feat(lexico): ✨ add user profile page" --body "..."

# Child issue — one per planned commit, then linked as a native sub-issue
gh issue create --title "feat(lexico): ✨ add profile route" --body "..."
gh api repos/Organizzolini/codebase/issues/<parent>/sub_issues \
  --method POST -F sub_issue_id="$(gh api repos/Organizzolini/codebase/issues/<child> --jq .id)"
```

`sub_issue_id` takes the child's numeric **database id** (`gh api ... --jq .id`),
not its `#number` — the same distinction the dependency edges below draw. Where
sub-issues are unavailable, fall back to a task list in the parent body with
`Part of #<parent>` at the top of each child.

**Sequencing is a separate relationship, and it composes.** An issue has one
parent but any number of blockers, so use native dependencies — described under
[Wayfinder operations](#wayfinder-operations) — between parent issues wherever
one genuinely gates another, and along a parent's sub-issues so they chain in
landing order. Publish blockers first, so each edge can reference an identifier
that already exists.

**Do not look for a "relates to" endpoint.** The GitHub web UI offers one under
Relationships (shortcut `B R`), but it is exposed through **no public API** —
not REST, not GraphQL. Sub-issues and dependencies are the only relationships
that can be created programmatically.

## Marking work in progress

**Applying `status:in-progress` is the first write of an implementation
session** — before the first failing test, and before any code. It goes on
every layer the work is about to move, not only the one being typed into: the
spec issue, the parent issue whose pull request is being built, and the
sub-issue for the commit being written. `gh issue edit` takes all three
together:

```bash
gh issue edit <spec> <parent> <child> --add-label "status:in-progress"
```

- **A layer takes the label when work under it starts**, so the spec goes
  in-progress with its first parent issue and a parent goes in-progress with
  its first sub-issue. Sub-issues that are planned but not yet started stay as
  they are — the label marks what is moving, not what is scoped.
- **Drop `status:ready-for-agent` and `status:ready-for-human` in the same
  edit.** Those say the ticket is waiting to be picked up, which stops being
  true the moment it is — `/triage`'s frontier query and anyone scanning the
  board both read them that way.
- **The label comes off when the issue closes.** There is no `status:done`
  label; a closed issue is the done signal. Remove it as the ticket closes, so
  nothing sits closed and still reading as in-progress:

  ```bash
  gh issue edit <child> --remove-label "status:in-progress"
  gh issue close <child> --comment "..."
  ```

The 🦹 Continuous Compliance workflow reads only the `type:*`, `scope:*`, and `source:*`
families, so a `status:*` label neither satisfies nor fails it.

## Conventions

- **Create an issue**: `gh issue create --title "..." --body "..."`. Use a heredoc for multi-line bodies.
- **Read an issue**: `gh issue view <number> --comments`, filtering comments by `jq` and also fetching labels.
- **List issues**: `gh issue list --state open --json number,title,body,labels,comments --jq '[.[] | {number, title, body, labels: [.labels[].name], comments: [.comments[].body]}]'` with appropriate `--label` and `--state` filters.
- **Comment on an issue**: `gh issue comment <number> --body "..."`
- **Apply / remove labels**: `gh issue edit <number> --add-label "..."` / `--remove-label "..."`
- **Close**: `gh issue close <number> --comment "..."`

Infer the repo from `git remote -v` — `gh` does this automatically when run inside a clone.

## Pull requests as a triage surface

**PRs as a request surface: no.** _(Set to `yes` if this repo treats external PRs as feature requests; `/triage` reads this flag.)_

When set to `yes`, PRs run through the same labels and states as issues, using the `gh pr` equivalents:

- **Read a PR**: `gh pr view <number> --comments` and `gh pr diff <number>` for the diff.
- **List external PRs for triage**: `gh pr list --state open --json number,title,body,labels,author,authorAssociation,comments` then keep only `authorAssociation` of `CONTRIBUTOR`, `FIRST_TIME_CONTRIBUTOR`, or `NONE` (drop `OWNER`/`MEMBER`/`COLLABORATOR`).
- **Comment / label / close**: `gh pr comment`, `gh pr edit --add-label`/`--remove-label`, `gh pr close`.

GitHub shares one number space across issues and PRs, so a bare `#42` may be either — resolve with `gh pr view 42` and fall back to `gh issue view 42`.

## When a skill says "publish to the issue tracker"

Create a GitHub issue.

## When a skill says "fetch the relevant ticket"

Run `gh issue view <number> --comments`.

## Wayfinder operations

Used by `/wayfinder`. The **map** is a single issue with **child** issues as tickets.

- **Map**: a single issue labelled `wayfinder:map`, holding the Notes / Decisions-so-far / Fog body. `gh issue create --label wayfinder:map`.
- **Child ticket**: an issue linked to the map as a GitHub sub-issue (`gh api` on the sub-issues endpoint). Where sub-issues aren't enabled, add the child to a task list in the map body and put `Part of #<map>` at the top of the child body. Labels: `wayfinder:<type>` (`research`/`prototype`/`grilling`/`task`). Once claimed, the ticket is assigned to the driving dev.
- **Blocking**: GitHub's **native issue dependencies** — the canonical, UI-visible representation. Add an edge with `gh api --method POST repos/<owner>/<repo>/issues/<child>/dependencies/blocked_by -F issue_id=<blocker-database-id>`, where `<blocker-database-id>` is the blocker's numeric **database id** (`gh api repos/<owner>/<repo>/issues/<n> --jq .id`, _not_ the `#number` or `node_id`). GitHub reports `issue_dependencies_summary.blocked_by` (open blockers only — the live gate). Where dependencies aren't available, fall back to a `Blocked by: #<n>, #<n>` line at the top of the child body. A ticket is unblocked when every blocker is closed.
- **Frontier query**: list the map's open children (`gh issue list --state open`, scoped to the map's sub-issues / task list), drop any with an open blocker (`issue_dependencies_summary.blocked_by > 0`, or an open issue in the `Blocked by` line) or an assignee; first in map order wins.
- **Claim**: `gh issue edit <n> --add-assignee @me` — the session's first write.
- **Resolve**: `gh issue comment <n> --body "<answer>"`, then `gh issue close <n>`, then append a context pointer (gist + link) to the map's Decisions-so-far.
