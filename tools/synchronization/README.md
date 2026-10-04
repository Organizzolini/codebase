# ↔️ Synchronization

**Keep the derived files derived.**

Some files in this workspace are not really written — they are copies of, or
tables generated from, something else. The generator table in `AGENTS.md` comes
from the conformetry configuration. The cloud devcontainer shares most of its
fields with the local one. The PR template appears verbatim inside a skill.

Every one of those is a place where two files can quietly disagree.
Synchronization is the NestJS CLI that regenerates them, and the CI check that
fails when someone edits the copy instead of the source.

## Usage

Every synchronization command is its own Nx target on this project, run
directly rather than through a shared aggregate — the same way
[`codebase:codometer`](../../packages/ic-suite/codometer/codometer-cli/README.md) and
[`codebase:callidescope`](../../packages/ic-suite/callidescope/callidescope-cli/README.md) are named
by their own callers instead of looping through one process:

```bash
nx run synchronization:conformetry-generators          # check (the default)
nx run synchronization:conformetry-generators:write     # regenerate
```

Every command runs in one of two modes:

| Mode    | Does                                                           |
| ------- | -------------------------------------------------------------- |
| `check` | Compares, writes nothing, exits non-zero on drift. The default |
| `write` | Regenerates the derived file from its source                   |

`start` runs every synchronization command in one process instead of one at a
time — the only target that does. No workflow or `lint-staged` pattern names
it; it exists purely for a human at a terminal who wants to check or write
everything in one command:

```bash
nx run synchronization:start          # check every synchronization
nx run synchronization:start:write    # write every synchronization
```

## Where each synchronization's drift is answered

