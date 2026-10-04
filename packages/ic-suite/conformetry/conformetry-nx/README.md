# 👔 Conformetry Nx

The Nx host for [Conformetry](https://github.com/Organizzolini/codebase/tree/main/packages/ic-suite/conformetry/conformetry-cli#readme).
Canonical documentation for command behavior, configuration, template syntax, scoring, and validators is in the
[@conformetry/cli README](https://github.com/Organizzolini/codebase/tree/main/packages/ic-suite/conformetry/conformetry-cli#readme).
This package adds two things the standalone CLI cannot offer: generators addressed by name through `nx g`,
and a cached validation target inferred onto every project that holds
instances.

```bash
npm install --save-dev @conformetry/nx
```

## Setup

Register the plugin in `nx.json` and wire the bootstrap into `postinstall`:

```json
{
  "plugins": [
    {
      "plugin": "@conformetry/nx",
      "options": {
        "configurationPath": "configuration/conformetry.config.ts",
        "validateTargetName": "conformetry-validate"
      }
    }
  ],
  "sync": { "globalGenerators": ["@conformetry/nx:sync"] }
}
```

```json
{ "scripts": { "postinstall": "conformetry-nx-bootstrap" } }
```

Then type your configuration as `ConformetryNxConfiguration` rather than
`ConformetryConfiguration`, so instance groups are checked against what Nx can
actually resolve:

```ts
import { type ConformetryNxConfiguration } from "@conformetry/nx";
```

## The emitted plugin

Which generators a workspace has is a property of its conformetry
configuration, so the plugin exposing them is **emitted rather than written**.
`conformetry-nx-bootstrap` derives it from your configuration, writes it to
`.conformetry/nx-generators` (gitignore that directory — it is a build
artifact), and links it into the root `node_modules` so
`nx g conformetry:<generator>` resolves. The link is what makes the plugin
addressable, since Nx resolves a generator's package prefix by requiring it by
name rather than by matching an Nx project.

| Default | Value |
| ------- | ----- |
| Output path | `.conformetry/nx-generators` |
| Package name | `conformetry` — so generators are `nx g conformetry:<name>` |

The bootstrap warns rather than exiting non-zero when the configuration cannot
be read, so a configuration mid-edit never blocks an unrelated install. Drift
is caught where it matters instead: every conformetry command compares the
emitted plugin against the configuration and refuses to run against a stale
one.

`@conformetry/nx` deliberately declares no generators of its own beyond `sync`.
`nx g @conformetry/nx:anything` resolves nothing by design — which generators
exist is a property of your configuration, not of this package.

## Generating

```bash
nx g conformetry:nestjs-service-module --name=billing --project=lexico
```

Nx prompts for missing inputs from the generator's own schema and writes
through its virtual `Tree`, so `--dry-run` works and the workspace formatter
runs over the result.

## Validating

The plugin infers a `conformetry-validate` target onto every project holding
instances, so validation is cached and participates in `nx affected`:

```bash
nx run <project>:conformetry-validate
nx run-many --target=conformetry-validate --all
nx affected --target=conformetry-validate --base=main
```

| Executor option | Purpose |
| --------------- | ------- |
| `configurationPath` | Configuration file, workspace-root relative |
| `languages` | Restrict the run to named validators; all run when omitted |

## Tag-scoped instances

The Nx host reads an instance group's `tags` as project tags, and resolves that
group's globs _inside_ each matching project — so where a generator belongs is
stated exactly once:

```ts
instances: [{ patterns: ["src/modules/*"], tags: ["framework:nestjs"] }];
```

A project must carry **every** tag a group names, so a second tag narrows the
group further — `tags: ["framework:nestjs", "language:graphql"]` reaches only
NestJS projects that are also GraphQL.

The two group forms are told apart by `tags` alone. There is no second field
that could disagree with it: a separate scope that excluded a project the globs
reached narrowed validation silently, and validation cannot notice instances
it was never offered.

Omitting `patterns` selects the projects without locating anything in them,
which is what a template with no instances yet wants — `nx g` is still confined
to the projects the template suits.

## Exports

`runConformetryGenerator` for generator wrappers, `bootstrapPlugin` and
`runBootstrapCli` for the bootstrap, the `ConformetryNxConfiguration` and
instance-group types, and the NestJS services behind them (`PluginService`,
`AdapterService`, `InstancesService`, `ScopeService`, `OptionsService`).

## Test

```bash
nx run conformetry-nx:vitest
```

## License

MIT — see [LICENSE](../../../../LICENSE).

## 👔 Conformetry

This project was generated from the [nestjs-service-project](../../../../configuration/conformetry-templates/nestjs-service-project) conformetry template.

<!-- callidescope:start -->

## 🔭 Callidescope

Call stacks traced through `packages/ic-suite/conformetry/conformetry-nx`, deepest first. Each frame shows what it takes, what it returns, and what its documentation says.

| Measure | Value |
| --- | --- |
| Callables | 114 |
| Files | 46 |
| Calls traced | 137 |
| Call stacks | 8 |
| Deepest stack | 15 |
| Stacks through recursion | 0 |
| Unfollowable calls | 1 |

### Limits

What this project is judged against, as declared in its own `callidescope.config.ts`.

| Limit | Value |
| --- | --- |
| `maximumDepth` | 15 |
| `maximumBreadth` | 9 |

### Call stacks (depth)

**1. `validateExecutor`** — depth ≥ 15 · orphan-root

```text
🚀 validateExecutor(…): Promise<{ success: boolean; }> [packages/ic-suite/conformetry/conformetry-nx/src/executors/validate/executor.ts:16]
   ↳ Validates one project's instances against their conformetry templates.
  └─> PluginService.runValidation(args: RunValidationArguments): Promise<RunValidationResult> [packages/ic-suite/conformetry/conformetry-nx/src/modules/plugin/plugin.service.ts:391]
     ↳ Validates one project's instances and renders the report.
    └─> ValidationService.validate(args: RunValidationArguments): RunValidationResult [packages/ic-suite/conformetry/conformetry-validation/src/modules/validation/validation.service.ts:136]
       ↳ Validates every instance and returns the differences found.
      └─> ConfigurationService.matchInstances(…): ResolvedInstances [packages/ic-suite/conformetry/conformetry-configuration/src/modules/configuration/configuration.service.ts:263]
         ↳ Resolves every instance to the template, or templates, that explain it.
        └─> InstanceDiscoveryService.matchInstances(…): ResolvedInstances [packages/ic-suite/conformetry/conformetry-configuration/src/modules/instance-discovery/instance-discovery.service.ts:95]
           ↳ Resolves every instance to the template, or templates, that explain it.
          └─> InstanceDiscoveryMatchingService.matchInstances(…): ResolvedInstances [packages/ic-suite/conformetry/conformetry-configuration/src/modules/instance-discovery/instance-discovery-matching.service.ts:93]
             ↳ Resolves every instance to the template — or templates — that explain it.
            └─> InstanceDiscoveryMatchingService.matchTemplates(…): TemplateMatch[] [packages/ic-suite/conformetry/conformetry-configuration/src/modules/instance-discovery/instance-discovery-matching.service.ts:154]
               ↳ Weighs every template that shares at least one file with the instance, best-first.
              └─> InstanceDiscoveryMatchingService.map(…)(…): { matchedFileCount: number; matchRatio: number; template: TemplateDefinition; } [packages/ic-suite/conformetry/conformetry-configuration/src/modules/instance-discovery/instance-discovery-matching.service.ts:160]
                └─> TemplateDiscoveryService.countMatchingFiles(…): number [packages/ic-suite/conformetry/conformetry-configuration/src/modules/template-discovery/template-discovery.service.ts:121]
                   ↳ Counts how many of a template's files the instance path already has.
                  └─> TemplateDiscoveryService.filter(…)(templateFilePath: string): boolean [packages/ic-suite/conformetry/conformetry-configuration/src/modules/template-discovery/template-discovery.service.ts:130]
                    └─> TemplateDiscoveryService.resolveInstanceFilePath(…): string [packages/ic-suite/conformetry/conformetry-configuration/src/modules/template-discovery/template-discovery.service.ts:179]
                       ↳ Maps a template file path to the instance file path it governs.
                      └─> RenderingService.renderPath(…): string [packages/ic-suite/conformetry/conformetry-configuration/src/modules/rendering/rendering.service.ts:142]
                         ↳ Renders a template path with mustache, the same way contents are rendered.
                        └─> RenderingService.assertEverySubstitutionSupplied(…): void [packages/ic-suite/conformetry/conformetry-configuration/src/modules/rendering/rendering.service.ts:35]
                           ↳ Refuses to render a template asking for a value nobody supplied.
                          └─> RenderingService.collectInterpolatedNames(template: string): string[] [packages/ic-suite/conformetry/conformetry-configuration/src/modules/rendering/rendering.service.ts:61]
                             ↳ Every placeholder a template interpolates, deduplicated.
                            └─> RenderingService.walk(spans: TemplateSpans): void [packages/ic-suite/conformetry/conformetry-configuration/src/modules/rendering/rendering.service.ts:63]
```

**2. `runConformetryGenerator`** — depth ≥ 14 · exported-function

```text
🚀 runConformetryGenerator(…): Promise<string[]> [packages/ic-suite/conformetry/conformetry-nx/src/index.ts:93]
   ↳ Runs one configured generator against an Nx tree.
  └─> PluginService.runGenerator(args: RunGeneratorArguments): Promise<string[]> [packages/ic-suite/conformetry/conformetry-nx/src/modules/plugin/plugin.service.ts:330]
     ↳ Runs one configured generator against an Nx tree.
    └─> PluginService.assertPluginInSync(args: { configurationPath: string; workspaceRoot: string; }): Promise<void> [packages/ic-suite/conformetry/conformetry-nx/src/modules/plugin/plugin.service.ts:118]
       ↳ Fails fast when the plugin would run against a stale or broken setup.
      └─> PluginService.assertEmittedPluginCurrent(args: { configurationPath: string; workspaceRoot: string; }): Promise<void> [packages/ic-suite/conformetry/conformetry-nx/src/modules/plugin/plugin.service.ts:84]
         ↳ Fails when the emitted Nx plugin no longer matches the configuration. `generators.json` and its schemas are derived…
        └─> GeneratorService.emitPlugin(args: EmitPluginArguments): Promise<EmittedFile[]> [packages/ic-suite/conformetry/conformetry-nx/src/modules/generator/generator.service.ts:212]
           ↳ Returns every file the consumer's generator plugin consists of.
          └─> GeneratorService.map(…)(…): { content: string; filePath: string; } [packages/ic-suite/conformetry/conformetry-nx/src/modules/generator/generator.service.ts:238]
            └─> GeneratorService.resolveScopedProjectNames(…): string[] | undefined [packages/ic-suite/conformetry/conformetry-nx/src/modules/generator/generator.service.ts:180]
               ↳ The projects a generator's tagged groups admit, or nothing when it has none.
              └─> ScopeService.resolveScopedProjectNames(…): string[] [packages/ic-suite/conformetry/conformetry-nx/src/modules/scope/scope.service.ts:134]
                 ↳ The projects a generator's groups admit, by name and sorted.
                └─> ScopeService.filter(…)(project: ProjectScope): boolean [packages/ic-suite/conformetry/conformetry-nx/src/modules/scope/scope.service.ts:147]
                  └─> ScopeService.some(…)(group: ConformetryInstanceGroup): boolean [packages/ic-suite/conformetry/conformetry-nx/src/modules/scope/scope.service.ts:148]
                    └─> ScopeService.matchesProject(args: { group: ConformetryInstanceGroup; project: ProjectScope; }): boolean [packages/ic-suite/conformetry/conformetry-nx/src/modules/scope/scope.service.ts:52]
                       ↳ Returns whether a group applies to a project.
                      └─> ScopeService.isProjectGroup(group: ConformetryInstanceGroup): boolean [packages/ic-suite/conformetry/conformetry-nx/src/modules/scope/scope.service.ts:39]
                         ↳ Whether a group locates its instances by project tag.
                        └─> ConfigurationService.isProjectScoped(group: ConformetryInstanceGroup): boolean [packages/ic-suite/conformetry/conformetry-configuration/src/modules/configuration/configuration.service.ts:232]
                           ↳ Whether a group locates its instances inside the hosts its tags select.
                          └─> InstanceGroupService.isProjectScoped(group: ConformetryInstanceGroup): boolean [packages/ic-suite/conformetry/conformetry-configuration/src/modules/instance-group/instance-group.service.ts:42]
                             ↳ Whether a group locates its instances inside the hosts its tags select.
```

**3. `runBootstrapCli`** — depth ≥ 12 · orphan-root

```text
🚀 runBootstrapCli(workspaceRoot: string): Promise<void> [packages/ic-suite/conformetry/conformetry-nx/src/modules/generator/bootstrap.utilities.ts:74]
   ↳ Bootstraps the plugin, warning rather than failing the install.
  └─> bootstrapPlugin(workspaceRoot: string): Promise<EmittedFile[]> [packages/ic-suite/conformetry/conformetry-nx/src/modules/generator/bootstrap.utilities.ts:39]
     ↳ Emits the generator plugin and puts it where Nx will find it.
    └─> GeneratorService.emitPlugin(args: EmitPluginArguments): Promise<EmittedFile[]> [packages/ic-suite/conformetry/conformetry-nx/src/modules/generator/generator.service.ts:212]
       ↳ Returns every file the consumer's generator plugin consists of.
      └─> GeneratorService.map(…)(…): { content: string; filePath: string; } [packages/ic-suite/conformetry/conformetry-nx/src/modules/generator/generator.service.ts:238]
        └─> GeneratorService.resolveScopedProjectNames(…): string[] | undefined [packages/ic-suite/conformetry/conformetry-nx/src/modules/generator/generator.service.ts:180]
           ↳ The projects a generator's tagged groups admit, or nothing when it has none.
          └─> ScopeService.resolveScopedProjectNames(…): string[] [packages/ic-suite/conformetry/conformetry-nx/src/modules/scope/scope.service.ts:134]
             ↳ The projects a generator's groups admit, by name and sorted.
            └─> ScopeService.filter(…)(project: ProjectScope): boolean [packages/ic-suite/conformetry/conformetry-nx/src/modules/scope/scope.service.ts:147]
              └─> ScopeService.some(…)(group: ConformetryInstanceGroup): boolean [packages/ic-suite/conformetry/conformetry-nx/src/modules/scope/scope.service.ts:148]
                └─> ScopeService.matchesProject(args: { group: ConformetryInstanceGroup; project: ProjectScope; }): boolean [packages/ic-suite/conformetry/conformetry-nx/src/modules/scope/scope.service.ts:52]
                   ↳ Returns whether a group applies to a project.
                  └─> ScopeService.isProjectGroup(group: ConformetryInstanceGroup): boolean [packages/ic-suite/conformetry/conformetry-nx/src/modules/scope/scope.service.ts:39]
                     ↳ Whether a group locates its instances by project tag.
                    └─> ConfigurationService.isProjectScoped(group: ConformetryInstanceGroup): boolean [packages/ic-suite/conformetry/conformetry-configuration/src/modules/configuration/configuration.service.ts:232]
                       ↳ Whether a group locates its instances inside the hosts its tags select.
                      └─> InstanceGroupService.isProjectScoped(group: ConformetryInstanceGroup): boolean [packages/ic-suite/conformetry/conformetry-configuration/src/modules/instance-group/instance-group.service.ts:42]
                         ↳ Whether a group locates its instances inside the hosts its tags select.
```

<details>
<summary>5 more call stacks</summary>

**4. `syncGenerator`** — depth ≥ 11 · orphan-root

```text
🚀 syncGenerator(…): Promise<{ outOfSyncMessage: string; }> [packages/ic-suite/conformetry/conformetry-nx/src/generators/sync/generator.ts:26]
   ↳ Regenerates the workspace's conformetry generator plugin.
  └─> GeneratorService.emitPlugin(args: EmitPluginArguments): Promise<EmittedFile[]> [packages/ic-suite/conformetry/conformetry-nx/src/modules/generator/generator.service.ts:212]
     ↳ Returns every file the consumer's generator plugin consists of.
    └─> GeneratorService.map(…)(…): { content: string; filePath: string; } [packages/ic-suite/conformetry/conformetry-nx/src/modules/generator/generator.service.ts:238]
      └─> GeneratorService.resolveScopedProjectNames(…): string[] | undefined [packages/ic-suite/conformetry/conformetry-nx/src/modules/generator/generator.service.ts:180]
         ↳ The projects a generator's tagged groups admit, or nothing when it has none.
        └─> ScopeService.resolveScopedProjectNames(…): string[] [packages/ic-suite/conformetry/conformetry-nx/src/modules/scope/scope.service.ts:134]
           ↳ The projects a generator's groups admit, by name and sorted.
          └─> ScopeService.filter(…)(project: ProjectScope): boolean [packages/ic-suite/conformetry/conformetry-nx/src/modules/scope/scope.service.ts:147]
            └─> ScopeService.some(…)(group: ConformetryInstanceGroup): boolean [packages/ic-suite/conformetry/conformetry-nx/src/modules/scope/scope.service.ts:148]
              └─> ScopeService.matchesProject(args: { group: ConformetryInstanceGroup; project: ProjectScope; }): boolean [packages/ic-suite/conformetry/conformetry-nx/src/modules/scope/scope.service.ts:52]
                 ↳ Returns whether a group applies to a project.
                └─> ScopeService.isProjectGroup(group: ConformetryInstanceGroup): boolean [packages/ic-suite/conformetry/conformetry-nx/src/modules/scope/scope.service.ts:39]
                   ↳ Whether a group locates its instances by project tag.
                  └─> ConfigurationService.isProjectScoped(group: ConformetryInstanceGroup): boolean [packages/ic-suite/conformetry/conformetry-configuration/src/modules/configuration/configuration.service.ts:232]
                     ↳ Whether a group locates its instances inside the hosts its tags select.
                    └─> InstanceGroupService.isProjectScoped(group: ConformetryInstanceGroup): boolean [packages/ic-suite/conformetry/conformetry-configuration/src/modules/instance-group/instance-group.service.ts:42]
                       ↳ Whether a group locates its instances inside the hosts its tags select.
```

**5. `anonymous`** — depth ≥ 9 · orphan-root

```text
🚀 anonymous(…): Promise<CreateNodesResultArray> [packages/ic-suite/conformetry/conformetry-nx/src/index.ts:49]
  └─> PluginService.inferTargets(args: InferTargetsArguments): Promise<Map<string, InferredTargets>> [packages/ic-suite/conformetry/conformetry-nx/src/modules/plugin/plugin.service.ts:265]
     ↳ Infers a validation target onto every project that holds at least one instance.
    └─> InstancesService.findProjectInstances(args: FindProjectInstancesArguments): Promise<Instance[]> [packages/ic-suite/conformetry/conformetry-nx/src/modules/instances/instances.service.ts:68]
       ↳ Expands every instance group that applies to a project, keeping only the instances that live inside it.
      └─> InstancesService.flatMap(…)(this: undefined, group: ConformetryInstanceGroup): Instance[] [packages/ic-suite/conformetry/conformetry-nx/src/modules/instances/instances.service.ts:84]
        └─> ConfigurationService.findInstances(args: FindInstancesArguments): Instance[] [packages/ic-suite/conformetry/conformetry-configuration/src/modules/configuration/configuration.service.ts:222]
           ↳ Expands instance globs into the instances that exist.
          └─> InstanceDiscoveryService.findInstances(args: FindInstancesArguments): Instance[] [packages/ic-suite/conformetry/conformetry-configuration/src/modules/instance-discovery/instance-discovery.service.ts:90]
             ↳ Expands instance globs into the instances that exist.
            └─> InstanceDiscoveryLocatingService.findInstances(args: FindInstancesArguments): Instance[] [packages/ic-suite/conformetry/conformetry-configuration/src/modules/instance-discovery/instance-discovery-locating.service.ts:121]
               ↳ Expands every pattern and returns one instance per distinct path, name, and scope kind.
              └─> InstanceDiscoveryLocatingService.resolveGlobSuffix(pattern: string): string [packages/ic-suite/conformetry/conformetry-configuration/src/modules/instance-discovery/instance-discovery-locating.service.ts:73]
                 ↳ Returns the literal filename suffix a pattern ends with, such as `.service.ts` for `**\/*.service.ts`, or `""` when the…
                └─> InstanceDiscoveryLocatingService.map(…)(character: string): number [packages/ic-suite/conformetry/conformetry-configuration/src/modules/instance-discovery/instance-discovery-locating.service.ts:76]
```

**6. `AdapterService.listDirectory`** — depth 3 · orphan-root

```text
🚀 AdapterService.listDirectory(directoryPath: string): Promise<DirectoryEntry[]> [packages/ic-suite/conformetry/conformetry-nx/src/modules/adapter/adapter.service.ts:114]
  └─> AdapterService.listDirectory(…): Promise<DirectoryEntry[]> [packages/ic-suite/conformetry/conformetry-nx/src/modules/adapter/adapter.service.ts:42]
     ↳ Lists a directory through the tree when it is inside the workspace, and through the filesystem otherwise.
    └─> AdapterService.resolveTreePath(args: { directoryPath: string; workspaceRoot: string; }): string | undefined [packages/ic-suite/conformetry/conformetry-nx/src/modules/adapter/adapter.service.ts:89]
       ↳ Converts an absolute path to the workspace-relative form a `Tree` uses, or returns `undefined` when the path lies…
```

**7. `AdapterService.readFile`** — depth 3 · orphan-root

```text
🚀 AdapterService.readFile(filePath: string): Promise<string> [packages/ic-suite/conformetry/conformetry-nx/src/modules/adapter/adapter.service.ts:124]
  └─> AdapterService.readFile(…): Promise<string> [packages/ic-suite/conformetry/conformetry-nx/src/modules/adapter/adapter.service.ts:68]
     ↳ Reads a file through the tree when possible, the filesystem otherwise.
    └─> AdapterService.resolveTreePath(args: { directoryPath: string; workspaceRoot: string; }): string | undefined [packages/ic-suite/conformetry/conformetry-nx/src/modules/adapter/adapter.service.ts:89]
       ↳ Converts an absolute path to the workspace-relative form a `Tree` uses, or returns `undefined` when the path lies…
```

**8. `AdapterService.writeFile`** — depth 2 · orphan-root

```text
🚀 AdapterService.writeFile(filePath: string, content: string): Promise<void> [packages/ic-suite/conformetry/conformetry-nx/src/modules/adapter/adapter.service.ts:131]
  └─> AdapterService.resolveTreePath(args: { directoryPath: string; workspaceRoot: string; }): string | undefined [packages/ic-suite/conformetry/conformetry-nx/src/modules/adapter/adapter.service.ts:89]
     ↳ Converts an absolute path to the workspace-relative form a `Tree` uses, or returns `undefined` when the path lies…
```

</details>

### Breadth

| Callable | Breadth | Calls directly | Location |
| --- | --- | --- | --- |
| `PluginService.runGenerator` | 9 | `PluginService.resolveOptions`, `PluginService.assertPluginInSync`, `ConfigurationService.loadConformetryConfiguration`, `PluginService.find(…)`, `PluginService.map(…)`, `AdapterService.createAdapters`, `OptionsService.resolveGeneratorInputs`, `GenerationService.runGenerator`, `PathsService.resolveGenerationPath` | `packages/ic-suite/conformetry/conformetry-nx/src/modules/plugin/plugin.service.ts:330` |
| `bootstrapPlugin` | 9 | `resolveGeneratorService`, `resolveOptionsService`, `resolveProjectsService`, `GeneratorService.emitPlugin`, `OptionsService.resolveConfigurationPath`, `readNxConfiguration`, `ProjectsService.listWorkspaceProjects`, `writePlugin`, `linkPlugin` | `packages/ic-suite/conformetry/conformetry-nx/src/modules/generator/bootstrap.utilities.ts:39` |
| `syncGenerator` | 7 | `resolveGeneratorService`, `resolveOptionsService`, `resolveProjectsService`, `GeneratorService.emitPlugin`, `OptionsService.resolveConfigurationPath`, `readNxConfiguration`, `ProjectsService.listWorkspaceProjects` | `packages/ic-suite/conformetry/conformetry-nx/src/generators/sync/generator.ts:26` |

<details>
<summary>55 more callables</summary>

| Callable | Breadth | Calls directly | Location |
| --- | --- | --- | --- |
| `GeneratorService.emitPlugin` | 6 | `ConfigurationService.loadConformetryConfiguration`, `GeneratorService.toSorted(…)`, `GeneratorService.buildGeneratorsManifest`, `GeneratorService.map(…)`, `GeneratorService.map(…)`, `GeneratorService.stringify` | `packages/ic-suite/conformetry/conformetry-nx/src/modules/generator/generator.service.ts:212` |
| `InstancesService.findProjectInstances` | 6 | `ConfigurationService.loadConformetryConfiguration`, `InstancesService.filter(…)`, `InstancesService.flatMap(…)`, `InstancesService.flatMap(…)`, `InstancesService.flatMap(…)`, `InstancesService.filter(…)` | `packages/ic-suite/conformetry/conformetry-nx/src/modules/instances/instances.service.ts:68` |
| `PluginService.runValidation` | 6 | `PluginService.resolveOptions`, `PluginService.assertPluginInSync`, `ValidationService.validate`, `InstancesService.findProjectInstances`, `PluginService.resolveTemplates`, `ReportingService.formatReport` | `packages/ic-suite/conformetry/conformetry-nx/src/modules/plugin/plugin.service.ts:391` |
| `PathsService.resolveGenerationPath` | 5 | `PathsService.resolveNewProjectPath`, `InstancesService.findProjectInstances`, `PathsService.requireModulePath`, `PathsService.resolveScopedDirectory`, `PathsService.resolveModuleParentPath` | `packages/ic-suite/conformetry/conformetry-nx/src/modules/paths/paths.service.ts:213` |
| `PluginService.inferTargets` | 5 | `PluginService.resolveOptions`, `PluginService.resolveTemplateInputs`, `PluginService.filter(…)`, `ProjectsService.readProjectScope`, `InstancesService.findProjectInstances` | `packages/ic-suite/conformetry/conformetry-nx/src/modules/plugin/plugin.service.ts:265` |
| `ScopeService.resolveScopedProjectNames` | 4 | `ScopeService.filter(…)`, `ScopeService.toSorted(…)`, `ScopeService.map(…)`, `ScopeService.filter(…)` | `packages/ic-suite/conformetry/conformetry-nx/src/modules/scope/scope.service.ts:134` |
| `ProjectsService.listWorkspaceProjects` | 4 | `ProjectsService.toSorted(…)`, `ProjectsService.map(…)`, `ProjectsService.listProjectConfigurationFiles`, `ProjectsService.readIgnoredPaths` | `packages/ic-suite/conformetry/conformetry-nx/src/modules/projects/projects.service.ts:118` |
| `anonymous` | 4 | `resolvePluginService`, `PluginService.inferTargets`, `filter(…)`, `map(…)` | `packages/ic-suite/conformetry/conformetry-nx/src/index.ts:49` |
| `ScopeService.resolveGroup` | 3 | `ScopeService.matchesProject`, `ScopeService.isProjectGroup`, `ScopeService.map(…)` | `packages/ic-suite/conformetry/conformetry-nx/src/modules/scope/scope.service.ts:74` |
| `AdapterService.listDirectory` | 3 | `AdapterService.resolveTreePath`, `AdapterService.map(…)`, `AdapterService.map(…)` | `packages/ic-suite/conformetry/conformetry-nx/src/modules/adapter/adapter.service.ts:42` |
| `PathsService.resolveScopedDirectory` | 3 | `ConfigurationService.loadConformetryConfiguration`, `PathsService.find(…)`, `ScopeService.resolveScopedDirectory` | `packages/ic-suite/conformetry/conformetry-nx/src/modules/paths/paths.service.ts:160` |
| `PluginService.resolveOptions` | 3 | `OptionsService.resolveConfigurationPath`, `PluginService.readNxConfiguration`, `OptionsService.resolvePluginOptions` | `packages/ic-suite/conformetry/conformetry-nx/src/modules/plugin/plugin.service.ts:189` |
| `PluginService.resolveTemplateInputs` | 3 | `ConfigurationService.loadConformetryConfiguration`, `PluginService.map(…)`, `PluginService.map(…)` | `packages/ic-suite/conformetry/conformetry-nx/src/modules/plugin/plugin.service.ts:219` |
| `ScopeService.matchesProject` | 2 | `ScopeService.isProjectGroup`, `ScopeService.some(…)` | `packages/ic-suite/conformetry/conformetry-nx/src/modules/scope/scope.service.ts:52` |
| `ScopeService.resolveScopedDirectory` | 2 | `ScopeService.find(…)`, `ScopeService.findIndex(…)` | `packages/ic-suite/conformetry/conformetry-nx/src/modules/scope/scope.service.ts:108` |
| `GeneratorService.buildSchema` | 2 | `GeneratorService.stringify`, `GeneratorService.buildSchemaProperties` | `packages/ic-suite/conformetry/conformetry-nx/src/modules/generator/generator.service.ts:122` |
| `GeneratorService.map(…)` | 2 | `GeneratorService.buildSchema`, `GeneratorService.resolveScopedProjectNames` | `packages/ic-suite/conformetry/conformetry-nx/src/modules/generator/generator.service.ts:238` |
| `OptionsService.readRegisteredConfigurationPath` | 2 | `OptionsService.isUnknownArray`, `OptionsService.readString` | `packages/ic-suite/conformetry/conformetry-nx/src/modules/options/options.service.ts:38` |
| `OptionsService.resolveConfigurationPath` | 2 | `OptionsService.readRegisteredConfigurationPath`, `OptionsService.find(…)` | `packages/ic-suite/conformetry/conformetry-nx/src/modules/options/options.service.ts:98` |
| `ProjectsService.readIgnoredPaths` | 2 | `ProjectsService.filter(…)`, `ProjectsService.map(…)` | `packages/ic-suite/conformetry/conformetry-nx/src/modules/projects/projects.service.ts:97` |
| `ProjectsService.readProjectScope` | 2 | `ProjectsService.isUnknownArray`, `ProjectsService.filter(…)` | `packages/ic-suite/conformetry/conformetry-nx/src/modules/projects/projects.service.ts:134` |
| `PluginService.assertEmittedPluginCurrent` | 2 | `GeneratorService.emitPlugin`, `ProjectsService.listWorkspaceProjects` | `packages/ic-suite/conformetry/conformetry-nx/src/modules/plugin/plugin.service.ts:84` |
| `PluginService.assertPluginInSync` | 2 | `PluginService.assertTemplatesExist`, `PluginService.assertEmittedPluginCurrent` | `packages/ic-suite/conformetry/conformetry-nx/src/modules/plugin/plugin.service.ts:118` |
| `PluginService.resolveTemplates` | 2 | `ConfigurationService.loadConformetryConfiguration`, `PluginService.map(…)` | `packages/ic-suite/conformetry/conformetry-nx/src/modules/plugin/plugin.service.ts:236` |
| `runConformetryGenerator` | 2 | `resolvePluginService`, `PluginService.runGenerator` | `packages/ic-suite/conformetry/conformetry-nx/src/index.ts:93` |
| `validateExecutor` | 2 | `resolvePluginService`, `PluginService.runValidation` | `packages/ic-suite/conformetry/conformetry-nx/src/executors/validate/executor.ts:16` |
| `ScopeService.isProjectGroup` | 1 | `ConfigurationService.isProjectScoped` | `packages/ic-suite/conformetry/conformetry-nx/src/modules/scope/scope.service.ts:39` |
| `ScopeService.find(…)` | 1 | `ScopeService.isProjectGroup` | `packages/ic-suite/conformetry/conformetry-nx/src/modules/scope/scope.service.ts:111` |
| `ScopeService.filter(…)` | 1 | `ScopeService.isProjectGroup` | `packages/ic-suite/conformetry/conformetry-nx/src/modules/scope/scope.service.ts:138` |
| `ScopeService.filter(…)` | 1 | `ScopeService.some(…)` | `packages/ic-suite/conformetry/conformetry-nx/src/modules/scope/scope.service.ts:147` |
| `ScopeService.some(…)` | 1 | `ScopeService.matchesProject` | `packages/ic-suite/conformetry/conformetry-nx/src/modules/scope/scope.service.ts:148` |
| `GeneratorService.buildGeneratorsManifest` | 1 | `GeneratorService.stringify` | `packages/ic-suite/conformetry/conformetry-nx/src/modules/generator/generator.service.ts:86` |
| `GeneratorService.resolveScopedProjectNames` | 1 | `ScopeService.resolveScopedProjectNames` | `packages/ic-suite/conformetry/conformetry-nx/src/modules/generator/generator.service.ts:180` |
| `GeneratorService.map(…)` | 1 | `GeneratorService.buildGeneratorModule` | `packages/ic-suite/conformetry/conformetry-nx/src/modules/generator/generator.service.ts:229` |
| `AdapterService.readFile` | 1 | `AdapterService.resolveTreePath` | `packages/ic-suite/conformetry/conformetry-nx/src/modules/adapter/adapter.service.ts:68` |
| `AdapterService.listDirectory` | 1 | `AdapterService.listDirectory` | `packages/ic-suite/conformetry/conformetry-nx/src/modules/adapter/adapter.service.ts:114` |
| `AdapterService.readFile` | 1 | `AdapterService.readFile` | `packages/ic-suite/conformetry/conformetry-nx/src/modules/adapter/adapter.service.ts:124` |
| `AdapterService.writeFile` | 1 | `AdapterService.resolveTreePath` | `packages/ic-suite/conformetry/conformetry-nx/src/modules/adapter/adapter.service.ts:131` |
| `InstancesService.flatMap(…)` | 1 | `ScopeService.resolveGroup` | `packages/ic-suite/conformetry/conformetry-nx/src/modules/instances/instances.service.ts:79` |
| `InstancesService.flatMap(…)` | 1 | `ConfigurationService.findInstances` | `packages/ic-suite/conformetry/conformetry-nx/src/modules/instances/instances.service.ts:84` |
| `InstancesService.filter(…)` | 1 | `InstancesService.isInsideProject` | `packages/ic-suite/conformetry/conformetry-nx/src/modules/instances/instances.service.ts:96` |
| `OptionsService.resolvePluginOptions` | 1 | `OptionsService.readString` | `packages/ic-suite/conformetry/conformetry-nx/src/modules/options/options.service.ts:147` |
| `PathsService.requireModulePath` | 1 | `PathsService.resolveModulePath` | `packages/ic-suite/conformetry/conformetry-nx/src/modules/paths/paths.service.ts:54` |
| `PathsService.resolveModuleParentPath` | 1 | `PathsService.toSorted(…)` | `packages/ic-suite/conformetry/conformetry-nx/src/modules/paths/paths.service.ts:83` |
| `PathsService.resolveModulePath` | 1 | `PathsService.find(…)` | `packages/ic-suite/conformetry/conformetry-nx/src/modules/paths/paths.service.ts:119` |
| `PathsService.resolveNewProjectPath` | 1 | `PathsService.resolveTypeDirectoryPath` | `packages/ic-suite/conformetry/conformetry-nx/src/modules/paths/paths.service.ts:137` |
| `ProjectsService.map(…)` | 1 | `ProjectsService.readProjectScope` | `packages/ic-suite/conformetry/conformetry-nx/src/modules/projects/projects.service.ts:124` |
| `PluginService.assertTemplatesExist` | 1 | `ConfigurationService.loadConformetryConfiguration` | `packages/ic-suite/conformetry/conformetry-nx/src/modules/plugin/plugin.service.ts:134` |
| `PluginService.map(…)` | 1 | `ConfigurationService.collectTemplate` | `packages/ic-suite/conformetry/conformetry-nx/src/modules/plugin/plugin.service.ts:245` |
| `resolveGeneratorService` | 1 | `resolvePluginContext` | `packages/ic-suite/conformetry/conformetry-nx/src/modules/plugin/plugin-context.utilities.ts:18` |
| `resolveOptionsService` | 1 | `resolvePluginContext` | `packages/ic-suite/conformetry/conformetry-nx/src/modules/plugin/plugin-context.utilities.ts:25` |
| `resolvePluginService` | 1 | `resolvePluginContext` | `packages/ic-suite/conformetry/conformetry-nx/src/modules/plugin/plugin-context.utilities.ts:32` |
| `resolveProjectsService` | 1 | `resolvePluginContext` | `packages/ic-suite/conformetry/conformetry-nx/src/modules/plugin/plugin-context.utilities.ts:39` |
| `runBootstrapCli` | 1 | `bootstrapPlugin` | `packages/ic-suite/conformetry/conformetry-nx/src/modules/generator/bootstrap.utilities.ts:74` |
| `linkPlugin` | 1 | `leadsTo` | `packages/ic-suite/conformetry/conformetry-nx/src/modules/generator/bootstrap.utilities.ts:116` |

</details>
<!-- callidescope:end -->

## 🕸️ Codependix

Dependency graphs exported by [codependix](https://github.com/Organizzolini/codebase/tree/main/packages/ic-suite/codependix/codependix-cli), regenerated by `nx run codebase:codependix:write`.

### Nx Neighborhood

<!-- codependix:start name="codependix-nx-projects" -->
```mermaid
graph LR
  conformetry_configuration["conformetry-configuration"]
  conformetry_examples["conformetry-examples"]
  conformetry_generation["conformetry-generation"]
  conformetry_nx["conformetry-nx"]
  conformetry_output["conformetry-output"]
  conformetry_validation["conformetry-validation"]
  logger["logger"]
  conformetry_examples --> conformetry_nx
  conformetry_nx --> conformetry_configuration
  conformetry_nx --> conformetry_generation
  conformetry_nx --> conformetry_output
  conformetry_nx --> conformetry_validation
  conformetry_nx --> logger
  classDef subject fill:#7c3aed,color:#fff,stroke:#4c1d95,stroke-width:2px
  class conformetry_nx subject
```
<!-- codependix:end name="codependix-nx-projects" -->

### NestJS Module Graph

<!-- codependix:start name="codependix-nestjs-modules" -->
```mermaid
flowchart LR
  AdapterModule
  ConfigurationModule
  DifferencesModule
  FilesModule
  GenerationModule
  GeneratorModule
  InputModule
  InstanceDiscoveryModule
  InstanceGroupModule
  InstancesModule
  JsonModule
  JupyterModule
  LanguagesModule
  LoggerModule([LoggerModule])
  MainModule
  MarkdownModule
  OptionsModule
  PathsModule
  PluginModule
  ProjectsModule
  PythonModule
  RenderingModule
  ReportingModule
  RunnerModule
  ScopeModule
  ScoringModule
  TemplateDiscoveryModule
  TextModule
  TypescriptModule
  ValidationModule
  ConfigurationModule --> InputModule
  ConfigurationModule --> InstanceDiscoveryModule
  ConfigurationModule --> InstanceGroupModule
  ConfigurationModule --> RenderingModule
  ConfigurationModule --> TemplateDiscoveryModule
  FilesModule --> ConfigurationModule
  FilesModule --> DifferencesModule
  GenerationModule --> ConfigurationModule
  GeneratorModule --> ConfigurationModule
  GeneratorModule --> ScopeModule
  InstanceDiscoveryModule --> InstanceGroupModule
  InstanceDiscoveryModule --> RenderingModule
  InstanceDiscoveryModule --> TemplateDiscoveryModule
  InstancesModule --> ConfigurationModule
  InstancesModule --> ScopeModule
  JsonModule --> ScoringModule
  JupyterModule --> JsonModule
  JupyterModule --> MarkdownModule
  JupyterModule --> PythonModule
  LanguagesModule --> JsonModule
  LanguagesModule --> JupyterModule
  LanguagesModule --> MarkdownModule
  LanguagesModule --> PythonModule
  LanguagesModule --> TextModule
  LanguagesModule --> TypescriptModule
  MainModule --> GeneratorModule
  MainModule --> PluginModule
  MarkdownModule --> ScoringModule
  PathsModule --> ConfigurationModule
  PathsModule --> InstancesModule
  PathsModule --> ScopeModule
  PluginModule --> AdapterModule
  PluginModule --> ConfigurationModule
  PluginModule --> GenerationModule
  PluginModule --> GeneratorModule
  PluginModule --> InstancesModule
  PluginModule --> OptionsModule
  PluginModule --> PathsModule
  PluginModule --> ProjectsModule
  PluginModule --> ReportingModule
  PluginModule --> ScopeModule
  PluginModule --> ValidationModule
  PythonModule --> DifferencesModule
  PythonModule --> ScoringModule
  ReportingModule --> ScoringModule
  ScopeModule --> ConfigurationModule
  TemplateDiscoveryModule --> RenderingModule
  TypescriptModule --> ScoringModule
  ValidationModule --> ConfigurationModule
  ValidationModule --> FilesModule
  ValidationModule --> LanguagesModule
  ValidationModule --> RunnerModule
  ValidationModule --> ScoringModule
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
  file_src_executors_validate_executor_ts["src/executors/validate/executor.ts"]
  file_src_executors_validate_executor_types_ts["src/executors/validate/executor.types.ts"]
  file_src_executors_validate_executor_unit_test_ts["src/executors/validate/executor.unit.test.ts"]
  file_src_generators_sync_generator_ts["src/generators/sync/generator.ts"]
  file_src_generators_sync_generator_types_ts["src/generators/sync/generator.types.ts"]
  file_src_generators_sync_generator_unit_test_ts["src/generators/sync/generator.unit.test.ts"]
  file_src_index_ts["src/index.ts"]
  file_src_index_unit_test_ts["src/index.unit.test.ts"]
  file_src_main_module_ts["src/main.module.ts"]
  file_src_modules_adapter_adapter_constants_ts["src/modules/adapter/adapter.constants.ts"]
  file_src_modules_adapter_adapter_module_ts["src/modules/adapter/adapter.module.ts"]
  file_src_modules_adapter_adapter_service_ts["src/modules/adapter/adapter.service.ts"]
  file_src_modules_adapter_adapter_service_unit_test_ts["src/modules/adapter/adapter.service.unit.test.ts"]
  file_src_modules_adapter_adapter_types_ts["src/modules/adapter/adapter.types.ts"]
  file_src_modules_generator_bootstrap_utilities_ts["src/modules/generator/bootstrap.utilities.ts"]
  file_src_modules_generator_bootstrap_utilities_unit_test_ts["src/modules/generator/bootstrap.utilities.unit.test.ts"]
  file_src_modules_generator_generator_constants_ts["src/modules/generator/generator.constants.ts"]
  file_src_modules_generator_generator_module_ts["src/modules/generator/generator.module.ts"]
  file_src_modules_generator_generator_service_ts["src/modules/generator/generator.service.ts"]
  file_src_modules_generator_generator_service_unit_test_ts["src/modules/generator/generator.service.unit.test.ts"]
  file_src_modules_generator_generator_types_ts["src/modules/generator/generator.types.ts"]
  file_src_modules_instances_instances_constants_ts["src/modules/instances/instances.constants.ts"]
  file_src_modules_instances_instances_module_ts["src/modules/instances/instances.module.ts"]
  file_src_modules_instances_instances_service_ts["src/modules/instances/instances.service.ts"]
  file_src_modules_instances_instances_service_unit_test_ts["src/modules/instances/instances.service.unit.test.ts"]
  file_src_modules_instances_instances_types_ts["src/modules/instances/instances.types.ts"]
  file_src_modules_options_options_constants_ts["src/modules/options/options.constants.ts"]
  file_src_modules_options_options_module_ts["src/modules/options/options.module.ts"]
  file_src_modules_options_options_service_ts["src/modules/options/options.service.ts"]
  file_src_modules_options_options_service_unit_test_ts["src/modules/options/options.service.unit.test.ts"]
  file_src_modules_options_options_types_ts["src/modules/options/options.types.ts"]
  file_src_modules_paths_paths_constants_ts["src/modules/paths/paths.constants.ts"]
  file_src_modules_paths_paths_module_ts["src/modules/paths/paths.module.ts"]
  file_src_modules_paths_paths_service_ts["src/modules/paths/paths.service.ts"]
  file_src_modules_paths_paths_service_unit_test_ts["src/modules/paths/paths.service.unit.test.ts"]
  file_src_modules_paths_paths_types_ts["src/modules/paths/paths.types.ts"]
  file_src_modules_plugin_plugin_context_utilities_ts["src/modules/plugin/plugin-context.utilities.ts"]
  file_src_modules_plugin_plugin_context_utilities_unit_test_ts["src/modules/plugin/plugin-context.utilities.unit.test.ts"]
  file_src_modules_plugin_plugin_constants_ts["src/modules/plugin/plugin.constants.ts"]
  file_src_modules_plugin_plugin_module_ts["src/modules/plugin/plugin.module.ts"]
  file_src_modules_plugin_plugin_service_ts["src/modules/plugin/plugin.service.ts"]
  file_src_modules_plugin_plugin_service_unit_test_ts["src/modules/plugin/plugin.service.unit.test.ts"]
  file_src_modules_plugin_plugin_types_ts["src/modules/plugin/plugin.types.ts"]
  file_src_modules_projects_projects_constants_ts["src/modules/projects/projects.constants.ts"]
  file_src_modules_projects_projects_module_ts["src/modules/projects/projects.module.ts"]
  file_src_modules_projects_projects_service_ts["src/modules/projects/projects.service.ts"]
  file_src_modules_projects_projects_service_unit_test_ts["src/modules/projects/projects.service.unit.test.ts"]
  file_src_modules_projects_projects_types_ts["src/modules/projects/projects.types.ts"]
  file_src_modules_scope_scope_constants_ts["src/modules/scope/scope.constants.ts"]
  file_src_modules_scope_scope_module_ts["src/modules/scope/scope.module.ts"]
  file_src_modules_scope_scope_service_ts["src/modules/scope/scope.service.ts"]
  file_src_modules_scope_scope_service_unit_test_ts["src/modules/scope/scope.service.unit.test.ts"]
  file_src_modules_scope_scope_types_ts["src/modules/scope/scope.types.ts"]
  file_testing_mocks_ts["testing/mocks.ts"]
  file_testing_setup_ts["testing/setup.ts"]
  file_vite_config_ts["vite.config.ts"]
  file_vitest_config_ts["vitest.config.ts"]
  file_src_executors_validate_executor_ts --> file_src_executors_validate_executor_types_ts
  file_src_executors_validate_executor_ts --> file_src_modules_plugin_plugin_context_utilities_ts
  file_src_executors_validate_executor_unit_test_ts --> file_src_executors_validate_executor_ts
  file_src_executors_validate_executor_unit_test_ts --> file_src_modules_plugin_plugin_context_utilities_ts
  file_src_generators_sync_generator_ts --> file_src_generators_sync_generator_types_ts
  file_src_generators_sync_generator_ts --> file_src_modules_generator_generator_constants_ts
  file_src_generators_sync_generator_ts --> file_src_modules_options_options_constants_ts
  file_src_generators_sync_generator_ts --> file_src_modules_plugin_plugin_context_utilities_ts
  file_src_generators_sync_generator_unit_test_ts --> file_src_generators_sync_generator_ts
  file_src_generators_sync_generator_unit_test_ts --> file_src_modules_plugin_plugin_context_utilities_ts
  file_src_index_ts --> file_src_modules_plugin_plugin_context_utilities_ts
  file_src_index_ts --> file_src_modules_plugin_plugin_constants_ts
  file_src_index_unit_test_ts --> file_src_index_ts
  file_src_index_unit_test_ts --> file_src_modules_plugin_plugin_context_utilities_ts
  file_src_main_module_ts --> file_src_modules_generator_generator_module_ts
  file_src_main_module_ts --> file_src_modules_plugin_plugin_module_ts
  file_src_modules_adapter_adapter_module_ts --> file_src_modules_adapter_adapter_service_ts
  file_src_modules_adapter_adapter_service_ts --> file_src_modules_adapter_adapter_constants_ts
  file_src_modules_adapter_adapter_service_ts --> file_src_modules_adapter_adapter_types_ts
  file_src_modules_adapter_adapter_service_unit_test_ts --> file_src_modules_adapter_adapter_service_ts
  file_src_modules_generator_bootstrap_utilities_ts --> file_src_modules_generator_generator_constants_ts
  file_src_modules_generator_bootstrap_utilities_ts --> file_src_modules_generator_generator_types_ts
  file_src_modules_generator_bootstrap_utilities_ts --> file_src_modules_options_options_constants_ts
  file_src_modules_generator_bootstrap_utilities_ts --> file_src_modules_plugin_plugin_context_utilities_ts
  file_src_modules_generator_bootstrap_utilities_unit_test_ts --> file_src_modules_generator_bootstrap_utilities_ts
  file_src_modules_generator_bootstrap_utilities_unit_test_ts --> file_src_modules_generator_generator_constants_ts
  file_src_modules_generator_bootstrap_utilities_unit_test_ts --> file_src_modules_plugin_plugin_context_utilities_ts
  file_src_modules_generator_generator_module_ts --> file_src_modules_generator_generator_service_ts
  file_src_modules_generator_generator_module_ts --> file_src_modules_scope_scope_module_ts
  file_src_modules_generator_generator_service_ts --> file_src_modules_generator_generator_constants_ts
  file_src_modules_generator_generator_service_ts --> file_src_modules_generator_generator_types_ts
  file_src_modules_generator_generator_service_ts --> file_src_modules_instances_instances_types_ts
  file_src_modules_generator_generator_service_ts --> file_src_modules_paths_paths_constants_ts
  file_src_modules_generator_generator_service_ts --> file_src_modules_scope_scope_service_ts
  file_src_modules_generator_generator_service_unit_test_ts --> file_src_modules_generator_generator_module_ts
  file_src_modules_generator_generator_service_unit_test_ts --> file_src_modules_generator_generator_service_ts
  file_src_modules_generator_generator_service_unit_test_ts --> file_src_modules_generator_generator_types_ts
  file_src_modules_generator_generator_types_ts --> file_src_modules_instances_instances_types_ts
  file_src_modules_instances_instances_module_ts --> file_src_modules_instances_instances_service_ts
  file_src_modules_instances_instances_module_ts --> file_src_modules_scope_scope_module_ts
  file_src_modules_instances_instances_service_ts --> file_src_modules_instances_instances_types_ts
  file_src_modules_instances_instances_service_ts --> file_src_modules_scope_scope_service_ts
  file_src_modules_instances_instances_service_unit_test_ts --> file_src_modules_instances_instances_service_ts
  file_src_modules_instances_instances_service_unit_test_ts --> file_src_modules_instances_instances_types_ts
  file_src_modules_instances_instances_service_unit_test_ts --> file_src_modules_scope_scope_module_ts
  file_src_modules_options_options_module_ts --> file_src_modules_options_options_service_ts
  file_src_modules_options_options_service_ts --> file_src_modules_options_options_constants_ts
  file_src_modules_options_options_service_ts --> file_src_modules_options_options_types_ts
  file_src_modules_options_options_service_unit_test_ts --> file_src_modules_options_options_constants_ts
  file_src_modules_options_options_service_unit_test_ts --> file_src_modules_options_options_service_ts
  file_src_modules_paths_paths_module_ts --> file_src_modules_instances_instances_module_ts
  file_src_modules_paths_paths_module_ts --> file_src_modules_paths_paths_service_ts
  file_src_modules_paths_paths_module_ts --> file_src_modules_scope_scope_module_ts
  file_src_modules_paths_paths_service_ts --> file_src_modules_instances_instances_service_ts
  file_src_modules_paths_paths_service_ts --> file_src_modules_paths_paths_constants_ts
  file_src_modules_paths_paths_service_ts --> file_src_modules_paths_paths_types_ts
  file_src_modules_paths_paths_service_ts --> file_src_modules_scope_scope_service_ts
  file_src_modules_paths_paths_service_unit_test_ts --> file_src_modules_instances_instances_service_ts
  file_src_modules_paths_paths_service_unit_test_ts --> file_src_modules_paths_paths_module_ts
  file_src_modules_paths_paths_service_unit_test_ts --> file_src_modules_paths_paths_service_ts
  file_src_modules_paths_paths_service_unit_test_ts --> file_src_modules_scope_scope_service_ts
  file_src_modules_plugin_plugin_context_utilities_ts --> file_src_main_module_ts
  file_src_modules_plugin_plugin_context_utilities_ts --> file_src_modules_generator_generator_service_ts
  file_src_modules_plugin_plugin_context_utilities_ts --> file_src_modules_options_options_service_ts
  file_src_modules_plugin_plugin_context_utilities_ts --> file_src_modules_plugin_plugin_constants_ts
  file_src_modules_plugin_plugin_context_utilities_ts --> file_src_modules_plugin_plugin_service_ts
  file_src_modules_plugin_plugin_context_utilities_ts --> file_src_modules_plugin_plugin_types_ts
  file_src_modules_plugin_plugin_context_utilities_ts --> file_src_modules_projects_projects_service_ts
  file_src_modules_plugin_plugin_context_utilities_unit_test_ts --> file_src_modules_generator_generator_service_ts
  file_src_modules_plugin_plugin_context_utilities_unit_test_ts --> file_src_modules_options_options_service_ts
  file_src_modules_plugin_plugin_context_utilities_unit_test_ts --> file_src_modules_plugin_plugin_context_utilities_ts
  file_src_modules_plugin_plugin_context_utilities_unit_test_ts --> file_src_modules_plugin_plugin_constants_ts
  file_src_modules_plugin_plugin_context_utilities_unit_test_ts --> file_src_modules_plugin_plugin_service_ts
  file_src_modules_plugin_plugin_context_utilities_unit_test_ts --> file_src_modules_projects_projects_service_ts
  file_src_modules_plugin_plugin_module_ts --> file_src_modules_adapter_adapter_module_ts
  file_src_modules_plugin_plugin_module_ts --> file_src_modules_generator_generator_module_ts
  file_src_modules_plugin_plugin_module_ts --> file_src_modules_instances_instances_module_ts
  file_src_modules_plugin_plugin_module_ts --> file_src_modules_options_options_module_ts
  file_src_modules_plugin_plugin_module_ts --> file_src_modules_paths_paths_module_ts
  file_src_modules_plugin_plugin_module_ts --> file_src_modules_plugin_plugin_service_ts
  file_src_modules_plugin_plugin_module_ts --> file_src_modules_projects_projects_module_ts
  file_src_modules_plugin_plugin_module_ts --> file_src_modules_scope_scope_module_ts
  file_src_modules_plugin_plugin_service_ts --> file_src_modules_adapter_adapter_service_ts
  file_src_modules_plugin_plugin_service_ts --> file_src_modules_generator_generator_constants_ts
  file_src_modules_plugin_plugin_service_ts --> file_src_modules_generator_generator_service_ts
  file_src_modules_plugin_plugin_service_ts --> file_src_modules_instances_instances_service_ts
  file_src_modules_plugin_plugin_service_ts --> file_src_modules_options_options_constants_ts
  file_src_modules_plugin_plugin_service_ts --> file_src_modules_options_options_service_ts
  file_src_modules_plugin_plugin_service_ts --> file_src_modules_options_options_types_ts
  file_src_modules_plugin_plugin_service_ts --> file_src_modules_paths_paths_service_ts
  file_src_modules_plugin_plugin_service_ts --> file_src_modules_plugin_plugin_constants_ts
  file_src_modules_plugin_plugin_service_ts --> file_src_modules_plugin_plugin_types_ts
  file_src_modules_plugin_plugin_service_ts --> file_src_modules_projects_projects_service_ts
  file_src_modules_plugin_plugin_service_unit_test_ts --> file_src_modules_generator_generator_constants_ts
  file_src_modules_plugin_plugin_service_unit_test_ts --> file_src_modules_generator_generator_service_ts
  file_src_modules_plugin_plugin_service_unit_test_ts --> file_src_modules_instances_instances_types_ts
  file_src_modules_plugin_plugin_service_unit_test_ts --> file_src_modules_plugin_plugin_module_ts
  file_src_modules_plugin_plugin_service_unit_test_ts --> file_src_modules_plugin_plugin_service_ts
  file_src_modules_plugin_plugin_types_ts --> file_src_modules_instances_instances_types_ts
  file_src_modules_plugin_plugin_types_ts --> file_src_modules_plugin_plugin_constants_ts
  file_src_modules_projects_projects_module_ts --> file_src_modules_projects_projects_service_ts
  file_src_modules_projects_projects_service_ts --> file_src_modules_instances_instances_types_ts
  file_src_modules_projects_projects_service_ts --> file_src_modules_projects_projects_constants_ts
  file_src_modules_projects_projects_service_ts --> file_src_modules_projects_projects_types_ts
  file_src_modules_projects_projects_service_unit_test_ts --> file_src_modules_projects_projects_service_ts
  file_src_modules_scope_scope_module_ts --> file_src_modules_scope_scope_service_ts
  file_src_modules_scope_scope_service_ts --> file_src_modules_instances_instances_types_ts
  file_src_modules_scope_scope_service_ts --> file_src_modules_scope_scope_constants_ts
  file_src_modules_scope_scope_service_unit_test_ts --> file_src_modules_instances_instances_types_ts
  file_src_modules_scope_scope_service_unit_test_ts --> file_src_modules_scope_scope_service_ts
```
<!-- codependix:end name="codependix-file-imports" -->

<!-- codometer:start -->

## ⏲️ Codometer

### Project

![Lines of Code](https://img.shields.io/badge/Lines_of_Code-5747-22c55e?style=flat-square)
![Repository Size](https://img.shields.io/badge/Repository_Size-200.06_kB-6b7280?style=flat-square)
![Folders](https://img.shields.io/badge/Folders-15-4a4a4a?style=flat-square)
![Source Files](https://img.shields.io/badge/Source_Files-61-3178c6?style=flat-square)

### Measured Targets

![Compiled JavaScript Size](https://img.shields.io/badge/Compiled_JavaScript_Size-32.37_kB_gzip-6b7280?style=flat-square)

### TypeScript

![TypeScript Files](https://img.shields.io/badge/TypeScript_Files-59-3178c6?style=flat-square)
![Interfaces](https://img.shields.io/badge/Interfaces-20-0ea5e9?style=flat-square)
![Generic Declarations](https://img.shields.io/badge/Generic_Declarations-0-0369a1?style=flat-square)
![Enums](https://img.shields.io/badge/Enums-0-f97316?style=flat-square)
![Decorators](https://img.shields.io/badge/Decorators-17-db2777?style=flat-square)
![Doc Comments](https://img.shields.io/badge/Doc_Comments-142-6366f1?style=flat-square)
![Static Methods](https://img.shields.io/badge/Static_Methods-0-166534?style=flat-square)

### JavaScript

![JavaScript Files](https://img.shields.io/badge/JavaScript_Files-2-f7df1e?style=flat-square)
![Test Files](https://img.shields.io/badge/Test_Files-13-10b981?style=flat-square)
![External Packages](https://img.shields.io/badge/External_Packages-17-8b5cf6?style=flat-square)
![Classes](https://img.shields.io/badge/Classes-17-7c3aed?style=flat-square)
![Functions](https://img.shields.io/badge/Functions-255-16a34a?style=flat-square)
![Methods](https://img.shields.io/badge/Methods-85-15803d?style=flat-square)
![Sync Functions](https://img.shields.io/badge/Sync_Functions-205-4ade80?style=flat-square)
![Async Functions](https://img.shields.io/badge/Async_Functions-135-059669?style=flat-square)
![Constants](https://img.shields.io/badge/Constants-255-dc2626?style=flat-square)
![Imports](https://img.shields.io/badge/Imports-255-0284c7?style=flat-square)
![Exported Symbols](https://img.shields.io/badge/Exported_Symbols-76-ea580c?style=flat-square)
![Comments](https://img.shields.io/badge/Comments-324-64748b?style=flat-square)
![Comment Lines](https://img.shields.io/badge/Comment_Lines-711-475569?style=flat-square)
![TODO Comments](https://img.shields.io/badge/TODO_Comments-0-ca8a04?style=flat-square)

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

![JSON Files](https://img.shields.io/badge/JSON_Files-8-a16207?style=flat-square)
![JSON Lines](https://img.shields.io/badge/JSON_Lines-269-ca8a04?style=flat-square)
![JSON Objects](https://img.shields.io/badge/JSON_Objects-57-7c3aed?style=flat-square)
![JSON Arrays](https://img.shields.io/badge/JSON_Arrays-15-8b5cf6?style=flat-square)
![JSON Properties](https://img.shields.io/badge/JSON_Properties-180-0284c7?style=flat-square)
![JSON Strings](https://img.shields.io/badge/JSON_Strings-148-16a34a?style=flat-square)
![JSON Numbers](https://img.shields.io/badge/JSON_Numbers-3-059669?style=flat-square)
![JSON Booleans](https://img.shields.io/badge/JSON_Booleans-8-0ea5e9?style=flat-square)
![JSON Nulls](https://img.shields.io/badge/JSON_Nulls-0-64748b?style=flat-square)
![JSON Items](https://img.shields.io/badge/JSON_Items-43-475569?style=flat-square)
![JSON Nodes](https://img.shields.io/badge/JSON_Nodes-231-dc2626?style=flat-square)
![JSON Max Depth](https://img.shields.io/badge/JSON_Max_Depth-7-ea580c?style=flat-square)

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

![Module Files](https://img.shields.io/badge/Module_Files-9-7c3aed?style=flat-square)
![Service Files](https://img.shields.io/badge/Service_Files-8-0284c7?style=flat-square)
![Command Files](https://img.shields.io/badge/Command_Files-0-16a34a?style=flat-square)
![Constants Files](https://img.shields.io/badge/Constants_Files-8-ea580c?style=flat-square)
![Types Files](https://img.shields.io/badge/Types_Files-10-db2777?style=flat-square)
![Utilities Files](https://img.shields.io/badge/Utilities_Files-2-0ea5e9?style=flat-square)
![TypeORM Entities](https://img.shields.io/badge/TypeORM_Entities-0-059669?style=flat-square)
![Unit Tests](https://img.shields.io/badge/Unit_Tests-13-ca8a04?style=flat-square)
![Integration Tests](https://img.shields.io/badge/Integration_Tests-0-7c3aed?style=flat-square)
![End To End Tests](https://img.shields.io/badge/End_To_End_Tests-0-0284c7?style=flat-square)
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
![Markdown Lines](https://img.shields.io/badge/Markdown_Lines-222-1f6feb?style=flat-square)
![H1](https://img.shields.io/badge/H1-1-7c3aed?style=flat-square)
![H2](https://img.shields.io/badge/H2-7-8b5cf6?style=flat-square)
![H3](https://img.shields.io/badge/H3-12-a78bfa?style=flat-square)
![H4](https://img.shields.io/badge/H4-0-c4b5fd?style=flat-square)
![H5](https://img.shields.io/badge/H5-0-ddd6fe?style=flat-square)
![H6](https://img.shields.io/badge/H6-0-ede9fe?style=flat-square)
![Paragraphs](https://img.shields.io/badge/Paragraphs-45-64748b?style=flat-square)
![Lists](https://img.shields.io/badge/Lists-6-16a34a?style=flat-square)
![List Items](https://img.shields.io/badge/List_Items-25-22c55e?style=flat-square)
![Task List Items](https://img.shields.io/badge/Task_List_Items-0-4ade80?style=flat-square)
![Tables](https://img.shields.io/badge/Tables-2-0284c7?style=flat-square)
![Table Rows](https://img.shields.io/badge/Table_Rows-10-0ea5e9?style=flat-square)
![Links](https://img.shields.io/badge/Links-9-059669?style=flat-square)
![Images](https://img.shields.io/badge/Images-0-10b981?style=flat-square)
![Code Blocks](https://img.shields.io/badge/Code_Blocks-11-dc2626?style=flat-square)
![Inline Code](https://img.shields.io/badge/Inline_Code-73-ef4444?style=flat-square)
![Block Quotes](https://img.shields.io/badge/Block_Quotes-0-ca8a04?style=flat-square)
![Thematic Breaks](https://img.shields.io/badge/Thematic_Breaks-0-a16207?style=flat-square)
<!-- codometer:end -->