Which runs check which synchronization is a property of the caller, not a
taxonomy the commands declare about themselves. Five of the six — every one
except `pull-request-labels` — are **derivations**: committed files derived
from configuration a pull request can also change, so `check` runs on a pull
request and `write` runs on the default branch's release. The
[🧑‍🔧 Lint Codebase](../../.github/workflows/lint-code.yml) workflow and
[`configuration/lint-staged.config.ts`](../../configuration/lint-staged.config.ts)
each name every derivation target directly alongside `lint-code` in one
`nx affected` invocation, rather than reaching them through
[`lint-code`](../../AGENTS.md#code-quality)'s `dependsOn` — Nx forwards an
explicit configuration down `dependsOn`, so an edge there would let
`lint-code --configuration=write` publish from a branch.

`pull-request-labels` needs credentials: its destination is GitHub's label set
rather than a file in the tree, so reaching it needs a token that neither a
fork nor a developer's `lint-code` run has. It must not run in
`lint-code`, and it must not wait for the default branch either — a change
introducing a new scope needs that scope's label to exist before 🧾 Validate
Pull Request Metadata runs on the very same pull request. So the one caller
holding a token, [comply-code.yml](../../.github/workflows/comply-code.yml),
runs its `write` mode directly through `node` rather than through this Nx
target, on `opened`/`reopened`, and nothing else names it.

## What it synchronizes

| Command                      | Source                                   | Destination                                                                                           |
| ---------------------------- | ---------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `conformetry-generators`     | `configuration/conformetry.config.ts`    | The generator table in `AGENTS.md`, between marker comments                                           |
| `conventional-config`        | `configuration/conventional.config.cjs`  | The commit type and scope tables, commitlint, and release configuration                               |
| `devcontainer-configuration` | `.devcontainer/local/devcontainer.json`  | The shared fields of `.devcontainer/cloud/devcontainer.json`                                          |
| `pull-request-labels`        | `configuration/conventional.config.cjs`  | This repository's `type:`, `scope:`, and `source:` labels on GitHub. Needs credentials                |
| `pull-request-template`      | `.github/PULL_REQUEST_TEMPLATE.md`       | The template embedded in the PR skill files                                                           |
| `skill-exclusions`           | `skills-lock.json`                       | The installed-skill exclusion lists in five ignore files                                              |

### Pull request labels

`pull-request-labels` is the odd one out: its destination is GitHub rather than
a file. It reads `configuration/conventional.config.cjs` and reconciles the
repository's labels against it — every `type:<name>`, every lowercased
`scope:<name>`, and the three `do-not-merge`, `source:agent`, and
`source:human` labels that no configuration derives. It creates what is missing
and edits whatever color or description drifted.

It never deletes. A label the configuration dropped may still be on open pull
requests, and removing it there loses information no run can put back, so a
stale `type:`, `scope:`, or `source:` label is reported with the
`gh label delete` command that would remove it, for a human to decide on. This
repository has one standing already, which is why "nothing needed creating or
updating" is said explicitly rather than inferred from an empty report — the
report is never fully empty even on a perfectly reconciled run.

It also always succeeds. A missing label is a fact about the repository under
review rather than a defect in the pull request, and a `gh` that is absent,
read-only on a fork, or rate-limited is an environment rather than an answer —
both are warnings, so this can never be why a pull request goes red. Reads and
writes both go through the `gh` client, which already resolves the repository
from the checkout and the token from the environment.

Run it on its own through its own Nx target:

```bash
nx run synchronization:pull-request-labels:write
```

## Why callers name targets directly

Every synchronization command used to be selected through a shared aggregate's
`--kinds` flag, so a caller asked for a set of kinds rather than for the
commands it actually wanted. That flag needed a taxonomy describing which
commands each caller wanted, and the taxonomy kept stretching every time a new
caller's requirements did not fit the existing values.

Each command is its own Nx target instead, run directly the way
[`codebase:codometer`](../../packages/ic-suite/codometer/codometer-cli/README.md) and
[`codebase:callidescope`](../../packages/ic-suite/callidescope/callidescope-cli/README.md) are named
by their own callers. Which commands a caller wants is a property of the
caller — the list of `--target` flags it passes — rather than something the
commands declare about themselves centrally. Each target declares its own
sources as `inputs`, so `nx affected` only reruns it when a file it actually
reads has changed, and each caller decides for itself which targets belong in
which invocation:

- [🧑‍🔧 Lint Codebase](../../.github/workflows/lint-code.yml) and
  [`configuration/lint-staged.config.ts`](../../configuration/lint-staged.config.ts)
  each name every derivation target directly alongside `lint-code` in one
  `nx affected` invocation, so a pull request and a commit both check drift.
- The release workflow runs every derivation's `write` configuration through
  `nx run-many`, so one command still publishes everything.
- [comply-code.yml](../../.github/workflows/comply-code.yml)
  runs `pull-request-labels write` directly through `node`, bypassing Nx
  entirely, since it is the one caller with a token and needs no project graph.

None of these callers reach for `start`. `SynchronizationCommand` still exists
and still loops over every command in one process — that part of the old
design was never the problem, and Nx's own `run-many` gives no way to run a
plain Node command with no target of its own — but nothing selects a subset
through it, so it needs no taxonomy: `start` always means all of them.

## Adding a synchronizer

1. Generate a module: `nx g conformetry:nestjs-command-module --name=<domain> --project=synchronization`
2. Implement `SynchronizableCommand` — a `synchronizationLabel` and a
   `synchronize(mode)` returning whether the destination was already current.
3. Add a top-level target for it in `project.json`, with `check`/`write`
   configurations and its own source paths as `inputs`, the same shape as the
   existing six. That target is the whole declaration of where the command
   runs: name it directly wherever it belongs — `lint-code`'s dependents
   for a derivation, the release workflow's `run-many` for a report, or a
   caller with its own credentials for anything needing them.
4. Register the command in `SynchronizationCommand.getCommands()`, and import
   its module in `SynchronizationModule`, so `start` still drives it alongside
   every other synchronization.

## Start

```bash
nx run synchronization:start
```

## Test

```bash
nx run synchronization:vitest
```

## Development

```bash
nx run synchronization:repl
nx run synchronization:typecheck-code,lint-code,format-code,deprecate-code,guard-code --configuration=write
```

## License

MIT — see [LICENSE](../../LICENSE).

## 👔 Conformetry

This project was generated from the [nestjs-command-project](../../configuration/conformetry-templates/nestjs-command-project) conformetry template.

<!-- callidescope:start -->

## 🔭 Callidescope

Call stacks traced through `tools/synchronization`, deepest first. Each frame shows what it takes, what it returns, and what its documentation says.

| Measure | Value |
| --- | --- |
| Callables | 233 |
| Files | 60 |
| Calls traced | 257 |
| Call stacks | 12 |
| Deepest stack | 10 |
| Stacks through recursion | 0 |
| Unfollowable calls | 11 |

### Limits

What this project is judged against, as declared in its own `callidescope.config.ts`.

| Limit | Value |
| --- | --- |
| `maximumDepth` | 10 |
| `maximumBreadth` | 11 |

### Call stacks (depth)

**1. `SynchronizationCommand.run`** — depth ≥ 10 · decorated-method

```text
🚀 SynchronizationCommand.run(passedParameters: string[]): Promise<void> [tools/synchronization/src/modules/synchronization/synchronization.command.ts:123]
   ↳ Runs every synchronization, exiting once if any reported drift.
  └─> SynchronizationCommand.synchronize(mode: SynchronizationMode): Promise<boolean> [tools/synchronization/src/modules/synchronization/synchronization.command.ts:145]
     ↳ Runs every synchronization and reports whether all succeeded.
    └─> ConventionalConfigCommand.synchronize(mode: SynchronizationMode): Promise<boolean> [tools/synchronization/src/modules/conventional-config/conventional-config.command.ts:70]
       ↳ Synchronizes conventional-commit config and reports success without exiting.
      └─> ConventionalConfigService.runSynchronization(mode: string): boolean [tools/synchronization/src/modules/conventional-config/conventional-config.service.ts:240]
         ↳ Runs the workflow in check or write mode, reporting whether it succeeded.
        └─> ConventionalConfigService.handleCheckMode(context: SyncContext): boolean [tools/synchronization/src/modules/conventional-config/conventional-config.service.ts:126]
           ↳ Check mode: validates all configuration files are in sync with conventional.config.cjs, reporting success rather than…
          └─> ConventionalConfigValidatorsService.checkAllSkillsSync(config: ConventionalConfig, skillFiles: string[]): boolean [tools/synchronization/src/modules/conventional-config/conventional-config-validators.service.ts:155]
             ↳ Validates that every configured skill file has synchronized type/scope tables.
            └─> ConventionalConfigValidatorsService.checkSkillSync(config: ConventionalConfig, skillFile: string): boolean [tools/synchronization/src/modules/conventional-config/conventional-config-validators.service.ts:293]
               ↳ Validates a skill file's type/scope markdown tables against source config.
              └─> ConventionalConfigValidatorsService.checkMarkerSync(…): boolean [tools/synchronization/src/modules/conventional-config/conventional-config-validators.service.ts:41]
                 ↳ Checks that a named marker block in a skill file matches the source config values.
                └─> ConventionalConfigValidatorsService.readMarkerValues(…): { skillValues: string[]; } | undefined [tools/synchronization/src/modules/conventional-config/conventional-config-validators.service.ts:76]
                   ↳ Extracts and returns parsed table values from a named marker block, or undefined if missing.
                  └─> ConventionalConfigIoService.extractMarkerContent(content: string, markerName: string): string | undefined [tools/synchronization/src/modules/conventional-config/conventional-config-io.service.ts:127]
                     ↳ Extracts text content between named HTML comment markers.
```

**2. `ConventionalConfigCommand.run`** — depth 9 · decorated-method

```text
🚀 ConventionalConfigCommand.run(passedParameters: string[], _options?: Record<string, unknown>): Promise<void> [tools/synchronization/src/modules/conventional-config/conventional-config.command.ts:51]
   ↳ Runs the conventional-config sync command, delegating to helpers and exiting 1 on drift.
  └─> ConventionalConfigCommand.synchronize(mode: SynchronizationMode): Promise<boolean> [tools/synchronization/src/modules/conventional-config/conventional-config.command.ts:70]
     ↳ Synchronizes conventional-commit config and reports success without exiting.
    └─> ConventionalConfigService.runSynchronization(mode: string): boolean [tools/synchronization/src/modules/conventional-config/conventional-config.service.ts:240]
       ↳ Runs the workflow in check or write mode, reporting whether it succeeded.
      └─> ConventionalConfigService.handleCheckMode(context: SyncContext): boolean [tools/synchronization/src/modules/conventional-config/conventional-config.service.ts:126]
         ↳ Check mode: validates all configuration files are in sync with conventional.config.cjs, reporting success rather than…
        └─> ConventionalConfigValidatorsService.checkAllSkillsSync(config: ConventionalConfig, skillFiles: string[]): boolean [tools/synchronization/src/modules/conventional-config/conventional-config-validators.service.ts:155]
           ↳ Validates that every configured skill file has synchronized type/scope tables.
          └─> ConventionalConfigValidatorsService.checkSkillSync(config: ConventionalConfig, skillFile: string): boolean [tools/synchronization/src/modules/conventional-config/conventional-config-validators.service.ts:293]
             ↳ Validates a skill file's type/scope markdown tables against source config.
            └─> ConventionalConfigValidatorsService.checkMarkerSync(…): boolean [tools/synchronization/src/modules/conventional-config/conventional-config-validators.service.ts:41]
               ↳ Checks that a named marker block in a skill file matches the source config values.
              └─> ConventionalConfigValidatorsService.readMarkerValues(…): { skillValues: string[]; } | undefined [tools/synchronization/src/modules/conventional-config/conventional-config-validators.service.ts:76]
                 ↳ Extracts and returns parsed table values from a named marker block, or undefined if missing.
                └─> ConventionalConfigIoService.extractMarkerContent(content: string, markerName: string): string | undefined [tools/synchronization/src/modules/conventional-config/conventional-config-io.service.ts:127]
                   ↳ Extracts text content between named HTML comment markers.
```

**3. `IssueLabelsCommand.run`** — depth 7 · decorated-method

```text
🚀 IssueLabelsCommand.run(): Promise<void> [tools/synchronization/src/modules/issue-labels/issue-labels.command.ts:158]
   ↳ Adds whichever type and scope labels the issue's body implies.
  └─> IssueLabelsCommand.resolvePlan(): undefined | { issueNumber: string; missingLabels: string[]; } [tools/synchronization/src/modules/issue-labels/issue-labels.command.ts:130]
     ↳ What this run needs to do, or `undefined` when there is nothing to add.
    └─> IssueLabelsCommand.readExistingLabelNames(): string[] [tools/synchronization/src/modules/issue-labels/issue-labels.command.ts:94]
       ↳ Reads the labels already on the issue, from `ISSUE_LABELS`.
      └─> IssueLabelsCommand.readLabelNames(entries: unknown[]): string[] [tools/synchronization/src/modules/issue-labels/issue-labels.command.ts:118]
         ↳ Every label name in this array, with the nameless entries dropped.
        └─> IssueLabelsCommand.map(…)(entry: unknown): string [tools/synchronization/src/modules/issue-labels/issue-labels.command.ts:120]
          └─> IssueLabelsCommand.nameOf(entry: unknown): string [tools/synchronization/src/modules/issue-labels/issue-labels.command.ts:82]
             ↳ Reads one label entry's name, whichever shape it arrived in.
            └─> IssueLabelsCommand.isRecord(value: unknown): value is Record<string, unknown> [tools/synchronization/src/modules/issue-labels/issue-labels.command.ts:77]
               ↳ Whether this value can be read by property name at all.
```

<details>
<summary>9 more call stacks</summary>

**4. `PullRequestLabelsCommand.run`** — depth 7 · decorated-method

```text
🚀 PullRequestLabelsCommand.run(passedParameters: string[]): Promise<void> [tools/synchronization/src/modules/pull-request-labels/pull-request-labels.command.ts:281]
   ↳ Runs the pull-request-labels reconciliation in check or write mode.
  └─> PullRequestLabelsCommand.synchronize(mode: SynchronizationMode): Promise<boolean> [tools/synchronization/src/modules/pull-request-labels/pull-request-labels.command.ts:300]
     ↳ Reconciles the label vocabulary and always reports success.
    └─> PullRequestLabelsCommand.reconcile(mode: SynchronizationMode, reportLines: string[]): void [tools/synchronization/src/modules/pull-request-labels/pull-request-labels.command.ts:175]
       ↳ Reconciles the vocabulary, appending everything it did to the report.
      └─> PullRequestLabelsService.planReconciliation(…): LabelReconciliationPlan [tools/synchronization/src/modules/pull-request-labels/pull-request-labels.service.ts:66]
         ↳ Works out what reconciling would create, update, and leave behind.
        └─> PullRequestLabelsService.filter(…)(label: ConventionalLabel): boolean [tools/synchronization/src/modules/pull-request-labels/pull-request-labels.service.ts:82]
          └─> PullRequestLabelsService.isTrackedLabel(labelName: string): boolean [tools/synchronization/src/modules/pull-request-labels/pull-request-labels.service.ts:45]
             ↳ Whether this reconciliation owns the label with this name.
            └─> PullRequestLabelsService.some(…)(prefix: string): boolean [tools/synchronization/src/modules/pull-request-labels/pull-request-labels.service.ts:46]
```

**5. `ConformetryGeneratorsCommand.run`** — depth ≥ 6 · decorated-method

```text
🚀 ConformetryGeneratorsCommand.run(passedParameters: string[], _options?: Record<string, unknown>): Promise<void> [tools/synchronization/src/modules/conformetry-generators/conformetry-generators.command.ts:188]
   ↳ Runs the conformetry-generators sync command in check or write mode.
  └─> ConformetryGeneratorsCommand.synchronize(mode: SynchronizationMode): Promise<boolean> [tools/synchronization/src/modules/conformetry-generators/conformetry-generators.command.ts:206]
     ↳ Synchronizes the generators table and reports success without exiting.
    └─> ConformetryGeneratorsCommand.readGenerators(): Promise<ConformetryGeneratorMetadata[]> [tools/synchronization/src/modules/conformetry-generators/conformetry-generators.command.ts:111]
       ↳ Reads configuration/conformetry.config.ts and returns the list of generator metadata.
      └─> ConfigurationService.loadConformetryConfiguration(configurationPath: string): Promise<ConformetryConfiguration> [packages/ic-suite/conformetry/conformetry-configuration/src/modules/configuration/configuration.service.ts:243]
         ↳ Loads, validates, and normalizes a conformetry configuration file.
        └─> ConfigurationService.resolveConfigurationPath(configurationPath: string): Promise<string> [packages/ic-suite/conformetry/conformetry-configuration/src/modules/configuration/configuration.service.ts:174]
           ↳ Resolves a config path against the cwd, falling back to the workspace root.
          └─> ConfigurationService.findWorkspaceRoot(): Promise<string | undefined> [packages/ic-suite/conformetry/conformetry-configuration/src/modules/configuration/configuration.service.ts:113]
             ↳ Walks upward from the process cwd looking for the workspace manifest.
```

**6. `PackageManifestsCommand.run`** — depth 6 · decorated-method

```text
🚀 PackageManifestsCommand.run(passedParameters: string[]): Promise<void> [tools/synchronization/src/modules/package-manifests/package-manifests.command.ts:50]
   ↳ Runs the package-manifests sync command and exits 1 on drift in check mode.
  └─> PackageManifestsCommand.synchronize(mode: SynchronizationMode): Promise<boolean> [tools/synchronization/src/modules/package-manifests/package-manifests.command.ts:66]
     ↳ Synchronizes package manifest metadata and reports success without exiting.
    └─> PackageManifestsService.writeAll(workspaceRoot: string): void [tools/synchronization/src/modules/package-manifests/package-manifests.service.ts:205]
       ↳ Writes the derived metadata across all publishable packages.
      └─> PackageManifestsService.writePackageManifest(…): void [tools/synchronization/src/modules/package-manifests/package-manifests.service.ts:218]
         ↳ Writes the derived metadata into an individual package's package.json.
        └─> PackageManifestsService.sortKeys(object: Record<string, unknown>): Record<string, unknown> [tools/synchronization/src/modules/package-manifests/package-manifests.service.ts:83]
           ↳ Sorts an object's keys alphabetically, ignoring case.
          └─> PackageManifestsService.toSorted(…)(leftKey: string, rightKey: string): number [tools/synchronization/src/modules/package-manifests/package-manifests.service.ts:85]
```

**7. `PullRequestTemplateCommand.run`** — depth 6 · decorated-method

```text
🚀 PullRequestTemplateCommand.run(passedParameters: string[], _options?: Record<string, unknown>): Promise<void> [tools/synchronization/src/modules/pull-request-template/pull-request-template.command.ts:202]
   ↳ Runs the pull-request-template sync command in check or write mode.
  └─> PullRequestTemplateCommand.synchronize(mode: SynchronizationMode): Promise<boolean> [tools/synchronization/src/modules/pull-request-template/pull-request-template.command.ts:221]
     ↳ Synchronizes the PR template and reports success without exiting.
    └─> PullRequestTemplateCommand.handleWriteMode(templateContent: string, targetFiles: string[]): void [tools/synchronization/src/modules/pull-request-template/pull-request-template.command.ts:129]
       ↳ Writes the current PR template into any target files that are out of sync.
      └─> PullRequestTemplateCommand.filter(…)(targetFile: string): boolean [tools/synchronization/src/modules/pull-request-template/pull-request-template.command.ts:134]
        └─> PullRequestTemplateCommand.checkTargetSync(templateContent: string, targetFile: string): boolean [tools/synchronization/src/modules/pull-request-template/pull-request-template.command.ts:55]
           ↳ Checks whether the target file's marker block matches the current PR template.
          └─> PullRequestTemplateCommand.extractMarkerContent(content: string, markerName: string): string | undefined [tools/synchronization/src/modules/pull-request-template/pull-request-template.command.ts:90]
             ↳ Extracts the content between start and end marker comments from a file.
```

**8. `SkillExclusionsCommand.run`** — depth ≥ 6 · decorated-method

```text
🚀 SkillExclusionsCommand.run(passedParameters: string[]): Promise<void> [tools/synchronization/src/modules/skill-exclusions/skill-exclusions.command.ts:165]
   ↳ Runs the skill-exclusions sync command in check or write mode.
  └─> SkillExclusionsCommand.synchronize(mode: SynchronizationMode): Promise<boolean> [tools/synchronization/src/modules/skill-exclusions/skill-exclusions.command.ts:180]
     ↳ Synchronizes the exclusion lists and reports success without exiting.
    └─> SkillExclusionsCommand.findStaleFiles(skillNames: string[]): string[] [tools/synchronization/src/modules/skill-exclusions/skill-exclusions.command.ts:71]
       ↳ Every file whose generated block differs from what the lockfile implies.
      └─> SkillExclusionsCommand.filter(…)(file: SkillExclusionFile): boolean [tools/synchronization/src/modules/skill-exclusions/skill-exclusions.command.ts:72]
        └─> SkillExclusionsCommand.readExclusionFile(…): { afterMarker: string; beforeMarker: string; generatedContent: string; } [tools/synchronization/src/modules/skill-exclusions/skill-exclusions.command.ts:82]
           ↳ Splits one exclusion file around its generated block.
          └─> SkillExclusionsCommand.renderStartMarker(file: SkillExclusionFile): string [tools/synchronization/src/modules/skill-exclusions/skill-exclusions.command.ts:139]
             ↳ The comment opening this file's generated block, in its own syntax.
```

**9. `DevcontainerConfigurationCommand.run`** — depth 5 · decorated-method

```text
🚀 DevcontainerConfigurationCommand.run(passedParameters: string[], _options?: Record<string, unknown>): Promise<void> [tools/synchronization/src/modules/devcontainer-configuration/devcontainer-configuration.command.ts:266]
   ↳ Runs the devcontainer-configuration sync command in check or write mode.
  └─> DevcontainerConfigurationCommand.synchronize(mode: SynchronizationMode): Promise<boolean> [tools/synchronization/src/modules/devcontainer-configuration/devcontainer-configuration.command.ts:285]
     ↳ Synchronizes the cloud devcontainer config and reports success without exiting.
    └─> DevcontainerConfigurationCommand.applySync(…): DevcontainerConfiguration [tools/synchronization/src/modules/devcontainer-configuration/devcontainer-configuration.command.ts:59]
       ↳ Merges local devcontainer fields into a copy of the cloud config, preserving cloud-only keys.
      └─> DevcontainerConfigurationCommand.syncFeatures(…): void [tools/synchronization/src/modules/devcontainer-configuration/devcontainer-configuration.command.ts:180]
         ↳ Merges features from local and cloud configs, keeping Docker features from cloud.
        └─> DevcontainerConfigurationCommand.isDockerFeatureKey(key: string): boolean [tools/synchronization/src/modules/devcontainer-configuration/devcontainer-configuration.command.ts:127]
           ↳ Returns true if the feature key refers to a Docker-in-Docker or Docker-outside-of-Docker feature.
```

**10. `ReadmeVersionCommand.run`** — depth 5 · decorated-method

```text
🚀 ReadmeVersionCommand.run(passedParameters: string[], _options?: Record<string, unknown>): Promise<void> [tools/synchronization/src/modules/readme-version/readme-version.command.ts:89]
   ↳ Runs the readme-version sync command and exits 1 on drift in check mode.
  └─> ReadmeVersionCommand.synchronize(mode: SynchronizationMode): Promise<boolean> [tools/synchronization/src/modules/readme-version/readme-version.command.ts:108]
     ↳ Synchronizes the root README version and reports success without exiting.
    └─> ReadmeVersionCommand.writeSync(workspaceRoot: string, version: string, isSync: boolean): boolean [tools/synchronization/src/modules/readme-version/readme-version.command.ts:67]
       ↳ Handles writing output and updating README in write mode.
      └─> ReadmeVersionService.writeReadmeVersion(workspaceRoot: string): void [tools/synchronization/src/modules/readme-version/readme-version.service.ts:58]
         ↳ Synchronizes the root README.md title with the package.json version.
        └─> ReadmeVersionService.readPackageVersion(workspaceRoot: string): string [tools/synchronization/src/modules/readme-version/readme-version.service.ts:43]
           ↳ Reads and parses the version string from root package.json.
```

**11. `SynchronizationMarkersService.extractContent`** — depth 3 · orphan-root

```text
🚀 SynchronizationMarkersService.extractContent(content: string, markerName: string): string | undefined [tools/synchronization/src/modules/synchronization/synchronization-markers.service.ts:44]
   ↳ Returns the content between the markers, or undefined when absent.
  └─> SynchronizationMarkersService.locateMarkers(…): { endIndex: number; startIndex: number; } | undefined [tools/synchronization/src/modules/synchronization/synchronization-markers.service.ts:24]
     ↳ Returns the index range the markers enclose, or undefined when absent.
    └─> SynchronizationMarkersService.getStartMarker(markerName: string): string [tools/synchronization/src/modules/synchronization/synchronization-markers.service.ts:57]
       ↳ Renders the opening marker comment for a marker name.
```

**12. `SynchronizationMarkersService.replaceContent`** — depth 3 · orphan-root

```text
🚀 SynchronizationMarkersService.replaceContent(content: string, markerName: string, replacement: string): string [tools/synchronization/src/modules/synchronization/synchronization-markers.service.ts:65]
   ↳ Replaces the content between the markers, surrounding it with the blank lines markdown needs for the block to be parsed…
  └─> SynchronizationMarkersService.locateMarkers(…): { endIndex: number; startIndex: number; } | undefined [tools/synchronization/src/modules/synchronization/synchronization-markers.service.ts:24]
     ↳ Returns the index range the markers enclose, or undefined when absent.
    └─> SynchronizationMarkersService.getStartMarker(markerName: string): string [tools/synchronization/src/modules/synchronization/synchronization-markers.service.ts:57]
       ↳ Renders the opening marker comment for a marker name.
```

</details>

### Breadth

| Callable | Breadth | Calls directly | Location |
| --- | --- | --- | --- |
| `SynchronizationCommand.synchronize` | 11 | `SynchronizationCommand.getCommands`, `ConformetryGeneratorsCommand.synchronize`, `ConventionalConfigCommand.synchronize`, `DevcontainerConfigurationCommand.synchronize`, `PackageManifestsCommand.synchronize`, `PullRequestLabelsCommand.synchronize`, `PullRequestTemplateCommand.synchronize`, `ReadmeVersionCommand.synchronize`, `SkillExclusionsCommand.synchronize`, `SynchronizationCommand.reportResults`, `SynchronizationCommand.every(…)` | `tools/synchronization/src/modules/synchronization/synchronization.command.ts:145` |
| `PullRequestLabelsCommand.reconcile` | 9 | `PullRequestLabelsGithubService.run`, `PullRequestLabelsCommand.appendToReport`, `PullRequestLabelsGithubService.describeFailure`, `PullRequestLabelsService.planReconciliation`, `PullRequestLabelsService.parseRepositoryLabels`, `PullRequestLabelsService.readExpectedLabels`, `PullRequestLabelsCommand.describeError`, `PullRequestLabelsCommand.reportPlan`, `PullRequestLabelsCommand.reportStaleLabels` | `tools/synchronization/src/modules/pull-request-labels/pull-request-labels.command.ts:175` |
| `ConventionalConfigService.handleCheckMode` | 8 | `ConventionalConfigValidatorsService.checkSettingsSync`, `ConventionalConfigValidatorsService.checkAllSkillsSync`, `ConventionalConfigValidatorsService.checkAllTemplatesSync`, `ConventionalConfigService.loadReleaseConfig`, `ConventionalConfigValidatorsService.checkReleaseRulesSync`, `ConventionalConfigIoService.getReleaseRulesTypes`, `ConventionalConfigValidatorsService.checkPresetConfigSync`, `ConventionalConfigIoService.getPresetConfigTypes` | `tools/synchronization/src/modules/conventional-config/conventional-config.service.ts:126` |

<details>
<summary>101 more callables</summary>

| Callable | Breadth | Calls directly | Location |
| --- | --- | --- | --- |
| `ConventionalConfigService.handleWriteMode` | 7 | `ConventionalConfigValidatorsService.checkSettingsSync`, `ConventionalConfigService.filter(…)`, `ConventionalConfigService.filter(…)`, `ConventionalConfigIoService.writeSettingsSync`, `ConventionalConfigIoService.writeSkillSync`, `ConventionalConfigIoService.writeIssueTemplateSync`, `ConventionalConfigService.syncReleaseConfigIfNeeded` | `tools/synchronization/src/modules/conventional-config/conventional-config.service.ts:182` |
| `ConventionalConfigIoService.writeReleaseConfigSync` | 6 | `ConventionalConfigIoService.map(…)`, `ConventionalConfigIoService.filter(…)`, `ConventionalConfigIoService.getReleaseRulesTypes`, `ConventionalConfigIoService.getPresetConfigTypes`, `ConventionalConfigIoService.appendToReleaseRules`, `ConventionalConfigIoService.appendToPresetTypes` | `tools/synchronization/src/modules/conventional-config/conventional-config-io.service.ts:290` |
| `ConventionalConfigService.runSynchronization` | 6 | `ConventionalConfigService.loadConventionalConfig`, `ConventionalConfigService.map(…)`, `ConventionalConfigIoService.parseSettingsScopes`, `ConventionalConfigService.map(…)`, `ConventionalConfigService.handleCheckMode`, `ConventionalConfigService.handleWriteMode` | `tools/synchronization/src/modules/conventional-config/conventional-config.service.ts:240` |
| `PackageManifestsService.checkPackageManifest` | 6 | `PackageManifestsService.readPackageManifest`, `PackageManifestsService.deriveMetadata`, `PackageManifestsService.compareStringField`, `PackageManifestsService.compareBugsField`, `PackageManifestsService.compareRepositoryField`, `PackageManifestsService.filter(…)` | `tools/synchronization/src/modules/package-manifests/package-manifests.service.ts:125` |
| `PullRequestLabelsService.planReconciliation` | 6 | `PullRequestLabelsService.map(…)`, `PullRequestLabelsService.map(…)`, `PullRequestLabelsService.filter(…)`, `PullRequestLabelsService.map(…)`, `PullRequestLabelsService.filter(…)`, `PullRequestLabelsService.filter(…)` | `tools/synchronization/src/modules/pull-request-labels/pull-request-labels.service.ts:66` |
| `ConventionalConfigService.syncReleaseConfigIfNeeded` | 5 | `ConventionalConfigService.loadReleaseConfig`, `ConventionalConfigService.filter(…)`, `ConventionalConfigIoService.getReleaseRulesTypes`, `ConventionalConfigIoService.getPresetConfigTypes`, `ConventionalConfigIoService.writeReleaseConfigSync` | `tools/synchronization/src/modules/conventional-config/conventional-config.service.ts:93` |
| `SynchronizationCommand.reportResults` | 5 | `SynchronizationCommand.filter(…)`, `SynchronizationCommand.map(…)`, `SynchronizationCommand.filter(…)`, `SynchronizationCommand.map(…)`, `SynchronizationCommand.filter(…)` | `tools/synchronization/src/modules/synchronization/synchronization.command.ts:92` |
| `IssueLabelsCommand.resolvePlan` | 4 | `IssueLabelsCommand.readIssueNumber`, `IssueLabelsService.parseFormAnswers`, `IssueLabelsCommand.readExistingLabelNames`, `IssueLabelsService.missingLabels` | `tools/synchronization/src/modules/issue-labels/issue-labels.command.ts:130` |
| `ConventionalConfigIoService.writeSkillSync` | 4 | `ConventionalConfigIoService.map(…)`, `ConventionalConfigIoService.map(…)`, `ConventionalConfigIoService.generateMarkdownTable`, `ConventionalConfigIoService.replaceMarkerContent` | `tools/synchronization/src/modules/conventional-config/conventional-config-io.service.ts:353` |
| `PackageManifestsService.checkAll` | 4 | `PackageManifestsService.readRootManifest`, `PackageManifestsService.map(…)`, `PackageManifestsService.filter(…)`, `PackageManifestsService.filter(…)` | `tools/synchronization/src/modules/package-manifests/package-manifests.service.ts:100` |
| `PullRequestLabelsCommand.reportPlan` | 4 | `PullRequestLabelsCommand.appendToReport`, `PullRequestLabelsCommand.describePlan`, `PullRequestLabelsCommand.createLabels`, `PullRequestLabelsCommand.updateLabels` | `tools/synchronization/src/modules/pull-request-labels/pull-request-labels.command.ts:215` |
| `PullRequestLabelsCommand.synchronize` | 4 | `PullRequestLabelsCommand.reconcile`, `PullRequestLabelsCommand.appendToReport`, `PullRequestLabelsCommand.describeError`, `PullRequestLabelsCommand.mirrorToStepSummary` | `tools/synchronization/src/modules/pull-request-labels/pull-request-labels.command.ts:300` |
| `PullRequestTemplateCommand.synchronize` | 4 | `PullRequestTemplateCommand.map(…)`, `PullRequestTemplateCommand.loadTemplate`, `PullRequestTemplateCommand.handleCheckMode`, `PullRequestTemplateCommand.handleWriteMode` | `tools/synchronization/src/modules/pull-request-template/pull-request-template.command.ts:221` |
| `ReadmeVersionCommand.synchronize` | 4 | `ReadmeVersionService.readPackageVersion`, `ReadmeVersionService.isSynchronized`, `ReadmeVersionCommand.checkSync`, `ReadmeVersionCommand.writeSync` | `tools/synchronization/src/modules/readme-version/readme-version.command.ts:108` |
| `IssueLabelsCommand.run` | 3 | `IssueLabelsCommand.resolvePlan`, `IssueLabelsGithubService.isAvailable`, `IssueLabelsCommand.addLabel` | `tools/synchronization/src/modules/issue-labels/issue-labels.command.ts:158` |
| `ConformetryGeneratorsCommand.synchronize` | 3 | `ConformetryGeneratorsCommand.readGenerators`, `ConformetryGeneratorsCommand.checkSync`, `ConformetryGeneratorsCommand.writeSync` | `tools/synchronization/src/modules/conformetry-generators/conformetry-generators.command.ts:206` |
| `ConventionalConfigIoService.writeIssueTemplateSync` | 3 | `ConventionalConfigIoService.writeIssueTemplateDropdown`, `ConventionalConfigIoService.map(…)`, `ConventionalConfigIoService.map(…)` | `tools/synchronization/src/modules/conventional-config/conventional-config-io.service.ts:258` |
| `ConventionalConfigValidatorsService.checkMarkerSync` | 3 | `ConventionalConfigValidatorsService.readMarkerValues`, `ConventionalConfigValidatorsService.getSourceValuesForMarker`, `ConventionalConfigValidatorsService.validateMarkerValues` | `tools/synchronization/src/modules/conventional-config/conventional-config-validators.service.ts:41` |
| `ConventionalConfigValidatorsService.checkIssueTemplateSync` | 3 | `ConventionalConfigValidatorsService.getSourceValuesForMarker`, `ConventionalConfigIoService.parseIssueTemplateDropdown`, `ConventionalConfigValidatorsService.validateMarkerValues` | `tools/synchronization/src/modules/conventional-config/conventional-config-validators.service.ts:185` |
| `DevcontainerConfigurationCommand.applySync` | 3 | `DevcontainerConfigurationCommand.syncVerbatimFields`, `DevcontainerConfigurationCommand.preserveRemoteEnvironment`, `DevcontainerConfigurationCommand.syncFeatures` | `tools/synchronization/src/modules/devcontainer-configuration/devcontainer-configuration.command.ts:59` |
| `DevcontainerConfigurationCommand.synchronize` | 3 | `DevcontainerConfigurationCommand.applySync`, `DevcontainerConfigurationCommand.check`, `DevcontainerConfigurationCommand.writeWhenDrifted` | `tools/synchronization/src/modules/devcontainer-configuration/devcontainer-configuration.command.ts:285` |
| `PackageManifestsService.writePackageManifest` | 3 | `PackageManifestsService.readPackageManifest`, `PackageManifestsService.deriveMetadata`, `PackageManifestsService.sortKeys` | `tools/synchronization/src/modules/package-manifests/package-manifests.service.ts:218` |
| `PackageManifestsCommand.synchronize` | 3 | `PackageManifestsService.writeAll`, `PackageManifestsService.checkAll`, `PackageManifestsCommand.map(…)` | `tools/synchronization/src/modules/package-manifests/package-manifests.command.ts:66` |
| `PullRequestLabelsCommand.createLabels` | 3 | `PullRequestLabelsGithubService.run`, `PullRequestLabelsCommand.appendToReport`, `PullRequestLabelsGithubService.describeFailure` | `tools/synchronization/src/modules/pull-request-labels/pull-request-labels.command.ts:85` |
| `PullRequestLabelsCommand.updateLabels` | 3 | `PullRequestLabelsGithubService.run`, `PullRequestLabelsCommand.appendToReport`, `PullRequestLabelsGithubService.describeFailure` | `tools/synchronization/src/modules/pull-request-labels/pull-request-labels.command.ts:251` |
| `ReadmeVersionService.isSynchronized` | 3 | `ReadmeVersionService.readPackageVersion`, `ReadmeVersionService.readReadme`, `ReadmeVersionService.formatTitle` | `tools/synchronization/src/modules/readme-version/readme-version.service.ts:34` |
| `ReadmeVersionService.writeReadmeVersion` | 3 | `ReadmeVersionService.readPackageVersion`, `ReadmeVersionService.readReadme`, `ReadmeVersionService.formatTitle` | `tools/synchronization/src/modules/readme-version/readme-version.service.ts:58` |
| `SkillExclusionsCommand.writeSync` | 3 | `SkillExclusionsCommand.readExclusionFile`, `SkillExclusionsCommand.renderBlock`, `SkillExclusionsCommand.map(…)` | `tools/synchronization/src/modules/skill-exclusions/skill-exclusions.command.ts:144` |
| `SkillExclusionsCommand.synchronize` | 3 | `SkillExclusionsCommand.readSkillNames`, `SkillExclusionsCommand.writeSync`, `SkillExclusionsCommand.findStaleFiles` | `tools/synchronization/src/modules/skill-exclusions/skill-exclusions.command.ts:180` |
| `IssueLabelsService.missingLabels` | 2 | `IssueLabelsService.filter(…)`, `IssueLabelsService.labelsFromAnswers` | `tools/synchronization/src/modules/issue-labels/issue-labels.service.ts:77` |
| `IssueLabelsCommand.addLabel` | 2 | `IssueLabelsGithubService.run`, `IssueLabelsGithubService.describeFailure` | `tools/synchronization/src/modules/issue-labels/issue-labels.command.ts:57` |
| `IssueLabelsCommand.readLabelNames` | 2 | `IssueLabelsCommand.filter(…)`, `IssueLabelsCommand.map(…)` | `tools/synchronization/src/modules/issue-labels/issue-labels.command.ts:118` |
| `SynchronizationService.resolveSynchronizationModeOrExit` | 2 | `SynchronizationService.resolveModeValue`, `SynchronizationService.exitInvalidMode` | `tools/synchronization/src/modules/synchronization/synchronization.service.ts:59` |
| `ConformetryGeneratorsCommand.checkSync` | 2 | `ConformetryGeneratorsCommand.generateGeneratorsTable`, `ConformetryGeneratorsCommand.filter(…)` | `tools/synchronization/src/modules/conformetry-generators/conformetry-generators.command.ts:64` |
| `ConformetryGeneratorsCommand.readGenerators` | 2 | `ConfigurationService.loadConformetryConfiguration`, `ConformetryGeneratorsCommand.map(…)` | `tools/synchronization/src/modules/conformetry-generators/conformetry-generators.command.ts:111` |
| `ConformetryGeneratorsCommand.writeSync` | 2 | `ConformetryGeneratorsCommand.generateGeneratorsTable`, `ConformetryGeneratorsCommand.readMarkedFile` | `tools/synchronization/src/modules/conformetry-generators/conformetry-generators.command.ts:166` |
| `ConformetryGeneratorsCommand.run` | 2 | `SynchronizationService.resolveSynchronizationModeOrExit`, `ConformetryGeneratorsCommand.synchronize` | `tools/synchronization/src/modules/conformetry-generators/conformetry-generators.command.ts:188` |
| `ConventionalConfigIoService.map(…)` | 2 | `ConventionalConfigIoService.find(…)`, `ConventionalConfigIoService.capitalize` | `tools/synchronization/src/modules/conventional-config/conventional-config-io.service.ts:93` |
| `ConventionalConfigIoService.getReleaseRulesTypes` | 2 | `ConventionalConfigIoService.filter(…)`, `ConventionalConfigIoService.map(…)` | `tools/synchronization/src/modules/conventional-config/conventional-config-io.service.ts:184` |
| `ConventionalConfigValidatorsService.getSourceValuesForMarker` | 2 | `ConventionalConfigValidatorsService.map(…)`, `ConventionalConfigValidatorsService.map(…)` | `tools/synchronization/src/modules/conventional-config/conventional-config-validators.service.ts:64` |
| `ConventionalConfigValidatorsService.readMarkerValues` | 2 | `ConventionalConfigIoService.extractMarkerContent`, `ConventionalConfigIoService.parseMarkdownTableValues` | `tools/synchronization/src/modules/conventional-config/conventional-config-validators.service.ts:76` |
| `ConventionalConfigCommand.run` | 2 | `SynchronizationService.resolveSynchronizationModeOrExit`, `ConventionalConfigCommand.synchronize` | `tools/synchronization/src/modules/conventional-config/conventional-config.command.ts:51` |
| `DevcontainerConfigurationCommand.check` | 2 | `DevcontainerConfigurationCommand.isCurrent`, `DevcontainerConfigurationCommand.reportDifferences` | `tools/synchronization/src/modules/devcontainer-configuration/devcontainer-configuration.command.ts:80` |
| `DevcontainerConfigurationCommand.writeWhenDrifted` | 2 | `DevcontainerConfigurationCommand.isCurrent`, `DevcontainerConfigurationCommand.write` | `tools/synchronization/src/modules/devcontainer-configuration/devcontainer-configuration.command.ts:242` |
| `DevcontainerConfigurationCommand.run` | 2 | `SynchronizationService.resolveSynchronizationModeOrExit`, `DevcontainerConfigurationCommand.synchronize` | `tools/synchronization/src/modules/devcontainer-configuration/devcontainer-configuration.command.ts:266` |
| `PackageManifestsService.writeAll` | 2 | `PackageManifestsService.readRootManifest`, `PackageManifestsService.writePackageManifest` | `tools/synchronization/src/modules/package-manifests/package-manifests.service.ts:205` |
| `PackageManifestsCommand.run` | 2 | `SynchronizationService.resolveSynchronizationModeOrExit`, `PackageManifestsCommand.synchronize` | `tools/synchronization/src/modules/package-manifests/package-manifests.command.ts:50` |
| `PullRequestLabelsService.readExpectedLabels` | 2 | `PullRequestLabelsService.map(…)`, `PullRequestLabelsService.map(…)` | `tools/synchronization/src/modules/pull-request-labels/pull-request-labels.service.ts:106` |
| `PullRequestLabelsCommand.run` | 2 | `SynchronizationService.resolveSynchronizationModeOrExit`, `PullRequestLabelsCommand.synchronize` | `tools/synchronization/src/modules/pull-request-labels/pull-request-labels.command.ts:281` |
| `PullRequestTemplateCommand.checkTargetSync` | 2 | `PullRequestTemplateCommand.extractMarkerContent`, `PullRequestTemplateCommand.wrapInCodeBlock` | `tools/synchronization/src/modules/pull-request-template/pull-request-template.command.ts:55` |
| `PullRequestTemplateCommand.handleWriteMode` | 2 | `PullRequestTemplateCommand.filter(…)`, `PullRequestTemplateCommand.writeTargetSync` | `tools/synchronization/src/modules/pull-request-template/pull-request-template.command.ts:129` |
| `PullRequestTemplateCommand.writeTargetSync` | 2 | `PullRequestTemplateCommand.wrapInCodeBlock`, `PullRequestTemplateCommand.replaceMarkerContent` | `tools/synchronization/src/modules/pull-request-template/pull-request-template.command.ts:176` |
| `PullRequestTemplateCommand.run` | 2 | `SynchronizationService.resolveSynchronizationModeOrExit`, `PullRequestTemplateCommand.synchronize` | `tools/synchronization/src/modules/pull-request-template/pull-request-template.command.ts:202` |
| `ReadmeVersionCommand.run` | 2 | `SynchronizationService.resolveSynchronizationModeOrExit`, `ReadmeVersionCommand.synchronize` | `tools/synchronization/src/modules/readme-version/readme-version.command.ts:89` |
| `SkillExclusionsCommand.findStaleFiles` | 2 | `SkillExclusionsCommand.map(…)`, `SkillExclusionsCommand.filter(…)` | `tools/synchronization/src/modules/skill-exclusions/skill-exclusions.command.ts:71` |
| `SkillExclusionsCommand.filter(…)` | 2 | `SkillExclusionsCommand.readExclusionFile`, `SkillExclusionsCommand.renderBlock` | `tools/synchronization/src/modules/skill-exclusions/skill-exclusions.command.ts:72` |
| `SkillExclusionsCommand.readExclusionFile` | 2 | `SkillExclusionsCommand.renderStartMarker`, `SkillExclusionsCommand.renderEndMarker` | `tools/synchronization/src/modules/skill-exclusions/skill-exclusions.command.ts:82` |
| `SkillExclusionsCommand.run` | 2 | `SynchronizationService.resolveSynchronizationModeOrExit`, `SkillExclusionsCommand.synchronize` | `tools/synchronization/src/modules/skill-exclusions/skill-exclusions.command.ts:165` |
| `SynchronizationCommand.run` | 2 | `SynchronizationService.resolveSynchronizationModeOrExit`, `SynchronizationCommand.synchronize` | `tools/synchronization/src/modules/synchronization/synchronization.command.ts:123` |
| `SynchronizationMarkersService.locateMarkers` | 2 | `SynchronizationMarkersService.getStartMarker`, `SynchronizationMarkersService.getEndMarker` | `tools/synchronization/src/modules/synchronization/synchronization-markers.service.ts:24` |
| `IssueLabelsGithubService.describeFailure` | 1 | `IssueLabelsGithubService.filter(…)` | `tools/synchronization/src/modules/issue-labels/issue-labels-github.service.ts:43` |
| `IssueLabelsGithubService.isAvailable` | 1 | `IssueLabelsGithubService.run` | `tools/synchronization/src/modules/issue-labels/issue-labels-github.service.ts:52` |
| `IssueLabelsService.parseFormAnswers` | 1 | `IssueLabelsService.extractFormField` | `tools/synchronization/src/modules/issue-labels/issue-labels.service.ts:90` |
| `IssueLabelsCommand.nameOf` | 1 | `IssueLabelsCommand.isRecord` | `tools/synchronization/src/modules/issue-labels/issue-labels.command.ts:82` |
| `IssueLabelsCommand.readExistingLabelNames` | 1 | `IssueLabelsCommand.readLabelNames` | `tools/synchronization/src/modules/issue-labels/issue-labels.command.ts:94` |
| `IssueLabelsCommand.map(…)` | 1 | `IssueLabelsCommand.nameOf` | `tools/synchronization/src/modules/issue-labels/issue-labels.command.ts:120` |
| `SynchronizationService.resolveModeValue` | 1 | `SynchronizationService.isSynchronizationMode` | `tools/synchronization/src/modules/synchronization/synchronization.service.ts:40` |
| `ConformetryGeneratorsCommand.filter(…)` | 1 | `ConformetryGeneratorsCommand.readMarkedFile` | `tools/synchronization/src/modules/conformetry-generators/conformetry-generators.command.ts:66` |
| `ConformetryGeneratorsCommand.generateGeneratorsTable` | 1 | `ConformetryGeneratorsCommand.map(…)` | `tools/synchronization/src/modules/conformetry-generators/conformetry-generators.command.ts:98` |
| `ConventionalConfigIoService.writeIssueTemplateDropdown` | 1 | `ConventionalConfigIoService.generateYamlDropdownOptions` | `tools/synchronization/src/modules/conventional-config/conventional-config-io.service.ts:62` |
| `ConventionalConfigIoService.appendToPresetTypes` | 1 | `ConventionalConfigIoService.map(…)` | `tools/synchronization/src/modules/conventional-config/conventional-config-io.service.ts:86` |
| `ConventionalConfigIoService.appendToReleaseRules` | 1 | `ConventionalConfigIoService.map(…)` | `tools/synchronization/src/modules/conventional-config/conventional-config-io.service.ts:110` |
| `ConventionalConfigIoService.formatScopesForSettings` | 1 | `ConventionalConfigIoService.map(…)` | `tools/synchronization/src/modules/conventional-config/conventional-config-io.service.ts:141` |
| `ConventionalConfigIoService.generateYamlDropdownOptions` | 1 | `ConventionalConfigIoService.map(…)` | `tools/synchronization/src/modules/conventional-config/conventional-config-io.service.ts:170` |
| `ConventionalConfigIoService.getPresetConfigTypes` | 1 | `ConventionalConfigIoService.map(…)` | `tools/synchronization/src/modules/conventional-config/conventional-config-io.service.ts:177` |
| `ConventionalConfigIoService.writeSettingsSync` | 1 | `ConventionalConfigIoService.formatScopesForSettings` | `tools/synchronization/src/modules/conventional-config/conventional-config-io.service.ts:327` |
| `ConventionalConfigValidatorsService.validateMarkerValues` | 1 | `ConventionalConfigValidatorsService.showDifference` | `tools/synchronization/src/modules/conventional-config/conventional-config-validators.service.ts:123` |
| `ConventionalConfigValidatorsService.checkAllSkillsSync` | 1 | `ConventionalConfigValidatorsService.checkSkillSync` | `tools/synchronization/src/modules/conventional-config/conventional-config-validators.service.ts:155` |
| `ConventionalConfigValidatorsService.checkAllTemplatesSync` | 1 | `ConventionalConfigValidatorsService.checkIssueTemplateSync` | `tools/synchronization/src/modules/conventional-config/conventional-config-validators.service.ts:169` |
| `ConventionalConfigValidatorsService.checkReleaseRulesSync` | 1 | `ConventionalConfigValidatorsService.filter(…)` | `tools/synchronization/src/modules/conventional-config/conventional-config-validators.service.ts:244` |
| `ConventionalConfigValidatorsService.checkSettingsSync` | 1 | `ConventionalConfigValidatorsService.showDifference` | `tools/synchronization/src/modules/conventional-config/conventional-config-validators.service.ts:269` |
| `ConventionalConfigValidatorsService.checkSkillSync` | 1 | `ConventionalConfigValidatorsService.checkMarkerSync` | `tools/synchronization/src/modules/conventional-config/conventional-config-validators.service.ts:293` |
| `ConventionalConfigService.filter(…)` | 1 | `ConventionalConfigValidatorsService.checkSkillSync` | `tools/synchronization/src/modules/conventional-config/conventional-config.service.ts:190` |
| `ConventionalConfigService.filter(…)` | 1 | `ConventionalConfigValidatorsService.checkIssueTemplateSync` | `tools/synchronization/src/modules/conventional-config/conventional-config.service.ts:197` |
| `ConventionalConfigCommand.synchronize` | 1 | `ConventionalConfigService.runSynchronization` | `tools/synchronization/src/modules/conventional-config/conventional-config.command.ts:70` |
| `DevcontainerConfigurationCommand.syncFeatures` | 1 | `DevcontainerConfigurationCommand.isDockerFeatureKey` | `tools/synchronization/src/modules/devcontainer-configuration/devcontainer-configuration.command.ts:180` |
| `PackageManifestsService.sortKeys` | 1 | `PackageManifestsService.toSorted(…)` | `tools/synchronization/src/modules/package-manifests/package-manifests.service.ts:83` |
| `PackageManifestsService.map(…)` | 1 | `PackageManifestsService.checkPackageManifest` | `tools/synchronization/src/modules/package-manifests/package-manifests.service.ts:102` |
| `PullRequestLabelsGithubService.describeFailure` | 1 | `PullRequestLabelsGithubService.filter(…)` | `tools/synchronization/src/modules/pull-request-labels/pull-request-labels-github.service.ts:42` |
| `PullRequestLabelsService.isTrackedLabel` | 1 | `PullRequestLabelsService.some(…)` | `tools/synchronization/src/modules/pull-request-labels/pull-request-labels.service.ts:45` |
| `PullRequestLabelsService.filter(…)` | 1 | `PullRequestLabelsService.isTrackedLabel` | `tools/synchronization/src/modules/pull-request-labels/pull-request-labels.service.ts:82` |
| `PullRequestLabelsCommand.describePlan` | 1 | `PullRequestLabelsCommand.appendToReport` | `tools/synchronization/src/modules/pull-request-labels/pull-request-labels.command.ts:118` |
| `PullRequestLabelsCommand.reportStaleLabels` | 1 | `PullRequestLabelsCommand.appendToReport` | `tools/synchronization/src/modules/pull-request-labels/pull-request-labels.command.ts:238` |
| `PullRequestTemplateCommand.handleCheckMode` | 1 | `PullRequestTemplateCommand.checkTargetSync` | `tools/synchronization/src/modules/pull-request-template/pull-request-template.command.ts:106` |
| `PullRequestTemplateCommand.filter(…)` | 1 | `PullRequestTemplateCommand.checkTargetSync` | `tools/synchronization/src/modules/pull-request-template/pull-request-template.command.ts:134` |
| `ReadmeVersionCommand.checkSync` | 1 | `ReadmeVersionService.formatTitle` | `tools/synchronization/src/modules/readme-version/readme-version.command.ts:48` |
| `ReadmeVersionCommand.writeSync` | 1 | `ReadmeVersionService.writeReadmeVersion` | `tools/synchronization/src/modules/readme-version/readme-version.command.ts:67` |
| `SkillExclusionsCommand.readSkillNames` | 1 | `SkillExclusionsCommand.toSorted(…)` | `tools/synchronization/src/modules/skill-exclusions/skill-exclusions.command.ts:115` |
| `SkillExclusionsCommand.renderBlock` | 1 | `SkillExclusionsCommand.map(…)` | `tools/synchronization/src/modules/skill-exclusions/skill-exclusions.command.ts:127` |
| `SynchronizationMarkersService.extractContent` | 1 | `SynchronizationMarkersService.locateMarkers` | `tools/synchronization/src/modules/synchronization/synchronization-markers.service.ts:44` |
| `SynchronizationMarkersService.replaceContent` | 1 | `SynchronizationMarkersService.locateMarkers` | `tools/synchronization/src/modules/synchronization/synchronization-markers.service.ts:65` |

</details>
<!-- callidescope:end -->

## 🕸️ Codependix

Dependency graphs exported by [codependix](https://github.com/Organizzolini/codebase/tree/main/packages/ic-suite/codependix/codependix-cli), regenerated by `nx run codebase:codependix:write`.

### Nx Neighborhood

<!-- codependix:start name="codependix-nx-projects" -->
```mermaid
graph LR
  conformetry_configuration["conformetry-configuration"]
  logger["logger"]
  synchronization["synchronization"]
  synchronization --> conformetry_configuration
  synchronization --> logger
  classDef subject fill:#7c3aed,color:#fff,stroke:#4c1d95,stroke-width:2px
  class synchronization subject
```
<!-- codependix:end name="codependix-nx-projects" -->

### NestJS Module Graph

<!-- codependix:start name="codependix-nestjs-modules" -->
```mermaid
flowchart LR
  ConfigModule([ConfigModule])
  ConfigurationModule
  ConformetryGeneratorsModule
  ConventionalConfigModule
  DevcontainerConfigurationModule
  DiscoveryModule
  InputModule
  InstanceDiscoveryModule
  InstanceGroupModule
  IssueLabelsModule
  LoggerModule([LoggerModule])
  MainModule
  PackageManifestsModule
  PullRequestLabelsModule
  PullRequestTemplateModule
  ReadmeVersionModule
  RenderingModule
  SkillExclusionsModule
  SynchronizationModule
  TemplateDiscoveryModule
  ConfigurationModule --> InputModule
  ConfigurationModule --> InstanceDiscoveryModule
  ConfigurationModule --> InstanceGroupModule
  ConfigurationModule --> RenderingModule
  ConfigurationModule --> TemplateDiscoveryModule
  ConformetryGeneratorsModule --> ConfigurationModule
  InstanceDiscoveryModule --> InstanceGroupModule
  InstanceDiscoveryModule --> RenderingModule
  InstanceDiscoveryModule --> TemplateDiscoveryModule
  MainModule --> DiscoveryModule
  MainModule --> IssueLabelsModule
  MainModule --> SynchronizationModule
  SynchronizationModule --> ConformetryGeneratorsModule
  SynchronizationModule --> ConventionalConfigModule
  SynchronizationModule --> DevcontainerConfigurationModule
  SynchronizationModule --> PackageManifestsModule
  SynchronizationModule --> PullRequestLabelsModule
  SynchronizationModule --> PullRequestTemplateModule
  SynchronizationModule --> ReadmeVersionModule
  SynchronizationModule --> SkillExclusionsModule
  TemplateDiscoveryModule --> RenderingModule
```

_Rounded modules are global: every module can inject them, so their edges are left out._
<!-- codependix:end name="codependix-nestjs-modules" -->

### File Imports

<!-- codependix:start name="codependix-file-imports" -->
```mermaid
graph LR
  file_callidescope_config_ts["callidescope.config.ts"]
  file_codependix_config_ts["codependix.config.ts"]
  file_codometer_config_ts["codometer.config.ts"]
  file_eslint_config_ts["eslint.config.ts"]
  file_src_constants_ts["src/constants.ts"]
  file_src_main_end_to_end_test_ts["src/main.end-to-end.test.ts"]
  file_src_main_module_ts["src/main.module.ts"]
  file_src_main_ts["src/main.ts"]
  file_src_main_unit_test_ts["src/main.unit.test.ts"]
  file_src_modules_conformetry_generators_conformetry_generators_command_ts["src/modules/conformetry-generators/conformetry-generators.command.ts"]
  file_src_modules_conformetry_generators_conformetry_generators_command_unit_test_ts["src/modules/conformetry-generators/conformetry-generators.command.unit.test.ts"]
  file_src_modules_conformetry_generators_conformetry_generators_constants_ts["src/modules/conformetry-generators/conformetry-generators.constants.ts"]
  file_src_modules_conformetry_generators_conformetry_generators_module_ts["src/modules/conformetry-generators/conformetry-generators.module.ts"]
  file_src_modules_conformetry_generators_conformetry_generators_types_ts["src/modules/conformetry-generators/conformetry-generators.types.ts"]
  file_src_modules_conventional_config_conventional_config_io_service_ts["src/modules/conventional-config/conventional-config-io.service.ts"]
  file_src_modules_conventional_config_conventional_config_io_service_unit_test_ts["src/modules/conventional-config/conventional-config-io.service.unit.test.ts"]
  file_src_modules_conventional_config_conventional_config_validators_service_ts["src/modules/conventional-config/conventional-config-validators.service.ts"]
  file_src_modules_conventional_config_conventional_config_validators_service_unit_test_ts["src/modules/conventional-config/conventional-config-validators.service.unit.test.ts"]
  file_src_modules_conventional_config_conventional_config_command_ts["src/modules/conventional-config/conventional-config.command.ts"]
  file_src_modules_conventional_config_conventional_config_command_unit_test_ts["src/modules/conventional-config/conventional-config.command.unit.test.ts"]
  file_src_modules_conventional_config_conventional_config_constants_integration_test_ts["src/modules/conventional-config/conventional-config.constants.integration.test.ts"]
  file_src_modules_conventional_config_conventional_config_constants_ts["src/modules/conventional-config/conventional-config.constants.ts"]
  file_src_modules_conventional_config_conventional_config_module_ts["src/modules/conventional-config/conventional-config.module.ts"]
  file_src_modules_conventional_config_conventional_config_service_ts["src/modules/conventional-config/conventional-config.service.ts"]
  file_src_modules_conventional_config_conventional_config_service_unit_test_ts["src/modules/conventional-config/conventional-config.service.unit.test.ts"]
  file_src_modules_conventional_config_conventional_config_types_ts["src/modules/conventional-config/conventional-config.types.ts"]
  file_src_modules_devcontainer_configuration_devcontainer_configuration_command_ts["src/modules/devcontainer-configuration/devcontainer-configuration.command.ts"]
  file_src_modules_devcontainer_configuration_devcontainer_configuration_command_unit_test_ts["src/modules/devcontainer-configuration/devcontainer-configuration.command.unit.test.ts"]
  file_src_modules_devcontainer_configuration_devcontainer_configuration_constants_ts["src/modules/devcontainer-configuration/devcontainer-configuration.constants.ts"]
  file_src_modules_devcontainer_configuration_devcontainer_configuration_module_ts["src/modules/devcontainer-configuration/devcontainer-configuration.module.ts"]
  file_src_modules_devcontainer_configuration_devcontainer_configuration_types_ts["src/modules/devcontainer-configuration/devcontainer-configuration.types.ts"]
  file_src_modules_issue_labels_issue_labels_github_service_ts["src/modules/issue-labels/issue-labels-github.service.ts"]
  file_src_modules_issue_labels_issue_labels_github_service_unit_test_ts["src/modules/issue-labels/issue-labels-github.service.unit.test.ts"]
  file_src_modules_issue_labels_issue_labels_command_ts["src/modules/issue-labels/issue-labels.command.ts"]
  file_src_modules_issue_labels_issue_labels_command_unit_test_ts["src/modules/issue-labels/issue-labels.command.unit.test.ts"]
  file_src_modules_issue_labels_issue_labels_constants_ts["src/modules/issue-labels/issue-labels.constants.ts"]
  file_src_modules_issue_labels_issue_labels_module_ts["src/modules/issue-labels/issue-labels.module.ts"]
  file_src_modules_issue_labels_issue_labels_module_unit_test_ts["src/modules/issue-labels/issue-labels.module.unit.test.ts"]
  file_src_modules_issue_labels_issue_labels_service_ts["src/modules/issue-labels/issue-labels.service.ts"]
  file_src_modules_issue_labels_issue_labels_service_unit_test_ts["src/modules/issue-labels/issue-labels.service.unit.test.ts"]
  file_src_modules_issue_labels_issue_labels_types_ts["src/modules/issue-labels/issue-labels.types.ts"]
  file_src_modules_package_manifests_package_manifests_command_ts["src/modules/package-manifests/package-manifests.command.ts"]
  file_src_modules_package_manifests_package_manifests_command_unit_test_ts["src/modules/package-manifests/package-manifests.command.unit.test.ts"]
  file_src_modules_package_manifests_package_manifests_constants_ts["src/modules/package-manifests/package-manifests.constants.ts"]
  file_src_modules_package_manifests_package_manifests_module_ts["src/modules/package-manifests/package-manifests.module.ts"]
  file_src_modules_package_manifests_package_manifests_service_ts["src/modules/package-manifests/package-manifests.service.ts"]
  file_src_modules_package_manifests_package_manifests_service_unit_test_ts["src/modules/package-manifests/package-manifests.service.unit.test.ts"]
  file_src_modules_package_manifests_package_manifests_types_ts["src/modules/package-manifests/package-manifests.types.ts"]
  file_src_modules_pull_request_labels_pull_request_labels_github_service_ts["src/modules/pull-request-labels/pull-request-labels-github.service.ts"]
  file_src_modules_pull_request_labels_pull_request_labels_github_service_unit_test_ts["src/modules/pull-request-labels/pull-request-labels-github.service.unit.test.ts"]
  file_src_modules_pull_request_labels_pull_request_labels_command_ts["src/modules/pull-request-labels/pull-request-labels.command.ts"]
  file_src_modules_pull_request_labels_pull_request_labels_command_unit_test_ts["src/modules/pull-request-labels/pull-request-labels.command.unit.test.ts"]
  file_src_modules_pull_request_labels_pull_request_labels_constants_ts["src/modules/pull-request-labels/pull-request-labels.constants.ts"]
  file_src_modules_pull_request_labels_pull_request_labels_module_ts["src/modules/pull-request-labels/pull-request-labels.module.ts"]
  file_src_modules_pull_request_labels_pull_request_labels_service_ts["src/modules/pull-request-labels/pull-request-labels.service.ts"]
  file_src_modules_pull_request_labels_pull_request_labels_service_unit_test_ts["src/modules/pull-request-labels/pull-request-labels.service.unit.test.ts"]
  file_src_modules_pull_request_labels_pull_request_labels_types_ts["src/modules/pull-request-labels/pull-request-labels.types.ts"]
  file_src_modules_pull_request_template_pull_request_template_command_ts["src/modules/pull-request-template/pull-request-template.command.ts"]
  file_src_modules_pull_request_template_pull_request_template_command_unit_test_ts["src/modules/pull-request-template/pull-request-template.command.unit.test.ts"]
  file_src_modules_pull_request_template_pull_request_template_constants_ts["src/modules/pull-request-template/pull-request-template.constants.ts"]
  file_src_modules_pull_request_template_pull_request_template_module_ts["src/modules/pull-request-template/pull-request-template.module.ts"]
  file_src_modules_pull_request_template_pull_request_template_types_ts["src/modules/pull-request-template/pull-request-template.types.ts"]
  file_src_modules_readme_version_readme_version_command_ts["src/modules/readme-version/readme-version.command.ts"]
  file_src_modules_readme_version_readme_version_command_unit_test_ts["src/modules/readme-version/readme-version.command.unit.test.ts"]
  file_src_modules_readme_version_readme_version_constants_ts["src/modules/readme-version/readme-version.constants.ts"]
  file_src_modules_readme_version_readme_version_module_ts["src/modules/readme-version/readme-version.module.ts"]
  file_src_modules_readme_version_readme_version_service_ts["src/modules/readme-version/readme-version.service.ts"]
  file_src_modules_readme_version_readme_version_service_unit_test_ts["src/modules/readme-version/readme-version.service.unit.test.ts"]
  file_src_modules_readme_version_readme_version_types_ts["src/modules/readme-version/readme-version.types.ts"]
  file_src_modules_skill_exclusions_skill_exclusions_command_ts["src/modules/skill-exclusions/skill-exclusions.command.ts"]
  file_src_modules_skill_exclusions_skill_exclusions_command_unit_test_ts["src/modules/skill-exclusions/skill-exclusions.command.unit.test.ts"]
  file_src_modules_skill_exclusions_skill_exclusions_constants_ts["src/modules/skill-exclusions/skill-exclusions.constants.ts"]
  file_src_modules_skill_exclusions_skill_exclusions_module_ts["src/modules/skill-exclusions/skill-exclusions.module.ts"]
  file_src_modules_skill_exclusions_skill_exclusions_types_ts["src/modules/skill-exclusions/skill-exclusions.types.ts"]
  file_src_modules_synchronization_synchronization_markers_service_ts["src/modules/synchronization/synchronization-markers.service.ts"]
  file_src_modules_synchronization_synchronization_markers_service_unit_test_ts["src/modules/synchronization/synchronization-markers.service.unit.test.ts"]
  file_src_modules_synchronization_synchronization_command_ts["src/modules/synchronization/synchronization.command.ts"]
  file_src_modules_synchronization_synchronization_command_unit_test_ts["src/modules/synchronization/synchronization.command.unit.test.ts"]
  file_src_modules_synchronization_synchronization_constants_ts["src/modules/synchronization/synchronization.constants.ts"]
  file_src_modules_synchronization_synchronization_module_ts["src/modules/synchronization/synchronization.module.ts"]
  file_src_modules_synchronization_synchronization_module_unit_test_ts["src/modules/synchronization/synchronization.module.unit.test.ts"]
  file_src_modules_synchronization_synchronization_service_ts["src/modules/synchronization/synchronization.service.ts"]
  file_src_modules_synchronization_synchronization_service_unit_test_ts["src/modules/synchronization/synchronization.service.unit.test.ts"]
  file_src_modules_synchronization_synchronization_types_ts["src/modules/synchronization/synchronization.types.ts"]
  file_src_repl_ts["src/repl.ts"]
  file_src_repl_unit_test_ts["src/repl.unit.test.ts"]
  file_testing_mocks_ts["testing/mocks.ts"]
  file_testing_setup_ts["testing/setup.ts"]
  file_vitest_config_ts["vitest.config.ts"]
  file_src_main_end_to_end_test_ts --> file_src_constants_ts
  file_src_main_module_ts --> file_src_constants_ts
  file_src_main_module_ts --> file_src_modules_issue_labels_issue_labels_module_ts
  file_src_main_module_ts --> file_src_modules_synchronization_synchronization_module_ts
  file_src_main_ts --> file_src_main_module_ts
  file_src_main_unit_test_ts --> file_src_modules_issue_labels_issue_labels_module_ts
  file_src_main_unit_test_ts --> file_src_modules_synchronization_synchronization_module_ts
  file_src_modules_conformetry_generators_conformetry_generators_command_ts --> file_src_modules_conformetry_generators_conformetry_generators_types_ts
  file_src_modules_conformetry_generators_conformetry_generators_command_ts --> file_src_modules_synchronization_synchronization_service_ts
  file_src_modules_conformetry_generators_conformetry_generators_command_ts --> file_src_modules_synchronization_synchronization_types_ts
  file_src_modules_conformetry_generators_conformetry_generators_command_unit_test_ts --> file_src_modules_conformetry_generators_conformetry_generators_command_ts
  file_src_modules_conformetry_generators_conformetry_generators_command_unit_test_ts --> file_src_modules_synchronization_synchronization_service_ts
  file_src_modules_conformetry_generators_conformetry_generators_command_unit_test_ts --> file_testing_mocks_ts
  file_src_modules_conformetry_generators_conformetry_generators_module_ts --> file_src_modules_conformetry_generators_conformetry_generators_command_ts
  file_src_modules_conformetry_generators_conformetry_generators_module_ts --> file_src_modules_synchronization_synchronization_service_ts
  file_src_modules_conventional_config_conventional_config_io_service_ts --> file_src_modules_conventional_config_conventional_config_constants_ts
  file_src_modules_conventional_config_conventional_config_io_service_ts --> file_src_modules_conventional_config_conventional_config_types_ts
  file_src_modules_conventional_config_conventional_config_io_service_unit_test_ts --> file_src_modules_conventional_config_conventional_config_io_service_ts
  file_src_modules_conventional_config_conventional_config_io_service_unit_test_ts --> file_src_modules_conventional_config_conventional_config_types_ts
  file_src_modules_conventional_config_conventional_config_validators_service_ts --> file_src_modules_conventional_config_conventional_config_io_service_ts
  file_src_modules_conventional_config_conventional_config_validators_service_ts --> file_src_modules_conventional_config_conventional_config_constants_ts
  file_src_modules_conventional_config_conventional_config_validators_service_ts --> file_src_modules_conventional_config_conventional_config_types_ts
  file_src_modules_conventional_config_conventional_config_validators_service_unit_test_ts --> file_src_modules_conventional_config_conventional_config_io_service_ts
  file_src_modules_conventional_config_conventional_config_validators_service_unit_test_ts --> file_src_modules_conventional_config_conventional_config_validators_service_ts
  file_src_modules_conventional_config_conventional_config_validators_service_unit_test_ts --> file_src_modules_conventional_config_conventional_config_types_ts
  file_src_modules_conventional_config_conventional_config_command_ts --> file_src_modules_conventional_config_conventional_config_service_ts
  file_src_modules_conventional_config_conventional_config_command_ts --> file_src_modules_synchronization_synchronization_service_ts
  file_src_modules_conventional_config_conventional_config_command_ts --> file_src_modules_synchronization_synchronization_types_ts
  file_src_modules_conventional_config_conventional_config_command_unit_test_ts --> file_src_modules_conventional_config_conventional_config_command_ts
  file_src_modules_conventional_config_conventional_config_command_unit_test_ts --> file_src_modules_conventional_config_conventional_config_service_ts
  file_src_modules_conventional_config_conventional_config_command_unit_test_ts --> file_src_modules_synchronization_synchronization_service_ts
  file_src_modules_conventional_config_conventional_config_command_unit_test_ts --> file_testing_mocks_ts
  file_src_modules_conventional_config_conventional_config_constants_integration_test_ts --> file_src_modules_conventional_config_conventional_config_constants_ts
  file_src_modules_conventional_config_conventional_config_module_ts --> file_src_modules_conventional_config_conventional_config_io_service_ts
  file_src_modules_conventional_config_conventional_config_module_ts --> file_src_modules_conventional_config_conventional_config_validators_service_ts
  file_src_modules_conventional_config_conventional_config_module_ts --> file_src_modules_conventional_config_conventional_config_command_ts
  file_src_modules_conventional_config_conventional_config_module_ts --> file_src_modules_conventional_config_conventional_config_service_ts
  file_src_modules_conventional_config_conventional_config_module_ts --> file_src_modules_synchronization_synchronization_service_ts
  file_src_modules_conventional_config_conventional_config_service_ts --> file_src_modules_conventional_config_conventional_config_io_service_ts
  file_src_modules_conventional_config_conventional_config_service_ts --> file_src_modules_conventional_config_conventional_config_validators_service_ts
  file_src_modules_conventional_config_conventional_config_service_ts --> file_src_modules_conventional_config_conventional_config_constants_ts
  file_src_modules_conventional_config_conventional_config_service_ts --> file_src_modules_conventional_config_conventional_config_types_ts
  file_src_modules_conventional_config_conventional_config_service_unit_test_ts --> file_src_modules_conventional_config_conventional_config_io_service_ts
  file_src_modules_conventional_config_conventional_config_service_unit_test_ts --> file_src_modules_conventional_config_conventional_config_validators_service_ts
  file_src_modules_conventional_config_conventional_config_service_unit_test_ts --> file_src_modules_conventional_config_conventional_config_constants_ts
  file_src_modules_conventional_config_conventional_config_service_unit_test_ts --> file_src_modules_conventional_config_conventional_config_service_ts
  file_src_modules_conventional_config_conventional_config_service_unit_test_ts --> file_src_modules_conventional_config_conventional_config_types_ts
  file_src_modules_devcontainer_configuration_devcontainer_configuration_command_ts --> file_src_modules_devcontainer_configuration_devcontainer_configuration_constants_ts
  file_src_modules_devcontainer_configuration_devcontainer_configuration_command_ts --> file_src_modules_devcontainer_configuration_devcontainer_configuration_types_ts
  file_src_modules_devcontainer_configuration_devcontainer_configuration_command_ts --> file_src_modules_synchronization_synchronization_service_ts
  file_src_modules_devcontainer_configuration_devcontainer_configuration_command_ts --> file_src_modules_synchronization_synchronization_types_ts
  file_src_modules_devcontainer_configuration_devcontainer_configuration_command_unit_test_ts --> file_src_modules_devcontainer_configuration_devcontainer_configuration_command_ts
  file_src_modules_devcontainer_configuration_devcontainer_configuration_command_unit_test_ts --> file_src_modules_synchronization_synchronization_service_ts
  file_src_modules_devcontainer_configuration_devcontainer_configuration_command_unit_test_ts --> file_testing_mocks_ts
  file_src_modules_devcontainer_configuration_devcontainer_configuration_module_ts --> file_src_modules_devcontainer_configuration_devcontainer_configuration_command_ts
  file_src_modules_devcontainer_configuration_devcontainer_configuration_module_ts --> file_src_modules_synchronization_synchronization_service_ts
  file_src_modules_issue_labels_issue_labels_github_service_ts --> file_src_modules_issue_labels_issue_labels_constants_ts
  file_src_modules_issue_labels_issue_labels_github_service_ts --> file_src_modules_issue_labels_issue_labels_types_ts
  file_src_modules_issue_labels_issue_labels_github_service_unit_test_ts --> file_src_modules_issue_labels_issue_labels_github_service_ts
  file_src_modules_issue_labels_issue_labels_github_service_unit_test_ts --> file_src_modules_issue_labels_issue_labels_constants_ts
  file_src_modules_issue_labels_issue_labels_command_ts --> file_src_modules_issue_labels_issue_labels_github_service_ts
  file_src_modules_issue_labels_issue_labels_command_ts --> file_src_modules_issue_labels_issue_labels_constants_ts
  file_src_modules_issue_labels_issue_labels_command_ts --> file_src_modules_issue_labels_issue_labels_service_ts
  file_src_modules_issue_labels_issue_labels_command_unit_test_ts --> file_src_modules_issue_labels_issue_labels_github_service_ts
  file_src_modules_issue_labels_issue_labels_command_unit_test_ts --> file_src_modules_issue_labels_issue_labels_command_ts
  file_src_modules_issue_labels_issue_labels_command_unit_test_ts --> file_src_modules_issue_labels_issue_labels_service_ts
  file_src_modules_issue_labels_issue_labels_command_unit_test_ts --> file_src_modules_issue_labels_issue_labels_types_ts
  file_src_modules_issue_labels_issue_labels_module_ts --> file_src_modules_issue_labels_issue_labels_github_service_ts
  file_src_modules_issue_labels_issue_labels_module_ts --> file_src_modules_issue_labels_issue_labels_command_ts
  file_src_modules_issue_labels_issue_labels_module_ts --> file_src_modules_issue_labels_issue_labels_service_ts
  file_src_modules_issue_labels_issue_labels_module_unit_test_ts --> file_src_modules_issue_labels_issue_labels_github_service_ts
  file_src_modules_issue_labels_issue_labels_module_unit_test_ts --> file_src_modules_issue_labels_issue_labels_command_ts
  file_src_modules_issue_labels_issue_labels_module_unit_test_ts --> file_src_modules_issue_labels_issue_labels_module_ts
  file_src_modules_issue_labels_issue_labels_module_unit_test_ts --> file_src_modules_issue_labels_issue_labels_service_ts
  file_src_modules_issue_labels_issue_labels_service_ts --> file_src_modules_issue_labels_issue_labels_constants_ts
  file_src_modules_issue_labels_issue_labels_service_ts --> file_src_modules_issue_labels_issue_labels_types_ts
  file_src_modules_issue_labels_issue_labels_service_unit_test_ts --> file_src_modules_issue_labels_issue_labels_service_ts
  file_src_modules_package_manifests_package_manifests_command_ts --> file_src_modules_package_manifests_package_manifests_service_ts
  file_src_modules_package_manifests_package_manifests_command_ts --> file_src_modules_synchronization_synchronization_service_ts
  file_src_modules_package_manifests_package_manifests_command_ts --> file_src_modules_synchronization_synchronization_types_ts
  file_src_modules_package_manifests_package_manifests_command_unit_test_ts --> file_src_modules_package_manifests_package_manifests_command_ts
  file_src_modules_package_manifests_package_manifests_command_unit_test_ts --> file_src_modules_package_manifests_package_manifests_service_ts
  file_src_modules_package_manifests_package_manifests_command_unit_test_ts --> file_src_modules_package_manifests_package_manifests_types_ts
  file_src_modules_package_manifests_package_manifests_command_unit_test_ts --> file_src_modules_synchronization_synchronization_service_ts
  file_src_modules_package_manifests_package_manifests_command_unit_test_ts --> file_testing_mocks_ts
  file_src_modules_package_manifests_package_manifests_module_ts --> file_src_modules_package_manifests_package_manifests_command_ts
  file_src_modules_package_manifests_package_manifests_module_ts --> file_src_modules_package_manifests_package_manifests_service_ts
  file_src_modules_package_manifests_package_manifests_module_ts --> file_src_modules_synchronization_synchronization_service_ts
  file_src_modules_package_manifests_package_manifests_service_ts --> file_src_modules_package_manifests_package_manifests_constants_ts
  file_src_modules_package_manifests_package_manifests_service_ts --> file_src_modules_package_manifests_package_manifests_types_ts
  file_src_modules_package_manifests_package_manifests_service_unit_test_ts --> file_src_modules_package_manifests_package_manifests_constants_ts
  file_src_modules_package_manifests_package_manifests_service_unit_test_ts --> file_src_modules_package_manifests_package_manifests_service_ts
  file_src_modules_package_manifests_package_manifests_service_unit_test_ts --> file_src_modules_package_manifests_package_manifests_types_ts
  file_src_modules_package_manifests_package_manifests_types_ts --> file_src_modules_package_manifests_package_manifests_constants_ts
  file_src_modules_pull_request_labels_pull_request_labels_github_service_ts --> file_src_modules_pull_request_labels_pull_request_labels_constants_ts
  file_src_modules_pull_request_labels_pull_request_labels_github_service_ts --> file_src_modules_pull_request_labels_pull_request_labels_types_ts
  file_src_modules_pull_request_labels_pull_request_labels_github_service_unit_test_ts --> file_src_modules_pull_request_labels_pull_request_labels_github_service_ts
  file_src_modules_pull_request_labels_pull_request_labels_command_ts --> file_src_modules_pull_request_labels_pull_request_labels_github_service_ts
  file_src_modules_pull_request_labels_pull_request_labels_command_ts --> file_src_modules_pull_request_labels_pull_request_labels_constants_ts
  file_src_modules_pull_request_labels_pull_request_labels_command_ts --> file_src_modules_pull_request_labels_pull_request_labels_service_ts
  file_src_modules_pull_request_labels_pull_request_labels_command_ts --> file_src_modules_pull_request_labels_pull_request_labels_types_ts
  file_src_modules_pull_request_labels_pull_request_labels_command_ts --> file_src_modules_synchronization_synchronization_service_ts
  file_src_modules_pull_request_labels_pull_request_labels_command_ts --> file_src_modules_synchronization_synchronization_types_ts
  file_src_modules_pull_request_labels_pull_request_labels_command_unit_test_ts --> file_src_modules_pull_request_labels_pull_request_labels_github_service_ts
  file_src_modules_pull_request_labels_pull_request_labels_command_unit_test_ts --> file_src_modules_pull_request_labels_pull_request_labels_command_ts
  file_src_modules_pull_request_labels_pull_request_labels_command_unit_test_ts --> file_src_modules_pull_request_labels_pull_request_labels_constants_ts
  file_src_modules_pull_request_labels_pull_request_labels_command_unit_test_ts --> file_src_modules_pull_request_labels_pull_request_labels_service_ts
  file_src_modules_pull_request_labels_pull_request_labels_command_unit_test_ts --> file_src_modules_pull_request_labels_pull_request_labels_types_ts
  file_src_modules_pull_request_labels_pull_request_labels_command_unit_test_ts --> file_src_modules_synchronization_synchronization_service_ts
  file_src_modules_pull_request_labels_pull_request_labels_command_unit_test_ts --> file_testing_mocks_ts
  file_src_modules_pull_request_labels_pull_request_labels_constants_ts --> file_src_modules_pull_request_labels_pull_request_labels_types_ts
  file_src_modules_pull_request_labels_pull_request_labels_module_ts --> file_src_modules_pull_request_labels_pull_request_labels_github_service_ts
  file_src_modules_pull_request_labels_pull_request_labels_module_ts --> file_src_modules_pull_request_labels_pull_request_labels_command_ts
  file_src_modules_pull_request_labels_pull_request_labels_module_ts --> file_src_modules_pull_request_labels_pull_request_labels_service_ts
  file_src_modules_pull_request_labels_pull_request_labels_module_ts --> file_src_modules_synchronization_synchronization_service_ts
  file_src_modules_pull_request_labels_pull_request_labels_service_ts --> file_src_modules_pull_request_labels_pull_request_labels_constants_ts
  file_src_modules_pull_request_labels_pull_request_labels_service_ts --> file_src_modules_pull_request_labels_pull_request_labels_types_ts
  file_src_modules_pull_request_labels_pull_request_labels_service_unit_test_ts --> file_src_modules_pull_request_labels_pull_request_labels_service_ts
  file_src_modules_pull_request_labels_pull_request_labels_service_unit_test_ts --> file_src_modules_pull_request_labels_pull_request_labels_types_ts
  file_src_modules_pull_request_template_pull_request_template_command_ts --> file_src_modules_pull_request_template_pull_request_template_constants_ts
  file_src_modules_pull_request_template_pull_request_template_command_ts --> file_src_modules_synchronization_synchronization_service_ts
  file_src_modules_pull_request_template_pull_request_template_command_ts --> file_src_modules_synchronization_synchronization_types_ts
  file_src_modules_pull_request_template_pull_request_template_command_unit_test_ts --> file_src_modules_pull_request_template_pull_request_template_command_ts
  file_src_modules_pull_request_template_pull_request_template_command_unit_test_ts --> file_src_modules_pull_request_template_pull_request_template_constants_ts
  file_src_modules_pull_request_template_pull_request_template_command_unit_test_ts --> file_src_modules_synchronization_synchronization_service_ts
  file_src_modules_pull_request_template_pull_request_template_command_unit_test_ts --> file_testing_mocks_ts
  file_src_modules_pull_request_template_pull_request_template_module_ts --> file_src_modules_pull_request_template_pull_request_template_command_ts
  file_src_modules_pull_request_template_pull_request_template_module_ts --> file_src_modules_synchronization_synchronization_service_ts
  file_src_modules_readme_version_readme_version_command_ts --> file_src_modules_readme_version_readme_version_service_ts
  file_src_modules_readme_version_readme_version_command_ts --> file_src_modules_synchronization_synchronization_service_ts
  file_src_modules_readme_version_readme_version_command_ts --> file_src_modules_synchronization_synchronization_types_ts
  file_src_modules_readme_version_readme_version_command_unit_test_ts --> file_src_modules_readme_version_readme_version_command_ts
  file_src_modules_readme_version_readme_version_command_unit_test_ts --> file_src_modules_readme_version_readme_version_constants_ts
  file_src_modules_readme_version_readme_version_command_unit_test_ts --> file_src_modules_readme_version_readme_version_service_ts
  file_src_modules_readme_version_readme_version_command_unit_test_ts --> file_src_modules_synchronization_synchronization_service_ts
  file_src_modules_readme_version_readme_version_command_unit_test_ts --> file_testing_mocks_ts
  file_src_modules_readme_version_readme_version_module_ts --> file_src_modules_readme_version_readme_version_command_ts
  file_src_modules_readme_version_readme_version_module_ts --> file_src_modules_readme_version_readme_version_service_ts
  file_src_modules_readme_version_readme_version_module_ts --> file_src_modules_synchronization_synchronization_service_ts
  file_src_modules_readme_version_readme_version_service_ts --> file_src_modules_readme_version_readme_version_constants_ts
  file_src_modules_readme_version_readme_version_service_unit_test_ts --> file_src_modules_readme_version_readme_version_constants_ts
  file_src_modules_readme_version_readme_version_service_unit_test_ts --> file_src_modules_readme_version_readme_version_service_ts
  file_src_modules_skill_exclusions_skill_exclusions_command_ts --> file_src_modules_skill_exclusions_skill_exclusions_constants_ts
  file_src_modules_skill_exclusions_skill_exclusions_command_ts --> file_src_modules_skill_exclusions_skill_exclusions_types_ts
  file_src_modules_skill_exclusions_skill_exclusions_command_ts --> file_src_modules_synchronization_synchronization_service_ts
  file_src_modules_skill_exclusions_skill_exclusions_command_ts --> file_src_modules_synchronization_synchronization_types_ts
  file_src_modules_skill_exclusions_skill_exclusions_command_unit_test_ts --> file_src_modules_skill_exclusions_skill_exclusions_command_ts
  file_src_modules_skill_exclusions_skill_exclusions_command_unit_test_ts --> file_src_modules_skill_exclusions_skill_exclusions_constants_ts
  file_src_modules_skill_exclusions_skill_exclusions_command_unit_test_ts --> file_src_modules_skill_exclusions_skill_exclusions_types_ts
  file_src_modules_skill_exclusions_skill_exclusions_command_unit_test_ts --> file_src_modules_synchronization_synchronization_service_ts
  file_src_modules_skill_exclusions_skill_exclusions_command_unit_test_ts --> file_testing_mocks_ts
  file_src_modules_skill_exclusions_skill_exclusions_constants_ts --> file_src_modules_skill_exclusions_skill_exclusions_types_ts
  file_src_modules_skill_exclusions_skill_exclusions_module_ts --> file_src_modules_skill_exclusions_skill_exclusions_command_ts
  file_src_modules_skill_exclusions_skill_exclusions_module_ts --> file_src_modules_synchronization_synchronization_service_ts
  file_src_modules_synchronization_synchronization_markers_service_unit_test_ts --> file_src_modules_synchronization_synchronization_markers_service_ts
  file_src_modules_synchronization_synchronization_command_ts --> file_src_modules_conformetry_generators_conformetry_generators_command_ts
  file_src_modules_synchronization_synchronization_command_ts --> file_src_modules_conventional_config_conventional_config_command_ts
  file_src_modules_synchronization_synchronization_command_ts --> file_src_modules_devcontainer_configuration_devcontainer_configuration_command_ts
  file_src_modules_synchronization_synchronization_command_ts --> file_src_modules_package_manifests_package_manifests_command_ts
  file_src_modules_synchronization_synchronization_command_ts --> file_src_modules_pull_request_labels_pull_request_labels_command_ts
  file_src_modules_synchronization_synchronization_command_ts --> file_src_modules_pull_request_template_pull_request_template_command_ts
  file_src_modules_synchronization_synchronization_command_ts --> file_src_modules_readme_version_readme_version_command_ts
  file_src_modules_synchronization_synchronization_command_ts --> file_src_modules_skill_exclusions_skill_exclusions_command_ts
  file_src_modules_synchronization_synchronization_command_ts --> file_src_modules_synchronization_synchronization_service_ts
  file_src_modules_synchronization_synchronization_command_ts --> file_src_modules_synchronization_synchronization_types_ts
  file_src_modules_synchronization_synchronization_command_unit_test_ts --> file_src_modules_conformetry_generators_conformetry_generators_command_ts
  file_src_modules_synchronization_synchronization_command_unit_test_ts --> file_src_modules_conventional_config_conventional_config_command_ts
  file_src_modules_synchronization_synchronization_command_unit_test_ts --> file_src_modules_devcontainer_configuration_devcontainer_configuration_command_ts
  file_src_modules_synchronization_synchronization_command_unit_test_ts --> file_src_modules_package_manifests_package_manifests_command_ts
  file_src_modules_synchronization_synchronization_command_unit_test_ts --> file_src_modules_pull_request_labels_pull_request_labels_command_ts
  file_src_modules_synchronization_synchronization_command_unit_test_ts --> file_src_modules_pull_request_template_pull_request_template_command_ts
  file_src_modules_synchronization_synchronization_command_unit_test_ts --> file_src_modules_readme_version_readme_version_command_ts
  file_src_modules_synchronization_synchronization_command_unit_test_ts --> file_src_modules_skill_exclusions_skill_exclusions_command_ts
  file_src_modules_synchronization_synchronization_command_unit_test_ts --> file_src_modules_synchronization_synchronization_command_ts
  file_src_modules_synchronization_synchronization_command_unit_test_ts --> file_src_modules_synchronization_synchronization_service_ts
  file_src_modules_synchronization_synchronization_command_unit_test_ts --> file_src_modules_synchronization_synchronization_types_ts
  file_src_modules_synchronization_synchronization_command_unit_test_ts --> file_testing_mocks_ts
  file_src_modules_synchronization_synchronization_module_ts --> file_src_modules_conformetry_generators_conformetry_generators_module_ts
  file_src_modules_synchronization_synchronization_module_ts --> file_src_modules_conventional_config_conventional_config_module_ts
  file_src_modules_synchronization_synchronization_module_ts --> file_src_modules_devcontainer_configuration_devcontainer_configuration_module_ts
  file_src_modules_synchronization_synchronization_module_ts --> file_src_modules_package_manifests_package_manifests_module_ts
  file_src_modules_synchronization_synchronization_module_ts --> file_src_modules_pull_request_labels_pull_request_labels_module_ts
  file_src_modules_synchronization_synchronization_module_ts --> file_src_modules_pull_request_template_pull_request_template_module_ts
  file_src_modules_synchronization_synchronization_module_ts --> file_src_modules_readme_version_readme_version_module_ts
  file_src_modules_synchronization_synchronization_module_ts --> file_src_modules_skill_exclusions_skill_exclusions_module_ts
  file_src_modules_synchronization_synchronization_module_ts --> file_src_modules_synchronization_synchronization_command_ts
  file_src_modules_synchronization_synchronization_module_ts --> file_src_modules_synchronization_synchronization_service_ts
  file_src_modules_synchronization_synchronization_module_unit_test_ts --> file_src_modules_conformetry_generators_conformetry_generators_module_ts
  file_src_modules_synchronization_synchronization_module_unit_test_ts --> file_src_modules_conventional_config_conventional_config_module_ts
  file_src_modules_synchronization_synchronization_module_unit_test_ts --> file_src_modules_devcontainer_configuration_devcontainer_configuration_module_ts
  file_src_modules_synchronization_synchronization_module_unit_test_ts --> file_src_modules_pull_request_labels_pull_request_labels_module_ts
  file_src_modules_synchronization_synchronization_module_unit_test_ts --> file_src_modules_pull_request_template_pull_request_template_module_ts
  file_src_modules_synchronization_synchronization_module_unit_test_ts --> file_src_modules_skill_exclusions_skill_exclusions_module_ts
  file_src_modules_synchronization_synchronization_module_unit_test_ts --> file_src_modules_synchronization_synchronization_command_ts
  file_src_modules_synchronization_synchronization_module_unit_test_ts --> file_src_modules_synchronization_synchronization_module_ts
  file_src_modules_synchronization_synchronization_module_unit_test_ts --> file_src_modules_synchronization_synchronization_service_ts
  file_src_modules_synchronization_synchronization_service_ts --> file_src_modules_synchronization_synchronization_types_ts
  file_src_modules_synchronization_synchronization_service_unit_test_ts --> file_src_modules_synchronization_synchronization_service_ts
  file_src_repl_ts --> file_src_main_module_ts
  file_src_repl_unit_test_ts --> file_src_modules_synchronization_synchronization_module_ts
```
<!-- codependix:end name="codependix-file-imports" -->

<!-- codometer:start -->

## ⏲️ Codometer

### Project

![Lines of Code](https://img.shields.io/badge/Lines_of_Code-10624-22c55e?style=flat-square)
![Repository Size](https://img.shields.io/badge/Repository_Size-349.27_kB-6b7280?style=flat-square)
![Folders](https://img.shields.io/badge/Folders-13-4a4a4a?style=flat-square)
![Source Files](https://img.shields.io/badge/Source_Files-89-3178c6?style=flat-square)

### TypeScript

![TypeScript Files](https://img.shields.io/badge/TypeScript_Files-89-3178c6?style=flat-square)
![Interfaces](https://img.shields.io/badge/Interfaces-24-0ea5e9?style=flat-square)
![Generic Declarations](https://img.shields.io/badge/Generic_Declarations-0-0369a1?style=flat-square)
![Enums](https://img.shields.io/badge/Enums-0-f97316?style=flat-square)
![Decorators](https://img.shields.io/badge/Decorators-42-db2777?style=flat-square)
![Doc Comments](https://img.shields.io/badge/Doc_Comments-210-6366f1?style=flat-square)
![Static Methods](https://img.shields.io/badge/Static_Methods-0-166534?style=flat-square)

### JavaScript

![JavaScript Files](https://img.shields.io/badge/JavaScript_Files-0-f7df1e?style=flat-square)
![Test Files](https://img.shields.io/badge/Test_Files-27-10b981?style=flat-square)
![External Packages](https://img.shields.io/badge/External_Packages-18-8b5cf6?style=flat-square)
![Classes](https://img.shields.io/badge/Classes-33-7c3aed?style=flat-square)
![Functions](https://img.shields.io/badge/Functions-507-16a34a?style=flat-square)
![Methods](https://img.shields.io/badge/Methods-206-15803d?style=flat-square)
![Sync Functions](https://img.shields.io/badge/Sync_Functions-548-4ade80?style=flat-square)
![Async Functions](https://img.shields.io/badge/Async_Functions-165-059669?style=flat-square)
![Constants](https://img.shields.io/badge/Constants-578-dc2626?style=flat-square)
![Imports](https://img.shields.io/badge/Imports-433-0284c7?style=flat-square)
![Exported Symbols](https://img.shields.io/badge/Exported_Symbols-106-ea580c?style=flat-square)
![Comments](https://img.shields.io/badge/Comments-369-64748b?style=flat-square)
![Comment Lines](https://img.shields.io/badge/Comment_Lines-768-475569?style=flat-square)
![TODO Comments](https://img.shields.io/badge/TODO_Comments-3-ca8a04?style=flat-square)

### Python

![Python Files](https://img.shields.io/badge/Python_Files-0-3776ab?style=flat-square)
![Python Lines](https://img.shields.io/badge/Python_Lines-0-4b8bbe?style=flat-square)
![Python Classes](https://img.shields.io/badge/Python_Classes-0-7c3aed?style=flat-square)
![Python Functions](https://img.shields.io/badge/Python_Functions-0-16a34a?style=flat-square)
![Python Protocols](https://img.shields.io/badge/Python_Protocols-0-0ea5e9?style=flat-square)
![Python Constants](https://img.shields.io/badge/Python_Constants-0-dc2626?style=flat-square)
![Python Imports](https://img.shields.io/badge/Python_Imports-0-0284c7?style=flat-square)
![Python Decorators](https://img.shields.io/badge/Python_Decorators-0-db2777?style=flat-square)
![Docstrings](https://img.shields.io/badge/Docstrings-0-6366f1?style=flat-square)
![Docstring Lines](https://img.shields.io/badge/Docstring_Lines-0-818cf8?style=flat-square)
![Python Comments](https://img.shields.io/badge/Python_Comments-0-64748b?style=flat-square)
![Python Comment Lines](https://img.shields.io/badge/Python_Comment_Lines-0-475569?style=flat-square)

### JSON

![JSON Files](https://img.shields.io/badge/JSON_Files-3-a16207?style=flat-square)
![JSON Lines](https://img.shields.io/badge/JSON_Lines-312-ca8a04?style=flat-square)
![JSON Objects](https://img.shields.io/badge/JSON_Objects-75-7c3aed?style=flat-square)
![JSON Arrays](https://img.shields.io/badge/JSON_Arrays-15-8b5cf6?style=flat-square)
![JSON Properties](https://img.shields.io/badge/JSON_Properties-190-0284c7?style=flat-square)
![JSON Strings](https://img.shields.io/badge/JSON_Strings-148-16a34a?style=flat-square)
![JSON Numbers](https://img.shields.io/badge/JSON_Numbers-1-059669?style=flat-square)
![JSON Booleans](https://img.shields.io/badge/JSON_Booleans-13-0ea5e9?style=flat-square)
![JSON Nulls](https://img.shields.io/badge/JSON_Nulls-0-64748b?style=flat-square)
![JSON Items](https://img.shields.io/badge/JSON_Items-59-475569?style=flat-square)
![JSON Nodes](https://img.shields.io/badge/JSON_Nodes-252-dc2626?style=flat-square)
![JSON Max Depth](https://img.shields.io/badge/JSON_Max_Depth-6-ea580c?style=flat-square)

### YAML

![YAML Files](https://img.shields.io/badge/YAML_Files-0-cb171e?style=flat-square)
![YAML Lines](https://img.shields.io/badge/YAML_Lines-0-e34c26?style=flat-square)
![YAML Documents](https://img.shields.io/badge/YAML_Documents-0-f97316?style=flat-square)
![YAML Mappings](https://img.shields.io/badge/YAML_Mappings-0-7c3aed?style=flat-square)
![YAML Sequences](https://img.shields.io/badge/YAML_Sequences-0-8b5cf6?style=flat-square)
![YAML Keys](https://img.shields.io/badge/YAML_Keys-0-0284c7?style=flat-square)
![YAML Scalars](https://img.shields.io/badge/YAML_Scalars-0-16a34a?style=flat-square)
![YAML Anchors](https://img.shields.io/badge/YAML_Anchors-0-059669?style=flat-square)
![YAML Aliases](https://img.shields.io/badge/YAML_Aliases-0-10b981?style=flat-square)
![YAML Comments](https://img.shields.io/badge/YAML_Comments-0-64748b?style=flat-square)
![YAML Max Depth](https://img.shields.io/badge/YAML_Max_Depth-0-ea580c?style=flat-square)

### TOML

![TOML Files](https://img.shields.io/badge/TOML_Files-0-9c4221?style=flat-square)
![TOML Lines](https://img.shields.io/badge/TOML_Lines-0-b45309?style=flat-square)
![TOML Tables](https://img.shields.io/badge/TOML_Tables-0-7c3aed?style=flat-square)
![TOML Array Tables](https://img.shields.io/badge/TOML_Array_Tables-0-8b5cf6?style=flat-square)
![TOML Keys](https://img.shields.io/badge/TOML_Keys-0-0284c7?style=flat-square)
![TOML Arrays](https://img.shields.io/badge/TOML_Arrays-0-16a34a?style=flat-square)
![TOML Comments](https://img.shields.io/badge/TOML_Comments-0-64748b?style=flat-square)

### Shell

![Shell Files](https://img.shields.io/badge/Shell_Files-0-89e051?style=flat-square)
![Shell Lines](https://img.shields.io/badge/Shell_Lines-0-4eaa25?style=flat-square)
![Shell Functions](https://img.shields.io/badge/Shell_Functions-0-16a34a?style=flat-square)
![Shell Variables](https://img.shields.io/badge/Shell_Variables-0-0284c7?style=flat-square)
![Shell Exports](https://img.shields.io/badge/Shell_Exports-0-ea580c?style=flat-square)
![Shell Conditionals](https://img.shields.io/badge/Shell_Conditionals-0-7c3aed?style=flat-square)
![Shell Loops](https://img.shields.io/badge/Shell_Loops-0-8b5cf6?style=flat-square)
![Shell Pipelines](https://img.shields.io/badge/Shell_Pipelines-0-059669?style=flat-square)
![Shebangs](https://img.shields.io/badge/Shebangs-0-6b7280?style=flat-square)
![Shell Comments](https://img.shields.io/badge/Shell_Comments-0-64748b?style=flat-square)
![Shell Comment Lines](https://img.shields.io/badge/Shell_Comment_Lines-0-475569?style=flat-square)

### SQL

![SQL Files](https://img.shields.io/badge/SQL_Files-0-e38c00?style=flat-square)
![SQL Lines](https://img.shields.io/badge/SQL_Lines-0-f29111?style=flat-square)
![SQL Statements](https://img.shields.io/badge/SQL_Statements-0-7c3aed?style=flat-square)
![SQL Selects](https://img.shields.io/badge/SQL_Selects-0-16a34a?style=flat-square)
![SQL Inserts](https://img.shields.io/badge/SQL_Inserts-0-22c55e?style=flat-square)
![SQL Updates](https://img.shields.io/badge/SQL_Updates-0-0ea5e9?style=flat-square)
![SQL Deletes](https://img.shields.io/badge/SQL_Deletes-0-dc2626?style=flat-square)
![SQL Creates](https://img.shields.io/badge/SQL_Creates-0-0284c7?style=flat-square)
![SQL Joins](https://img.shields.io/badge/SQL_Joins-0-8b5cf6?style=flat-square)
![SQL CTEs](https://img.shields.io/badge/SQL_CTEs-0-059669?style=flat-square)
![SQL Comments](https://img.shields.io/badge/SQL_Comments-0-64748b?style=flat-square)

### HCL

![HCL Files](https://img.shields.io/badge/HCL_Files-0-844fba?style=flat-square)
![HCL Lines](https://img.shields.io/badge/HCL_Lines-0-a78bfa?style=flat-square)
![HCL Blocks](https://img.shields.io/badge/HCL_Blocks-0-7c3aed?style=flat-square)
![HCL Resources](https://img.shields.io/badge/HCL_Resources-0-0284c7?style=flat-square)
![HCL Variables](https://img.shields.io/badge/HCL_Variables-0-16a34a?style=flat-square)
![HCL Outputs](https://img.shields.io/badge/HCL_Outputs-0-059669?style=flat-square)
![HCL Attributes](https://img.shields.io/badge/HCL_Attributes-0-0ea5e9?style=flat-square)
![HCL Interpolations](https://img.shields.io/badge/HCL_Interpolations-0-db2777?style=flat-square)
![HCL Comments](https://img.shields.io/badge/HCL_Comments-0-64748b?style=flat-square)

### CSS

![CSS Files](https://img.shields.io/badge/CSS_Files-0-264de4?style=flat-square)
![CSS Lines](https://img.shields.io/badge/CSS_Lines-0-2965f1?style=flat-square)
![CSS Rules](https://img.shields.io/badge/CSS_Rules-0-7c3aed?style=flat-square)
![CSS Selectors](https://img.shields.io/badge/CSS_Selectors-0-8b5cf6?style=flat-square)
![CSS Declarations](https://img.shields.io/badge/CSS_Declarations-0-0284c7?style=flat-square)
![CSS At Rules](https://img.shields.io/badge/CSS_At_Rules-0-f97316?style=flat-square)
![CSS Media Queries](https://img.shields.io/badge/CSS_Media_Queries-0-ea580c?style=flat-square)
![CSS Custom Properties](https://img.shields.io/badge/CSS_Custom_Properties-0-16a34a?style=flat-square)
![CSS Comments](https://img.shields.io/badge/CSS_Comments-0-64748b?style=flat-square)

### Conventions

![Module Files](https://img.shields.io/badge/Module_Files-11-7c3aed?style=flat-square)
![Service Files](https://img.shields.io/badge/Service_Files-11-0284c7?style=flat-square)
![Command Files](https://img.shields.io/badge/Command_Files-10-16a34a?style=flat-square)
![Constants Files](https://img.shields.io/badge/Constants_Files-10-ea580c?style=flat-square)
![Types Files](https://img.shields.io/badge/Types_Files-10-db2777?style=flat-square)
![Utilities Files](https://img.shields.io/badge/Utilities_Files-0-0ea5e9?style=flat-square)
![TypeORM Entities](https://img.shields.io/badge/TypeORM_Entities-0-059669?style=flat-square)
![Unit Tests](https://img.shields.io/badge/Unit_Tests-25-ca8a04?style=flat-square)
![Integration Tests](https://img.shields.io/badge/Integration_Tests-1-7c3aed?style=flat-square)
![End To End Tests](https://img.shields.io/badge/End_To_End_Tests-1-0284c7?style=flat-square)
![CSS Comment Budget](https://img.shields.io/badge/CSS_Comment_Budget-0-16a34a?style=flat-square)
![HCL Comment Budget](https://img.shields.io/badge/HCL_Comment_Budget-0-ea580c?style=flat-square)
![Python Comment Budget](https://img.shields.io/badge/Python_Comment_Budget-0-db2777?style=flat-square)
![SQL Comment Budget](https://img.shields.io/badge/SQL_Comment_Budget-0-0ea5e9?style=flat-square)
![TOML Comment Budget](https://img.shields.io/badge/TOML_Comment_Budget-0-059669?style=flat-square)
![TypeScript Comment Budget](https://img.shields.io/badge/TypeScript_Comment_Budget-0-ca8a04?style=flat-square)
![YAML Comment Budget](https://img.shields.io/badge/YAML_Comment_Budget-0-7c3aed?style=flat-square)
![Shell Comment Budget](https://img.shields.io/badge/Shell_Comment_Budget-0-0284c7?style=flat-square)

### Jupyter

![Notebooks](https://img.shields.io/badge/Notebooks-0-f37626?style=flat-square)
![Notebook Cells](https://img.shields.io/badge/Notebook_Cells-0-e8a33d?style=flat-square)
![Code Cells](https://img.shields.io/badge/Code_Cells-0-3776ab?style=flat-square)
![Markdown Cells](https://img.shields.io/badge/Markdown_Cells-0-083fa1?style=flat-square)
![Raw Cells](https://img.shields.io/badge/Raw_Cells-0-9ca3af?style=flat-square)
![Executed Cells](https://img.shields.io/badge/Executed_Cells-0-16a34a?style=flat-square)
![Cell Outputs](https://img.shields.io/badge/Cell_Outputs-0-059669?style=flat-square)
![Notebook Code Lines](https://img.shields.io/badge/Notebook_Code_Lines-0-4b8bbe?style=flat-square)
![Notebook Classes](https://img.shields.io/badge/Notebook_Classes-0-7c3aed?style=flat-square)
![Notebook Functions](https://img.shields.io/badge/Notebook_Functions-0-22c55e?style=flat-square)
![Notebook Imports](https://img.shields.io/badge/Notebook_Imports-0-0284c7?style=flat-square)
![Notebook Decorators](https://img.shields.io/badge/Notebook_Decorators-0-db2777?style=flat-square)
![Notebook Prose Lines](https://img.shields.io/badge/Notebook_Prose_Lines-0-1f6feb?style=flat-square)
![Notebook Headings](https://img.shields.io/badge/Notebook_Headings-0-a78bfa?style=flat-square)
![Notebook Links](https://img.shields.io/badge/Notebook_Links-0-10b981?style=flat-square)
![Notebook Images](https://img.shields.io/badge/Notebook_Images-0-34d399?style=flat-square)
![Notebook Code Blocks](https://img.shields.io/badge/Notebook_Code_Blocks-0-dc2626?style=flat-square)
![Notebook Properties](https://img.shields.io/badge/Notebook_Properties-0-ca8a04?style=flat-square)
![Notebook Nodes](https://img.shields.io/badge/Notebook_Nodes-0-a16207?style=flat-square)
![Notebook Max Depth](https://img.shields.io/badge/Notebook_Max_Depth-0-ea580c?style=flat-square)

### Markdown

![Markdown Files](https://img.shields.io/badge/Markdown_Files-1-083fa1?style=flat-square)
![Markdown Lines](https://img.shields.io/badge/Markdown_Lines-295-1f6feb?style=flat-square)
![H1](https://img.shields.io/badge/H1-1-7c3aed?style=flat-square)
![H2](https://img.shields.io/badge/H2-7-8b5cf6?style=flat-square)
![H3](https://img.shields.io/badge/H3-14-a78bfa?style=flat-square)
![H4](https://img.shields.io/badge/H4-0-c4b5fd?style=flat-square)
![H5](https://img.shields.io/badge/H5-0-ddd6fe?style=flat-square)
![H6](https://img.shields.io/badge/H6-0-ede9fe?style=flat-square)
![Paragraphs](https://img.shields.io/badge/Paragraphs-58-64748b?style=flat-square)
![Lists](https://img.shields.io/badge/Lists-6-16a34a?style=flat-square)
![List Items](https://img.shields.io/badge/List_Items-36-22c55e?style=flat-square)
![Task List Items](https://img.shields.io/badge/Task_List_Items-0-4ade80?style=flat-square)
![Tables](https://img.shields.io/badge/Tables-2-0284c7?style=flat-square)
![Table Rows](https://img.shields.io/badge/Table_Rows-10-0ea5e9?style=flat-square)
![Links](https://img.shields.io/badge/Links-12-059669?style=flat-square)
![Images](https://img.shields.io/badge/Images-0-10b981?style=flat-square)
![Code Blocks](https://img.shields.io/badge/Code_Blocks-16-dc2626?style=flat-square)
![Inline Code](https://img.shields.io/badge/Inline_Code-89-ef4444?style=flat-square)
![Block Quotes](https://img.shields.io/badge/Block_Quotes-0-ca8a04?style=flat-square)
![Thematic Breaks](https://img.shields.io/badge/Thematic_Breaks-0-a16207?style=flat-square)
<!-- codometer:end -->
