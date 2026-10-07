# 👔 Conformetry Configuration

[![npm](https://img.shields.io/npm/v/@conformetry/configuration?logo=npm&label=npm)](https://www.npmjs.com/package/@conformetry/configuration)

**The configuration reference for [Conformetry](../conformetry-cli/README.md).**

`@conformetry/configuration` reads a repository's `conformetry.config.*`, checks
it, and turns it into the three things the rest of the toolchain works from:
the generator registry, the instances validation walks, and the
resolved inputs a generator renders with.

```bash
npm install --save-dev @conformetry/configuration
```

Most consumers never install this directly — `@conformetry/cli` and
`@conformetry/nx` both depend on it. Install it when you are typing a
configuration file, or embedding conformetry in a host of your own.

## The configuration file

Any of `conformetry.config.{ts,mts,cts,js,mjs,cjs,json,jsonc}`. TypeScript and
JavaScript files are loaded through [jiti](https://github.com/unjs/jiti), so a
`.ts` config needs no build step and may import from your workspace.

The path is resolved against the current directory first, then against the
workspace root — located by walking upward for `pnpm-workspace.yaml` — so a
config path written relative to the root still resolves from a nested
directory.

The file default-exports an **array of generator definitions**. It is an array
rather than a keyed record because a generator's name is already a field, and a
record made the name true in two places at once.

```ts
import { type ConformetryConfiguration } from "@conformetry/configuration";

const conformetryConfiguration: ConformetryConfiguration = [
  {
    description: "Generate a NestJS service module",
    inputs: {
      name: { description: "Module name in kebab-case", type: "string" },
    },
    instances: [{ patterns: ["packages/*/src/modules/*"] }],
    name: "nestjs-service-module",
    templatePath: "templates/nestjs-service-module",
  },
];

export default conformetryConfiguration;
```

### Generator fields

| Field | Required | Purpose |
| ----- | -------- | ------- |
| `name` | ✅ | How the generator is addressed, and the filename it is emitted under |
| `templatePath` | ✅ | The template folder, relative to the workspace root |
| `inputs` | | The values it substitutes, as JSON Schema fragments |
| `instances` | | Where this generator's output already lives |
| `description` | | Shown when a host lists or prompts for generators |

Both `inputs` and `instances` may be omitted. A generator with neither renders
a fixed template nobody validates, which is legal.

### What is rejected

The schema fails loudly rather than validating nothing, and reports every
problem in one pass:

- **Two generators answering to the same name.** A host resolves the first
  match, so a collision does not error where it is used — it silently shadows,
  and the losing generator becomes unreachable while still appearing in the
  configuration.
- **Two generators sharing a `templatePath`.** Validation then finds instances
  that fit both equally and reports them as matching nothing.
- **A name containing a path separator.** A generator is addressed by its name
  and emitted to a file named after it.
- **A key the schema does not declare.** The generator object is strict, so a
  misspelled field — or `aliases`, which was removed outright — is rejected
  rather than stripped and left reading as though it took effect.

## Instances

`instances` is what makes validation possible. It says where a generator's
output already lives, so validation knows what to check without being told a
second time.

```ts
instances: [
  { patterns: ["packages/*/src/modules/*"] },
  {
    patterns: ["applications/*/src/modules/*"],
    substitutions: { type: "applications" },
  },
];
```

| Field | Purpose |
| ----- | ------- |
| `exclude` | Workspace-relative globs naming paths that are never instances, applied with or without `tags` |
| `patterns` | Globs locating this group's instances, workspace-relative |
| `substitutions` | Values the template's placeholders are rendered with for this group |
| `tags` | Labels selecting which hosts the group applies to, carried uninterpreted |
| `threshold` | Lowest conformance score these instances may have, overriding the generator's |

Groups exist so substitutions can differ per glob. `type` is `packages` for one
set of paths and `applications` for another, and no generic rule can tell them
apart.

> **A placeholder these substitutions leave out is read from the instance.**
> Validation renders a random stand-in for it, captures the text the instance
> holds where the template's first use of it aligns, renders the template again
> with that text, and compares as usual — so a later use holding different text
> is an ordinary difference. When nothing aligns, the instance fails with
> `Could not infer {{…}}`. `name` and its variants always come from the
> instance path, and a value supplied here always wins. Generation has no
> instance to read, so there a placeholder nobody supplied still raises
> `MissingSubstitutionError` — see
> [`@conformetry/generation`](../conformetry-generation/README.md) for why, and
> for the section syntax a template uses to make a placeholder optional.

`exclude` drops any instance whose own path — the directory a pattern found, or
the files of a file instance — matches one of its globs, whether or not the
group has `tags`. It is how vendored or generated code living beside real
instances, such as shadcn's component output, is left out of validation:
`exclude: ["applications/lexico/src/components/ui/**"]`.

`tags` is carried through untouched by this package, which has no notion of a
host to match labels against. [`@conformetry/nx`](../conformetry-nx/README.md)
reads them as Nx project tags and resolves each group's globs _inside_ every
matching project; another host is free to read them as something else. A group
naming only `tags` is legal — it selects without locating, which is what a
template with no instances yet wants.

### Directory globs versus file globs

The two behave differently on purpose, and the difference is what lets a
small template win against a large one.

- A **directory glob** leaves the match scope open, and the largest fitting
  template wins.
- A **file glob** narrows the scope to the matched files, so a template
  describing exactly those files fits better than one describing the whole
  directory.

That is how a two-file template such as `nestjs-service-file` is matchable at
all inside a directory a five-file module template also claims:

```ts
instances: [
  { patterns: ["src/modules/*/*.service.ts", "src/modules/*/*.service.unit.test.ts"] },
];
```

### Where a template is laid down

A template that produces a _folder_ contains that folder, so its instance path
is the folder's **parent**: `nestjs-service-module` holds `{{nameKebabCase}}/…`,
and its instances are `…/src/modules`. A template that produces loose files
holds them at its root, and its instance path is the directory those files sit
in.

## Thresholds

An instance passes when its conformance score reaches the threshold that
applies to it. Three levels set it, and the narrowest wins:

```ts
instances[].threshold ?? generator.threshold ?? runThreshold ?? 1
```

A level left unset stays unset rather than being filled with the default — that
is what lets a host's own `--threshold` reach an instance whose generator has
no opinion. The default of `1` is applied only at the end of the chain, so
nothing configured is quietly overridden, and a level nobody set is not
quietly treated as if they had.

```ts
{
  name: "nestjs-service-module",
  templatePath: "templates/nestjs-service-module",
  threshold: 1,                               // strict everywhere by default
  instances: [
    { patterns: ["packages/*/src/modules/*"] },
    {
      patterns: ["applications/legacy/src/modules/*"],
      threshold: 0.75,                        // …except while migrating this one
    },
  ],
}
```

When two groups locate the same instance with different thresholds the
strictest wins: nothing makes one group more specific than another, and letting
order decide would mean a lenient group could silently relax a bar someone else
set.

## Inputs

Each entry in `inputs` is a JSON Schema fragment. Only `properties` and
`required` are read — enough to know an input's name, whether it must be
supplied, and what to say when prompting for it.

Authoring them by hand is verbose, so deriving them from a schema library is
the usual approach:

```ts
import { z } from "zod";

function defineInputs(shape: z.ZodRawShape) {
  return z.toJSONSchema(z.object(shape)).properties ?? {};
}

inputs: defineInputs({
  name: z.string().describe("Module name in kebab-case"),
  project: z.string().describe("Parent project name in kebab-case"),
});
```

Values are resolved in order: flags passed on the command line first, then
interactive prompts for anything still missing. Prompting is skipped entirely
when stdin is not a TTY or `CI` is `true`, so a missing input fails the command
rather than hanging it.

## Matching

Validation does not record which template produced a file. It works it out:
every instance is weighed against every template by the share of the template's
files the instance already has, and the best fit wins.

Two outcomes are reported rather than skipped, because a glob is the author
asserting that these paths _are_ instances:

| Reason | Meaning |
| ------ | ------- |
| `no-match` | No template explains this instance well enough |
| `ambiguous` | Two or more templates tied, so they are indistinguishable here |

## Exports

| Export | Purpose |
| ------ | ------- |
| `ConfigurationService` | Everything this layer answers: loading a configuration file, reading templates, expanding globs into instances, matching the two, rendering placeholders, and resolving generator inputs |
| `ConfigurationModule` | The NestJS module that provides it |
| `ConformetryConfiguration` | The loaded configuration type — author your config as this |
| `ConformetryInstanceGroup`, `ConformetryGeneratorDefinition` | Field-level types for the above |

**One service and one module, and no other collaborator** — the same pair
`@callidescope/configuration`, `@codependix/configuration` and
`@codometer/configuration` publish, so learning one of the four teaches you all
of them.

Behind the facade, template discovery, instance discovery, rendering, instance
groups, and input resolution stay six separate classes in six separate files,
because they are six different jobs. What they are not is six entry points a
host has to know the names of: a consumer imports `ConfigurationModule` and
injects `ConfigurationService`.

Loading a configuration file is the one job `ConfigurationService` holds
itself; everything that touches paths is a one-line hand-off to the
collaborator that owns it.

## Test

```bash
nx run conformetry-configuration:vitest
```

## License

MIT — see [LICENSE](../../../../LICENSE).

## 👔 Conformetry

This project was generated from the [nestjs-service-project](../../../../configuration/conformetry-templates/nestjs-service-project) conformetry template.

<!-- callidescope:start -->

## 🔭 Callidescope

Call stacks traced through `packages/ic-suite/conformetry/conformetry-configuration`, deepest first. Each frame shows what it takes, what it returns, and what its documentation says.

| Measure | Value |
| --- | --- |
| Callables | 167 |
| Files | 37 |
| Calls traced | 151 |
| Call stacks | 5 |
| Deepest stack | 10 |
| Stacks through recursion | 0 |
| Unfollowable calls | 7 |

### Limits

What this project is judged against, as declared in its own `callidescope.config.ts`.

| Limit | Value |
| --- | --- |
| `maximumDepth` | 14 |
| `maximumBreadth` | 5 |

### Call stacks (depth)

**1. `InstanceDiscoveryService.matchTemplates`** — depth ≥ 10 · orphan-root

```text
🚀 InstanceDiscoveryService.matchTemplates(…): TemplateMatch[] [packages/ic-suite/conformetry/conformetry-configuration/src/modules/instance-discovery/instance-discovery.service.ts:103]
   ↳ Ranks every template that shares a file with one instance, best first.
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

**2. `InputService.resolveInputsFromValues`** — depth ≥ 8 · orphan-root

```text
🚀 InputService.resolveInputsFromValues(args: ResolveInputsFromValuesArguments): Promise<Record<string, string>> [packages/ic-suite/conformetry/conformetry-configuration/src/modules/input/input.service.ts:195]
   ↳ Resolves inputs from values the caller already parsed.
  └─> InputService.resolveInputs(…): Promise<Record<string, string>> [packages/ic-suite/conformetry/conformetry-configuration/src/modules/input/input.service.ts:53]
     ↳ Walks a schema, taking each value from the resolver or a prompt.
    └─> InputService.acceptProvidedValue(args: { input: SchemaInput; value: string; }): string [packages/ic-suite/conformetry/conformetry-configuration/src/modules/input/input.service.ts:39]
       ↳ Validates a value the caller already had, throwing if it is invalid.
      └─> InputSchemaService.validateValue(args: { input: SchemaInput; value: unknown; }): string | true [packages/ic-suite/conformetry/conformetry-configuration/src/modules/input/input-schema.service.ts:158]
         ↳ Validates a value, returning `true` or the reason it failed.
        └─> InputSchemaService.validateEnum(args: { input: SchemaInput; value: string; }): string | true [packages/ic-suite/conformetry/conformetry-configuration/src/modules/input/input-schema.service.ts:39]
           ↳ Validates a value against a schema `enum`, when one is declared.
          └─> InputSchemaService.readEnumValues(propertySchema: unknown): string[] [packages/ic-suite/conformetry/conformetry-configuration/src/modules/input/input-schema.service.ts:123]
             ↳ Reads the string members of a schema `enum`.
            └─> InputSchemaService.readSchemaProperty(propertySchema: unknown, key: string): unknown [packages/ic-suite/conformetry/conformetry-configuration/src/modules/input/input-schema.service.ts:26]
               ↳ Reads one property off a schema fragment when it is an object.
              └─> InputSchemaService.find(…)([entryKey]: [string, any]): boolean [packages/ic-suite/conformetry/conformetry-configuration/src/modules/input/input-schema.service.ts:31]
```

**3. `InputPromptingService.validate`** — depth 6 · orphan-root

```text
🚀 InputPromptingService.validate(value: unknown): string | true [packages/ic-suite/conformetry/conformetry-configuration/src/modules/input/input-prompting.service.ts:105]
  └─> InputSchemaService.validateValue(args: { input: SchemaInput; value: unknown; }): string | true [packages/ic-suite/conformetry/conformetry-configuration/src/modules/input/input-schema.service.ts:158]
     ↳ Validates a value, returning `true` or the reason it failed.
    └─> InputSchemaService.validateEnum(args: { input: SchemaInput; value: string; }): string | true [packages/ic-suite/conformetry/conformetry-configuration/src/modules/input/input-schema.service.ts:39]
       ↳ Validates a value against a schema `enum`, when one is declared.
      └─> InputSchemaService.readEnumValues(propertySchema: unknown): string[] [packages/ic-suite/conformetry/conformetry-configuration/src/modules/input/input-schema.service.ts:123]
         ↳ Reads the string members of a schema `enum`.
        └─> InputSchemaService.readSchemaProperty(propertySchema: unknown, key: string): unknown [packages/ic-suite/conformetry/conformetry-configuration/src/modules/input/input-schema.service.ts:26]
           ↳ Reads one property off a schema fragment when it is an object.
          └─> InputSchemaService.find(…)([entryKey]: [string, any]): boolean [packages/ic-suite/conformetry/conformetry-configuration/src/modules/input/input-schema.service.ts:31]
```

<details>
<summary>2 more call stacks</summary>

**4. `assertNoCollisions`** — depth ≥ 3 · orphan-root

```text
🚀 assertNoCollisions(…): void [packages/ic-suite/conformetry/conformetry-configuration/src/modules/configuration/configuration.utilities.ts:28]
   ↳ Fails when two generators would answer to the same thing.
  └─> findDuplicates(…): { message: string; path: (string | number)[]; }[] [packages/ic-suite/conformetry/conformetry-configuration/src/modules/configuration/configuration.utilities.ts:62]
     ↳ Reports every key more than one generator claims.
    └─> map(…)(…): { message: string; path: number[]; } [packages/ic-suite/conformetry/conformetry-configuration/src/modules/configuration/configuration.utilities.ts:84]
```

**5. `InstanceDiscoveryService.buildSubstitutions`** — depth 3 · orphan-root

```text
🚀 InstanceDiscoveryService.buildSubstitutions(…): Substitutions [packages/ic-suite/conformetry/conformetry-configuration/src/modules/instance-discovery/instance-discovery.service.ts:83]
   ↳ Builds the substitutions an instance's template is rendered with.
  └─> InstanceDiscoveryMatchingService.buildSubstitutions(instance: Instance): Substitutions [packages/ic-suite/conformetry/conformetry-configuration/src/modules/instance-discovery/instance-discovery-matching.service.ts:72]
     ↳ Builds the substitutions an instance's template is rendered with.
    └─> RenderingService.buildNameSubstitutions(name: string): Substitutions [packages/ic-suite/conformetry/conformetry-configuration/src/modules/rendering/rendering.service.ts:94]
       ↳ Derives the case variants every template can reference from one name.
```

</details>

### Breadth

| Callable | Breadth | Calls directly | Location |
| --- | --- | --- | --- |
| `InstanceDiscoveryMatchingService.matchInstances` | 5 | `InstanceDiscoveryMatchingService.buildSubstitutions`, `InstanceDiscoveryMatchingService.matchTemplates`, `InstanceDiscoveryMatchingService.filter(…)`, `InstanceDiscoveryMatchingService.map(…)`, `InstanceDiscoveryMatchingService.map(…)` | `packages/ic-suite/conformetry/conformetry-configuration/src/modules/instance-discovery/instance-discovery-matching.service.ts:93` |
| `InputPromptingService.promptForInput` | 4 | `InputPromptingService.assertCanPrompt`, `InputSchemaService.readEnumValues`, `InputPromptingService.map(…)`, `InputSchemaService.readPromptMessage` | `packages/ic-suite/conformetry/conformetry-configuration/src/modules/input/input-prompting.service.ts:90` |
| `InputService.resolveInputs` | 4 | `InputSchemaService.readPropertyNames`, `InputSchemaService.describeInput`, `InputService.acceptProvidedValue`, `InputService.resolveMissingValue` | `packages/ic-suite/conformetry/conformetry-configuration/src/modules/input/input.service.ts:53` |

<details>
<summary>91 more callables</summary>

| Callable | Breadth | Calls directly | Location |
| --- | --- | --- | --- |
| `InputService.resolveMissingValue` | 4 | `InputPromptingService.isAtTerminal`, `missingInputError`, `InputPromptingService.promptForInput`, `InputSchemaService.validateValue` | `packages/ic-suite/conformetry/conformetry-configuration/src/modules/input/input.service.ts:94` |
| `InstanceDiscoveryLocatingService.findInstances` | 4 | `InstanceDiscoveryLocatingService.resolveGlobSuffix`, `InstanceDiscoveryLocatingService.resolveNameStem`, `InstanceDiscoveryLocatingService.map(…)`, `InstanceDiscoveryLocatingService.toSorted(…)` | `packages/ic-suite/conformetry/conformetry-configuration/src/modules/instance-discovery/instance-discovery-locating.service.ts:121` |
| `InstanceDiscoveryService.resolveInventoriedInstances` | 4 | `InstanceDiscoveryService.takeInventory`, `InstanceDiscoveryService.map(…)`, `InstanceDiscoveryService.filter(…)`, `InstanceDiscoveryService.map(…)` | `packages/ic-suite/conformetry/conformetry-configuration/src/modules/instance-discovery/instance-discovery.service.ts:191` |
| `InstanceDiscoveryService.resolveInventoriedTemplates` | 4 | `InstanceDiscoveryService.takeInventory`, `InstanceDiscoveryService.filter(…)`, `InstanceDiscoveryService.map(…)`, `InstanceDiscoveryService.filter(…)` | `packages/ic-suite/conformetry/conformetry-configuration/src/modules/instance-discovery/instance-discovery.service.ts:216` |
| `InstanceDiscoveryService.takeInventory` | 4 | `TemplateDiscoveryService.collectTemplates`, `InstanceDiscoveryService.flatMap(…)`, `InstanceDiscoveryService.findInstances`, `InstanceDiscoveryService.map(…)` | `packages/ic-suite/conformetry/conformetry-configuration/src/modules/instance-discovery/instance-discovery.service.ts:255` |
| `ConfigurationService.loadConformetryConfiguration` | 4 | `ConfigurationService.resolveConfigurationPath`, `UnknownConfigurationFileTypeError.constructor`, `ConfigurationService.loadConfigurationModule`, `ConfigurationService.map(…)` | `packages/ic-suite/conformetry/conformetry-configuration/src/modules/configuration/configuration.service.ts:243` |
| `assertNoCollisions` | 3 | `findDuplicates`, `findUnusableNames`, `findReservedNames` | `packages/ic-suite/conformetry/conformetry-configuration/src/modules/configuration/configuration.utilities.ts:28` |
| `findReservedNames` | 3 | `map(…)`, `filter(…)`, `map(…)` | `packages/ic-suite/conformetry/conformetry-configuration/src/modules/configuration/configuration.utilities.ts:97` |
| `findUnusableNames` | 3 | `map(…)`, `filter(…)`, `map(…)` | `packages/ic-suite/conformetry/conformetry-configuration/src/modules/configuration/configuration.utilities.ts:112` |
| `InputOptionsService.collectOneInput` | 3 | `InputOptionsService.readOptionName`, `InputOptionsService.resolvePropertyName`, `InputOptionsService.readOptionValue` | `packages/ic-suite/conformetry/conformetry-configuration/src/modules/input/input-options.service.ts:38` |
| `InputSchemaService.validateValue` | 3 | `InputSchemaService.validateEnum`, `InputSchemaService.validateLength`, `InputSchemaService.validatePattern` | `packages/ic-suite/conformetry/conformetry-configuration/src/modules/input/input-schema.service.ts:158` |
| `RenderingService.assertEverySubstitutionSupplied` | 3 | `RenderingService.filter(…)`, `RenderingService.collectInterpolatedNames`, `MissingSubstitutionError.constructor` | `packages/ic-suite/conformetry/conformetry-configuration/src/modules/rendering/rendering.service.ts:35` |
| `InstanceDiscoveryMatchingService.matchTemplates` | 3 | `InstanceDiscoveryMatchingService.toSorted(…)`, `InstanceDiscoveryMatchingService.filter(…)`, `InstanceDiscoveryMatchingService.map(…)` | `packages/ic-suite/conformetry/conformetry-configuration/src/modules/instance-discovery/instance-discovery-matching.service.ts:154` |
| `InstanceDiscoveryService.weighInstance` | 3 | `InstanceDiscoveryService.map(…)`, `InstanceDiscoveryMatchingService.matchTemplates`, `InstanceDiscoveryMatchingService.buildSubstitutions` | `packages/ic-suite/conformetry/conformetry-configuration/src/modules/instance-discovery/instance-discovery.service.ts:56` |
| `InstanceDiscoveryService.map(…)` | 3 | `InstanceDiscoveryService.filter(…)`, `InstanceDiscoveryService.map(…)`, `InstanceDiscoveryService.filter(…)` | `packages/ic-suite/conformetry/conformetry-configuration/src/modules/instance-discovery/instance-discovery.service.ts:118` |
| `findDuplicates` | 2 | `map(…)`, `filter(…)` | `packages/ic-suite/conformetry/conformetry-configuration/src/modules/configuration/configuration.utilities.ts:62` |
| `InputSchemaService.readEnumValues` | 2 | `InputSchemaService.readSchemaProperty`, `InputSchemaService.filter(…)` | `packages/ic-suite/conformetry/conformetry-configuration/src/modules/input/input-schema.service.ts:123` |
| `InputPromptingService.assertCanPrompt` | 2 | `InputPromptingService.isAtTerminal`, `missingInputError` | `packages/ic-suite/conformetry/conformetry-configuration/src/modules/input/input-prompting.service.ts:50` |
| `InputPromptingService.promptForTemplates` | 2 | `InputPromptingService.map(…)`, `InputPromptingService.filter(…)` | `packages/ic-suite/conformetry/conformetry-configuration/src/modules/input/input-prompting.service.ts:144` |
| `InputService.parseCommaDelimitedOption` | 2 | `InputService.filter(…)`, `InputService.map(…)` | `packages/ic-suite/conformetry/conformetry-configuration/src/modules/input/input.service.ts:118` |
| `InputService.resolveGeneratorInputs` | 2 | `InputOptionsService.collectGeneratorInputs`, `InputService.resolveInputs` | `packages/ic-suite/conformetry/conformetry-configuration/src/modules/input/input.service.ts:180` |
| `TemplateDiscoveryService.prepareDocument` | 2 | `TemplateDiscoveryService.resolveInstanceFilePath`, `RenderingService.renderContent` | `packages/ic-suite/conformetry/conformetry-configuration/src/modules/template-discovery/template-discovery.service.ts:153` |
| `InstanceDiscoveryService.flatMap(…)` | 2 | `InstanceDiscoveryService.flatMap(…)`, `InstanceDiscoveryService.readWorkspaceGroups` | `packages/ic-suite/conformetry/conformetry-configuration/src/modules/instance-discovery/instance-discovery.service.ts:265` |
| `missingInputError` | 1 | `InputError.constructor` | `packages/ic-suite/conformetry/conformetry-configuration/src/modules/input/input.constants.ts:65` |
| `InputOptionsService.resolvePropertyName` | 1 | `InputOptionsService.find(…)` | `packages/ic-suite/conformetry/conformetry-configuration/src/modules/input/input-options.service.ts:104` |
| `InputOptionsService.collectGeneratorInputs` | 1 | `InputOptionsService.collectOneInput` | `packages/ic-suite/conformetry/conformetry-configuration/src/modules/input/input-options.service.ts:124` |
| `InputSchemaService.readSchemaProperty` | 1 | `InputSchemaService.find(…)` | `packages/ic-suite/conformetry/conformetry-configuration/src/modules/input/input-schema.service.ts:26` |
| `InputSchemaService.validateEnum` | 1 | `InputSchemaService.readEnumValues` | `packages/ic-suite/conformetry/conformetry-configuration/src/modules/input/input-schema.service.ts:39` |
| `InputSchemaService.validateLength` | 1 | `InputSchemaService.readSchemaProperty` | `packages/ic-suite/conformetry/conformetry-configuration/src/modules/input/input-schema.service.ts:53` |
| `InputSchemaService.validatePattern` | 1 | `InputSchemaService.readSchemaProperty` | `packages/ic-suite/conformetry/conformetry-configuration/src/modules/input/input-schema.service.ts:85` |
| `InputSchemaService.readPromptMessage` | 1 | `InputSchemaService.readSchemaProperty` | `packages/ic-suite/conformetry/conformetry-configuration/src/modules/input/input-schema.service.ts:136` |
| `InputPromptingService.validate` | 1 | `InputSchemaService.validateValue` | `packages/ic-suite/conformetry/conformetry-configuration/src/modules/input/input-prompting.service.ts:105` |
| `InputPromptingService.promptForTemplate` | 1 | `InputPromptingService.map(…)` | `packages/ic-suite/conformetry/conformetry-configuration/src/modules/input/input-prompting.service.ts:122` |
| `InputPromptingService.map(…)` | 1 | `InputPromptingService.describeChoice` | `packages/ic-suite/conformetry/conformetry-configuration/src/modules/input/input-prompting.service.ts:126` |
| `InputPromptingService.map(…)` | 1 | `InputPromptingService.describeChoice` | `packages/ic-suite/conformetry/conformetry-configuration/src/modules/input/input-prompting.service.ts:154` |
| `InputService.acceptProvidedValue` | 1 | `InputSchemaService.validateValue` | `packages/ic-suite/conformetry/conformetry-configuration/src/modules/input/input.service.ts:39` |
| `InputService.parseThresholdOption` | 1 | `InputService.parseOptionalOption` | `packages/ic-suite/conformetry/conformetry-configuration/src/modules/input/input.service.ts:161` |
| `InputService.resolveInputsFromValues` | 1 | `InputService.resolveInputs` | `packages/ic-suite/conformetry/conformetry-configuration/src/modules/input/input.service.ts:195` |
| `MissingSubstitutionError.constructor` | 1 | `MissingSubstitutionError.map(…)` | `packages/ic-suite/conformetry/conformetry-configuration/src/modules/rendering/rendering.constants.ts:31` |
| `RenderingService.collectInterpolatedNames` | 1 | `RenderingService.walk` | `packages/ic-suite/conformetry/conformetry-configuration/src/modules/rendering/rendering.service.ts:61` |
| `RenderingService.renderContent` | 1 | `RenderingService.assertEverySubstitutionSupplied` | `packages/ic-suite/conformetry/conformetry-configuration/src/modules/rendering/rendering.service.ts:115` |
| `RenderingService.renderPath` | 1 | `RenderingService.assertEverySubstitutionSupplied` | `packages/ic-suite/conformetry/conformetry-configuration/src/modules/rendering/rendering.service.ts:142` |
| `TemplateDiscoveryService.collectTemplate` | 1 | `TemplateDiscoveryService.collectFilePaths` | `packages/ic-suite/conformetry/conformetry-configuration/src/modules/template-discovery/template-discovery.service.ts:78` |
| `TemplateDiscoveryService.collectTemplates` | 1 | `TemplateDiscoveryService.map(…)` | `packages/ic-suite/conformetry/conformetry-configuration/src/modules/template-discovery/template-discovery.service.ts:98` |
| `TemplateDiscoveryService.map(…)` | 1 | `TemplateDiscoveryService.collectTemplate` | `packages/ic-suite/conformetry/conformetry-configuration/src/modules/template-discovery/template-discovery.service.ts:102` |
| `TemplateDiscoveryService.countMatchingFiles` | 1 | `TemplateDiscoveryService.filter(…)` | `packages/ic-suite/conformetry/conformetry-configuration/src/modules/template-discovery/template-discovery.service.ts:121` |
| `TemplateDiscoveryService.filter(…)` | 1 | `TemplateDiscoveryService.resolveInstanceFilePath` | `packages/ic-suite/conformetry/conformetry-configuration/src/modules/template-discovery/template-discovery.service.ts:130` |
| `TemplateDiscoveryService.resolveInstanceFilePath` | 1 | `RenderingService.renderPath` | `packages/ic-suite/conformetry/conformetry-configuration/src/modules/template-discovery/template-discovery.service.ts:179` |
| `InstanceDiscoveryLocatingService.resolveGlobSuffix` | 1 | `InstanceDiscoveryLocatingService.map(…)` | `packages/ic-suite/conformetry/conformetry-configuration/src/modules/instance-discovery/instance-discovery-locating.service.ts:73` |
| `InstanceDiscoveryLocatingService.map(…)` | 1 | `InstanceDiscoveryLocatingService.deriveLocationSubstitutions` | `packages/ic-suite/conformetry/conformetry-configuration/src/modules/instance-discovery/instance-discovery-locating.service.ts:162` |
| `InstanceDiscoveryMatchingService.buildSubstitutions` | 1 | `RenderingService.buildNameSubstitutions` | `packages/ic-suite/conformetry/conformetry-configuration/src/modules/instance-discovery/instance-discovery-matching.service.ts:72` |
| `InstanceDiscoveryMatchingService.map(…)` | 1 | `TemplateDiscoveryService.countMatchingFiles` | `packages/ic-suite/conformetry/conformetry-configuration/src/modules/instance-discovery/instance-discovery-matching.service.ts:160` |
| `InstanceDiscoveryMatchingService.toSorted(…)` | 1 | `InstanceDiscoveryMatchingService.compareMatches` | `packages/ic-suite/conformetry/conformetry-configuration/src/modules/instance-discovery/instance-discovery-matching.service.ts:180` |
| `InstanceDiscoveryService.buildSubstitutions` | 1 | `InstanceDiscoveryMatchingService.buildSubstitutions` | `packages/ic-suite/conformetry/conformetry-configuration/src/modules/instance-discovery/instance-discovery.service.ts:83` |
| `InstanceDiscoveryService.findInstances` | 1 | `InstanceDiscoveryLocatingService.findInstances` | `packages/ic-suite/conformetry/conformetry-configuration/src/modules/instance-discovery/instance-discovery.service.ts:90` |
| `InstanceDiscoveryService.matchInstances` | 1 | `InstanceDiscoveryMatchingService.matchInstances` | `packages/ic-suite/conformetry/conformetry-configuration/src/modules/instance-discovery/instance-discovery.service.ts:95` |
| `InstanceDiscoveryService.matchTemplates` | 1 | `InstanceDiscoveryMatchingService.matchTemplates` | `packages/ic-suite/conformetry/conformetry-configuration/src/modules/instance-discovery/instance-discovery.service.ts:103` |
| `InstanceDiscoveryService.prepareDocuments` | 1 | `InstanceDiscoveryService.map(…)` | `packages/ic-suite/conformetry/conformetry-configuration/src/modules/instance-discovery/instance-discovery.service.ts:113` |
| `InstanceDiscoveryService.map(…)` | 1 | `TemplateDiscoveryService.prepareDocument` | `packages/ic-suite/conformetry/conformetry-configuration/src/modules/instance-discovery/instance-discovery.service.ts:124` |
| `InstanceDiscoveryService.readWorkspaceGroups` | 1 | `InstanceDiscoveryService.filter(…)` | `packages/ic-suite/conformetry/conformetry-configuration/src/modules/instance-discovery/instance-discovery.service.ts:158` |
| `InstanceDiscoveryService.filter(…)` | 1 | `InstanceGroupService.isProjectScoped` | `packages/ic-suite/conformetry/conformetry-configuration/src/modules/instance-discovery/instance-discovery.service.ts:161` |
| `InstanceDiscoveryService.resolveInstanceFiles` | 1 | `InstanceDiscoveryService.flatMap(…)` | `packages/ic-suite/conformetry/conformetry-configuration/src/modules/instance-discovery/instance-discovery.service.ts:167` |
| `InstanceDiscoveryService.flatMap(…)` | 1 | `InstanceDiscoveryService.map(…)` | `packages/ic-suite/conformetry/conformetry-configuration/src/modules/instance-discovery/instance-discovery.service.ts:168` |
| `InstanceDiscoveryService.map(…)` | 1 | `TemplateDiscoveryService.resolveInstanceFilePath` | `packages/ic-suite/conformetry/conformetry-configuration/src/modules/instance-discovery/instance-discovery.service.ts:169` |
| `InstanceDiscoveryService.map(…)` | 1 | `InstanceDiscoveryService.filter(…)` | `packages/ic-suite/conformetry/conformetry-configuration/src/modules/instance-discovery/instance-discovery.service.ts:200` |
| `InstanceDiscoveryService.map(…)` | 1 | `InstanceDiscoveryService.flatMap(…)` | `packages/ic-suite/conformetry/conformetry-configuration/src/modules/instance-discovery/instance-discovery.service.ts:228` |
| `InstanceDiscoveryService.flatMap(…)` | 1 | `InstanceDiscoveryService.find(…)` | `packages/ic-suite/conformetry/conformetry-configuration/src/modules/instance-discovery/instance-discovery.service.ts:229` |
| `InstanceDiscoveryService.map(…)` | 1 | `InstanceDiscoveryService.weighInstance` | `packages/ic-suite/conformetry/conformetry-configuration/src/modules/instance-discovery/instance-discovery.service.ts:277` |
| `ConfigurationService.loadConfigurationModule` | 1 | `ConfigurationService.loadJsonConfiguration` | `packages/ic-suite/conformetry/conformetry-configuration/src/modules/configuration/configuration.service.ts:135` |
| `ConfigurationService.resolveConfigurationPath` | 1 | `ConfigurationService.findWorkspaceRoot` | `packages/ic-suite/conformetry/conformetry-configuration/src/modules/configuration/configuration.service.ts:174` |
| `ConfigurationService.buildNameSubstitutions` | 1 | `RenderingService.buildNameSubstitutions` | `packages/ic-suite/conformetry/conformetry-configuration/src/modules/configuration/configuration.service.ts:202` |
| `ConfigurationService.collectTemplate` | 1 | `TemplateDiscoveryService.collectTemplate` | `packages/ic-suite/conformetry/conformetry-configuration/src/modules/configuration/configuration.service.ts:207` |
| `ConfigurationService.collectTemplates` | 1 | `TemplateDiscoveryService.collectTemplates` | `packages/ic-suite/conformetry/conformetry-configuration/src/modules/configuration/configuration.service.ts:214` |
| `ConfigurationService.findInstances` | 1 | `InstanceDiscoveryService.findInstances` | `packages/ic-suite/conformetry/conformetry-configuration/src/modules/configuration/configuration.service.ts:222` |
| `ConfigurationService.isAtTerminal` | 1 | `InputPromptingService.isAtTerminal` | `packages/ic-suite/conformetry/conformetry-configuration/src/modules/configuration/configuration.service.ts:227` |
| `ConfigurationService.isProjectScoped` | 1 | `InstanceGroupService.isProjectScoped` | `packages/ic-suite/conformetry/conformetry-configuration/src/modules/configuration/configuration.service.ts:232` |
| `ConfigurationService.map(…)` | 1 | `ConfigurationService.applyGeneratorDefaults` | `packages/ic-suite/conformetry/conformetry-configuration/src/modules/configuration/configuration.service.ts:259` |
| `ConfigurationService.matchInstances` | 1 | `InstanceDiscoveryService.matchInstances` | `packages/ic-suite/conformetry/conformetry-configuration/src/modules/configuration/configuration.service.ts:263` |
| `ConfigurationService.parseCommaDelimitedOption` | 1 | `InputService.parseCommaDelimitedOption` | `packages/ic-suite/conformetry/conformetry-configuration/src/modules/configuration/configuration.service.ts:271` |
| `ConfigurationService.parseOptionalOption` | 1 | `InputService.parseOptionalOption` | `packages/ic-suite/conformetry/conformetry-configuration/src/modules/configuration/configuration.service.ts:278` |
| `ConfigurationService.parseThresholdOption` | 1 | `InputService.parseThresholdOption` | `packages/ic-suite/conformetry/conformetry-configuration/src/modules/configuration/configuration.service.ts:283` |
| `ConfigurationService.prepareDocuments` | 1 | `InstanceDiscoveryService.prepareDocuments` | `packages/ic-suite/conformetry/conformetry-configuration/src/modules/configuration/configuration.service.ts:291` |
| `ConfigurationService.promptForTemplate` | 1 | `InputPromptingService.promptForTemplate` | `packages/ic-suite/conformetry/conformetry-configuration/src/modules/configuration/configuration.service.ts:298` |
| `ConfigurationService.promptForTemplates` | 1 | `InputPromptingService.promptForTemplates` | `packages/ic-suite/conformetry/conformetry-configuration/src/modules/configuration/configuration.service.ts:305` |
| `ConfigurationService.readWorkspaceGroups` | 1 | `InstanceDiscoveryService.readWorkspaceGroups` | `packages/ic-suite/conformetry/conformetry-configuration/src/modules/configuration/configuration.service.ts:312` |
| `ConfigurationService.renderContent` | 1 | `RenderingService.renderContent` | `packages/ic-suite/conformetry/conformetry-configuration/src/modules/configuration/configuration.service.ts:319` |
| `ConfigurationService.renderPath` | 1 | `RenderingService.renderPath` | `packages/ic-suite/conformetry/conformetry-configuration/src/modules/configuration/configuration.service.ts:326` |
| `ConfigurationService.resolveGeneratorInputs` | 1 | `InputService.resolveGeneratorInputs` | `packages/ic-suite/conformetry/conformetry-configuration/src/modules/configuration/configuration.service.ts:333` |
| `ConfigurationService.resolveInstanceFiles` | 1 | `InstanceDiscoveryService.resolveInstanceFiles` | `packages/ic-suite/conformetry/conformetry-configuration/src/modules/configuration/configuration.service.ts:340` |
| `ConfigurationService.resolveInventoriedInstances` | 1 | `InstanceDiscoveryService.resolveInventoriedInstances` | `packages/ic-suite/conformetry/conformetry-configuration/src/modules/configuration/configuration.service.ts:345` |
| `ConfigurationService.resolveInventoriedTemplates` | 1 | `InstanceDiscoveryService.resolveInventoriedTemplates` | `packages/ic-suite/conformetry/conformetry-configuration/src/modules/configuration/configuration.service.ts:352` |

</details>
<!-- callidescope:end -->

## 🕸️ Codependix

Dependency graphs exported by [codependix](https://github.com/Organizzolini/codebase/tree/main/packages/ic-suite/codependix/codependix-cli), regenerated by `nx run codebase:codependix:write`.

### Nx Neighborhood

<!-- codependix:start name="codependix-nx-projects" -->
```mermaid
graph LR
  conformetry_cli["conformetry-cli"]
  conformetry_configuration["conformetry-configuration"]
  conformetry_core["conformetry-core"]
  conformetry_examples["conformetry-examples"]
  conformetry_generation["conformetry-generation"]
  conformetry_languages["conformetry-languages"]
  conformetry_nx["conformetry-nx"]
  conformetry_validation["conformetry-validation"]
  synchronization["synchronization"]
  conformetry_cli --> conformetry_configuration
  conformetry_configuration --> conformetry_core
  conformetry_examples --> conformetry_configuration
  conformetry_generation --> conformetry_configuration
  conformetry_languages --> conformetry_configuration
  conformetry_nx --> conformetry_configuration
  conformetry_validation --> conformetry_configuration
  synchronization --> conformetry_configuration
  classDef subject fill:#7c3aed,color:#fff,stroke:#4c1d95,stroke-width:2px
  class conformetry_configuration subject
```
<!-- codependix:end name="codependix-nx-projects" -->

### NestJS Module Graph

<!-- codependix:start name="codependix-nestjs-modules" -->
```mermaid
flowchart LR
  ConfigurationModule
  InputModule
  InstanceDiscoveryModule
  InstanceGroupModule
  RenderingModule
  TemplateDiscoveryModule
  ConfigurationModule --> InputModule
  ConfigurationModule --> InstanceDiscoveryModule
  ConfigurationModule --> InstanceGroupModule
  ConfigurationModule --> RenderingModule
  ConfigurationModule --> TemplateDiscoveryModule
  InstanceDiscoveryModule --> InstanceGroupModule
  InstanceDiscoveryModule --> RenderingModule
  InstanceDiscoveryModule --> TemplateDiscoveryModule
  TemplateDiscoveryModule --> RenderingModule
```
<!-- codependix:end name="codependix-nestjs-modules" -->

### File Imports

<!-- codependix:start name="codependix-file-imports" -->
```mermaid
graph LR
  file_callidescope_config_ts["callidescope.config.ts"]
  file_codependix_config_ts["codependix.config.ts"]
  file_codometer_config_ts["codometer.config.ts"]
  file_eslint_config_ts["eslint.config.ts"]
  file_src_index_ts["src/index.ts"]
  file_src_index_unit_test_ts["src/index.unit.test.ts"]
  file_src_modules_configuration_configuration_constants_ts["src/modules/configuration/configuration.constants.ts"]
  file_src_modules_configuration_configuration_module_ts["src/modules/configuration/configuration.module.ts"]
  file_src_modules_configuration_configuration_module_unit_test_ts["src/modules/configuration/configuration.module.unit.test.ts"]
  file_src_modules_configuration_configuration_service_ts["src/modules/configuration/configuration.service.ts"]
  file_src_modules_configuration_configuration_service_unit_test_ts["src/modules/configuration/configuration.service.unit.test.ts"]
  file_src_modules_configuration_configuration_types_ts["src/modules/configuration/configuration.types.ts"]
  file_src_modules_configuration_configuration_utilities_ts["src/modules/configuration/configuration.utilities.ts"]
  file_src_modules_input_input_options_service_ts["src/modules/input/input-options.service.ts"]
  file_src_modules_input_input_options_service_unit_test_ts["src/modules/input/input-options.service.unit.test.ts"]
  file_src_modules_input_input_prompting_service_ts["src/modules/input/input-prompting.service.ts"]
  file_src_modules_input_input_prompting_service_unit_test_ts["src/modules/input/input-prompting.service.unit.test.ts"]
  file_src_modules_input_input_schema_service_ts["src/modules/input/input-schema.service.ts"]
  file_src_modules_input_input_schema_service_unit_test_ts["src/modules/input/input-schema.service.unit.test.ts"]
  file_src_modules_input_input_constants_ts["src/modules/input/input.constants.ts"]
  file_src_modules_input_input_module_ts["src/modules/input/input.module.ts"]
  file_src_modules_input_input_service_ts["src/modules/input/input.service.ts"]
  file_src_modules_input_input_service_unit_test_ts["src/modules/input/input.service.unit.test.ts"]
  file_src_modules_input_input_types_ts["src/modules/input/input.types.ts"]
  file_src_modules_instance_discovery_instance_discovery_locating_service_ts["src/modules/instance-discovery/instance-discovery-locating.service.ts"]
  file_src_modules_instance_discovery_instance_discovery_locating_service_unit_test_ts["src/modules/instance-discovery/instance-discovery-locating.service.unit.test.ts"]
  file_src_modules_instance_discovery_instance_discovery_matching_service_ts["src/modules/instance-discovery/instance-discovery-matching.service.ts"]
  file_src_modules_instance_discovery_instance_discovery_matching_service_unit_test_ts["src/modules/instance-discovery/instance-discovery-matching.service.unit.test.ts"]
  file_src_modules_instance_discovery_instance_discovery_constants_ts["src/modules/instance-discovery/instance-discovery.constants.ts"]
  file_src_modules_instance_discovery_instance_discovery_module_ts["src/modules/instance-discovery/instance-discovery.module.ts"]
  file_src_modules_instance_discovery_instance_discovery_service_ts["src/modules/instance-discovery/instance-discovery.service.ts"]
  file_src_modules_instance_discovery_instance_discovery_service_unit_test_ts["src/modules/instance-discovery/instance-discovery.service.unit.test.ts"]
  file_src_modules_instance_discovery_instance_discovery_types_ts["src/modules/instance-discovery/instance-discovery.types.ts"]
  file_src_modules_instance_group_instance_group_constants_ts["src/modules/instance-group/instance-group.constants.ts"]
  file_src_modules_instance_group_instance_group_module_ts["src/modules/instance-group/instance-group.module.ts"]
  file_src_modules_instance_group_instance_group_service_ts["src/modules/instance-group/instance-group.service.ts"]
  file_src_modules_instance_group_instance_group_service_unit_test_ts["src/modules/instance-group/instance-group.service.unit.test.ts"]
  file_src_modules_instance_group_instance_group_types_ts["src/modules/instance-group/instance-group.types.ts"]
  file_src_modules_rendering_rendering_constants_ts["src/modules/rendering/rendering.constants.ts"]
  file_src_modules_rendering_rendering_module_ts["src/modules/rendering/rendering.module.ts"]
  file_src_modules_rendering_rendering_service_ts["src/modules/rendering/rendering.service.ts"]
  file_src_modules_rendering_rendering_service_unit_test_ts["src/modules/rendering/rendering.service.unit.test.ts"]
  file_src_modules_rendering_rendering_types_ts["src/modules/rendering/rendering.types.ts"]
  file_src_modules_rendering_rendering_utilities_ts["src/modules/rendering/rendering.utilities.ts"]
  file_src_modules_rendering_rendering_utilities_unit_test_ts["src/modules/rendering/rendering.utilities.unit.test.ts"]
  file_src_modules_template_discovery_template_discovery_constants_ts["src/modules/template-discovery/template-discovery.constants.ts"]
  file_src_modules_template_discovery_template_discovery_module_ts["src/modules/template-discovery/template-discovery.module.ts"]
  file_src_modules_template_discovery_template_discovery_service_ts["src/modules/template-discovery/template-discovery.service.ts"]
  file_src_modules_template_discovery_template_discovery_service_unit_test_ts["src/modules/template-discovery/template-discovery.service.unit.test.ts"]
  file_src_modules_template_discovery_template_discovery_types_ts["src/modules/template-discovery/template-discovery.types.ts"]
  file_testing_mocks_ts["testing/mocks.ts"]
  file_testing_setup_ts["testing/setup.ts"]
  file_vite_config_ts["vite.config.ts"]
  file_vitest_config_ts["vitest.config.ts"]
  file_src_index_unit_test_ts --> file_src_index_ts
  file_src_modules_configuration_configuration_constants_ts --> file_src_modules_configuration_configuration_utilities_ts
  file_src_modules_configuration_configuration_module_ts --> file_src_modules_configuration_configuration_service_ts
  file_src_modules_configuration_configuration_module_ts --> file_src_modules_input_input_module_ts
  file_src_modules_configuration_configuration_module_ts --> file_src_modules_instance_discovery_instance_discovery_module_ts
  file_src_modules_configuration_configuration_module_ts --> file_src_modules_instance_group_instance_group_module_ts
  file_src_modules_configuration_configuration_module_ts --> file_src_modules_rendering_rendering_module_ts
  file_src_modules_configuration_configuration_module_ts --> file_src_modules_template_discovery_template_discovery_module_ts
  file_src_modules_configuration_configuration_module_unit_test_ts --> file_src_modules_configuration_configuration_module_ts
  file_src_modules_configuration_configuration_service_ts --> file_src_modules_configuration_configuration_constants_ts
  file_src_modules_configuration_configuration_service_ts --> file_src_modules_configuration_configuration_types_ts
  file_src_modules_configuration_configuration_service_ts --> file_src_modules_input_input_prompting_service_ts
  file_src_modules_configuration_configuration_service_ts --> file_src_modules_input_input_service_ts
  file_src_modules_configuration_configuration_service_ts --> file_src_modules_input_input_types_ts
  file_src_modules_configuration_configuration_service_ts --> file_src_modules_instance_discovery_instance_discovery_service_ts
  file_src_modules_configuration_configuration_service_ts --> file_src_modules_instance_discovery_instance_discovery_types_ts
  file_src_modules_configuration_configuration_service_ts --> file_src_modules_instance_group_instance_group_service_ts
  file_src_modules_configuration_configuration_service_ts --> file_src_modules_instance_group_instance_group_types_ts
  file_src_modules_configuration_configuration_service_ts --> file_src_modules_rendering_rendering_service_ts
  file_src_modules_configuration_configuration_service_ts --> file_src_modules_rendering_rendering_types_ts
  file_src_modules_configuration_configuration_service_ts --> file_src_modules_template_discovery_template_discovery_service_ts
  file_src_modules_configuration_configuration_service_ts --> file_src_modules_template_discovery_template_discovery_types_ts
  file_src_modules_configuration_configuration_service_unit_test_ts --> file_src_modules_configuration_configuration_constants_ts
  file_src_modules_configuration_configuration_service_unit_test_ts --> file_src_modules_configuration_configuration_service_ts
  file_src_modules_configuration_configuration_service_unit_test_ts --> file_src_modules_configuration_configuration_types_ts
  file_src_modules_configuration_configuration_service_unit_test_ts --> file_src_modules_input_input_prompting_service_ts
  file_src_modules_configuration_configuration_service_unit_test_ts --> file_src_modules_input_input_service_ts
  file_src_modules_configuration_configuration_service_unit_test_ts --> file_src_modules_instance_discovery_instance_discovery_service_ts
  file_src_modules_configuration_configuration_service_unit_test_ts --> file_src_modules_instance_group_instance_group_service_ts
  file_src_modules_configuration_configuration_service_unit_test_ts --> file_src_modules_rendering_rendering_service_ts
  file_src_modules_configuration_configuration_service_unit_test_ts --> file_src_modules_template_discovery_template_discovery_service_ts
  file_src_modules_configuration_configuration_types_ts --> file_src_modules_configuration_configuration_constants_ts
  file_src_modules_configuration_configuration_types_ts --> file_src_modules_instance_group_instance_group_types_ts
  file_src_modules_configuration_configuration_utilities_ts --> file_src_modules_input_input_constants_ts
  file_src_modules_input_input_options_service_ts --> file_src_modules_configuration_configuration_types_ts
  file_src_modules_input_input_options_service_ts --> file_src_modules_input_input_constants_ts
  file_src_modules_input_input_options_service_unit_test_ts --> file_src_modules_input_input_options_service_ts
  file_src_modules_input_input_prompting_service_ts --> file_src_modules_input_input_schema_service_ts
  file_src_modules_input_input_prompting_service_ts --> file_src_modules_input_input_constants_ts
  file_src_modules_input_input_prompting_service_ts --> file_src_modules_input_input_types_ts
  file_src_modules_input_input_prompting_service_unit_test_ts --> file_src_modules_input_input_prompting_service_ts
  file_src_modules_input_input_prompting_service_unit_test_ts --> file_src_modules_input_input_schema_service_ts
  file_src_modules_input_input_schema_service_ts --> file_src_modules_configuration_configuration_types_ts
  file_src_modules_input_input_schema_service_ts --> file_src_modules_input_input_types_ts
  file_src_modules_input_input_schema_service_unit_test_ts --> file_src_modules_input_input_schema_service_ts
  file_src_modules_input_input_module_ts --> file_src_modules_input_input_options_service_ts
  file_src_modules_input_input_module_ts --> file_src_modules_input_input_prompting_service_ts
  file_src_modules_input_input_module_ts --> file_src_modules_input_input_schema_service_ts
  file_src_modules_input_input_module_ts --> file_src_modules_input_input_service_ts
  file_src_modules_input_input_service_ts --> file_src_modules_input_input_options_service_ts
  file_src_modules_input_input_service_ts --> file_src_modules_input_input_prompting_service_ts
  file_src_modules_input_input_service_ts --> file_src_modules_input_input_schema_service_ts
  file_src_modules_input_input_service_ts --> file_src_modules_input_input_constants_ts
  file_src_modules_input_input_service_ts --> file_src_modules_input_input_types_ts
  file_src_modules_input_input_service_unit_test_ts --> file_src_modules_input_input_options_service_ts
  file_src_modules_input_input_service_unit_test_ts --> file_src_modules_input_input_prompting_service_ts
  file_src_modules_input_input_service_unit_test_ts --> file_src_modules_input_input_schema_service_ts
  file_src_modules_input_input_service_unit_test_ts --> file_src_modules_input_input_service_ts
  file_src_modules_input_input_types_ts --> file_src_modules_configuration_configuration_types_ts
  file_src_modules_instance_discovery_instance_discovery_locating_service_ts --> file_src_modules_instance_discovery_instance_discovery_constants_ts
  file_src_modules_instance_discovery_instance_discovery_locating_service_ts --> file_src_modules_instance_discovery_instance_discovery_types_ts
  file_src_modules_instance_discovery_instance_discovery_locating_service_unit_test_ts --> file_src_modules_instance_discovery_instance_discovery_locating_service_ts
  file_src_modules_instance_discovery_instance_discovery_matching_service_ts --> file_src_modules_instance_discovery_instance_discovery_constants_ts
  file_src_modules_instance_discovery_instance_discovery_matching_service_ts --> file_src_modules_instance_discovery_instance_discovery_types_ts
  file_src_modules_instance_discovery_instance_discovery_matching_service_ts --> file_src_modules_rendering_rendering_service_ts
  file_src_modules_instance_discovery_instance_discovery_matching_service_ts --> file_src_modules_rendering_rendering_types_ts
  file_src_modules_instance_discovery_instance_discovery_matching_service_ts --> file_src_modules_rendering_rendering_utilities_ts
  file_src_modules_instance_discovery_instance_discovery_matching_service_ts --> file_src_modules_template_discovery_template_discovery_service_ts
  file_src_modules_instance_discovery_instance_discovery_matching_service_ts --> file_src_modules_template_discovery_template_discovery_types_ts
  file_src_modules_instance_discovery_instance_discovery_matching_service_unit_test_ts --> file_src_modules_instance_discovery_instance_discovery_matching_service_ts
  file_src_modules_instance_discovery_instance_discovery_matching_service_unit_test_ts --> file_src_modules_rendering_rendering_service_ts
  file_src_modules_instance_discovery_instance_discovery_matching_service_unit_test_ts --> file_src_modules_template_discovery_template_discovery_service_ts
  file_src_modules_instance_discovery_instance_discovery_matching_service_unit_test_ts --> file_src_modules_template_discovery_template_discovery_types_ts
  file_src_modules_instance_discovery_instance_discovery_module_ts --> file_src_modules_instance_discovery_instance_discovery_locating_service_ts
  file_src_modules_instance_discovery_instance_discovery_module_ts --> file_src_modules_instance_discovery_instance_discovery_matching_service_ts
  file_src_modules_instance_discovery_instance_discovery_module_ts --> file_src_modules_instance_discovery_instance_discovery_service_ts
  file_src_modules_instance_discovery_instance_discovery_module_ts --> file_src_modules_instance_group_instance_group_module_ts
  file_src_modules_instance_discovery_instance_discovery_module_ts --> file_src_modules_rendering_rendering_module_ts
  file_src_modules_instance_discovery_instance_discovery_module_ts --> file_src_modules_template_discovery_template_discovery_module_ts
  file_src_modules_instance_discovery_instance_discovery_service_ts --> file_src_modules_instance_discovery_instance_discovery_locating_service_ts
  file_src_modules_instance_discovery_instance_discovery_service_ts --> file_src_modules_instance_discovery_instance_discovery_matching_service_ts
  file_src_modules_instance_discovery_instance_discovery_service_ts --> file_src_modules_instance_discovery_instance_discovery_types_ts
  file_src_modules_instance_discovery_instance_discovery_service_ts --> file_src_modules_instance_group_instance_group_service_ts
  file_src_modules_instance_discovery_instance_discovery_service_ts --> file_src_modules_instance_group_instance_group_types_ts
  file_src_modules_instance_discovery_instance_discovery_service_ts --> file_src_modules_template_discovery_template_discovery_service_ts
  file_src_modules_instance_discovery_instance_discovery_service_ts --> file_src_modules_template_discovery_template_discovery_types_ts
  file_src_modules_instance_discovery_instance_discovery_service_unit_test_ts --> file_src_modules_configuration_configuration_types_ts
  file_src_modules_instance_discovery_instance_discovery_service_unit_test_ts --> file_src_modules_instance_discovery_instance_discovery_module_ts
  file_src_modules_instance_discovery_instance_discovery_service_unit_test_ts --> file_src_modules_instance_discovery_instance_discovery_service_ts
  file_src_modules_instance_discovery_instance_discovery_service_unit_test_ts --> file_src_modules_instance_group_instance_group_service_ts
  file_src_modules_instance_discovery_instance_discovery_types_ts --> file_src_modules_configuration_configuration_types_ts
  file_src_modules_instance_discovery_instance_discovery_types_ts --> file_src_modules_rendering_rendering_types_ts
  file_src_modules_instance_discovery_instance_discovery_types_ts --> file_src_modules_template_discovery_template_discovery_types_ts
  file_src_modules_instance_group_instance_group_module_ts --> file_src_modules_instance_group_instance_group_service_ts
  file_src_modules_instance_group_instance_group_service_ts --> file_src_modules_instance_group_instance_group_types_ts
  file_src_modules_instance_group_instance_group_service_unit_test_ts --> file_src_modules_instance_group_instance_group_service_ts
  file_src_modules_rendering_rendering_module_ts --> file_src_modules_rendering_rendering_service_ts
  file_src_modules_rendering_rendering_service_ts --> file_src_modules_rendering_rendering_constants_ts
  file_src_modules_rendering_rendering_service_ts --> file_src_modules_rendering_rendering_types_ts
  file_src_modules_rendering_rendering_service_unit_test_ts --> file_src_modules_rendering_rendering_constants_ts
  file_src_modules_rendering_rendering_service_unit_test_ts --> file_src_modules_rendering_rendering_service_ts
  file_src_modules_rendering_rendering_utilities_ts --> file_src_modules_rendering_rendering_constants_ts
  file_src_modules_rendering_rendering_utilities_unit_test_ts --> file_src_modules_rendering_rendering_utilities_ts
  file_src_modules_template_discovery_template_discovery_module_ts --> file_src_modules_rendering_rendering_module_ts
  file_src_modules_template_discovery_template_discovery_module_ts --> file_src_modules_template_discovery_template_discovery_service_ts
  file_src_modules_template_discovery_template_discovery_service_ts --> file_src_modules_configuration_configuration_types_ts
  file_src_modules_template_discovery_template_discovery_service_ts --> file_src_modules_rendering_rendering_service_ts
  file_src_modules_template_discovery_template_discovery_service_ts --> file_src_modules_rendering_rendering_types_ts
  file_src_modules_template_discovery_template_discovery_service_ts --> file_src_modules_template_discovery_template_discovery_types_ts
  file_src_modules_template_discovery_template_discovery_service_unit_test_ts --> file_src_modules_rendering_rendering_service_ts
  file_src_modules_template_discovery_template_discovery_service_unit_test_ts --> file_src_modules_template_discovery_template_discovery_service_ts
  file_src_modules_template_discovery_template_discovery_service_unit_test_ts --> file_src_modules_template_discovery_template_discovery_types_ts
```
<!-- codependix:end name="codependix-file-imports" -->

<!-- codometer:start -->

## ⏲️ Codometer

### Project

![Lines of Code](https://img.shields.io/badge/Lines_of_Code-5327-22c55e?style=flat-square)
![Repository Size](https://img.shields.io/badge/Repository_Size-181.49_kB-6b7280?style=flat-square)
![Folders](https://img.shields.io/badge/Folders-7-4a4a4a?style=flat-square)
![Source Files](https://img.shields.io/badge/Source_Files-42-3178c6?style=flat-square)

### Measured Targets

![Compiled JavaScript Size](https://img.shields.io/badge/Compiled_JavaScript_Size-26.39_kB_gzip-6b7280?style=flat-square)

### TypeScript

![TypeScript Files](https://img.shields.io/badge/TypeScript_Files-42-3178c6?style=flat-square)
![Interfaces](https://img.shields.io/badge/Interfaces-18-0ea5e9?style=flat-square)
![Generic Declarations](https://img.shields.io/badge/Generic_Declarations-1-0369a1?style=flat-square)
![Enums](https://img.shields.io/badge/Enums-0-f97316?style=flat-square)
![Decorators](https://img.shields.io/badge/Decorators-14-db2777?style=flat-square)
![Doc Comments](https://img.shields.io/badge/Doc_Comments-142-6366f1?style=flat-square)
![Static Methods](https://img.shields.io/badge/Static_Methods-0-166534?style=flat-square)

### JavaScript

![JavaScript Files](https://img.shields.io/badge/JavaScript_Files-0-f7df1e?style=flat-square)
![Test Files](https://img.shields.io/badge/Test_Files-12-10b981?style=flat-square)
![External Packages](https://img.shields.io/badge/External_Packages-15-8b5cf6?style=flat-square)
![Classes](https://img.shields.io/badge/Classes-16-7c3aed?style=flat-square)
![Functions](https://img.shields.io/badge/Functions-284-16a34a?style=flat-square)
![Methods](https://img.shields.io/badge/Methods-107-15803d?style=flat-square)
![Sync Functions](https://img.shields.io/badge/Sync_Functions-301-4ade80?style=flat-square)
![Async Functions](https://img.shields.io/badge/Async_Functions-90-059669?style=flat-square)
![Constants](https://img.shields.io/badge/Constants-266-dc2626?style=flat-square)
![Imports](https://img.shields.io/badge/Imports-167-0284c7?style=flat-square)
![Exported Symbols](https://img.shields.io/badge/Exported_Symbols-56-ea580c?style=flat-square)
![Comments](https://img.shields.io/badge/Comments-267-64748b?style=flat-square)
![Comment Lines](https://img.shields.io/badge/Comment_Lines-729-475569?style=flat-square)
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

![JSON Files](https://img.shields.io/badge/JSON_Files-4-a16207?style=flat-square)
![JSON Lines](https://img.shields.io/badge/JSON_Lines-152-ca8a04?style=flat-square)
![JSON Objects](https://img.shields.io/badge/JSON_Objects-32-7c3aed?style=flat-square)
![JSON Arrays](https://img.shields.io/badge/JSON_Arrays-13-8b5cf6?style=flat-square)
![JSON Properties](https://img.shields.io/badge/JSON_Properties-98-0284c7?style=flat-square)
![JSON Strings](https://img.shields.io/badge/JSON_Strings-83-16a34a?style=flat-square)
![JSON Numbers](https://img.shields.io/badge/JSON_Numbers-1-059669?style=flat-square)
![JSON Booleans](https://img.shields.io/badge/JSON_Booleans-8-0ea5e9?style=flat-square)
![JSON Nulls](https://img.shields.io/badge/JSON_Nulls-0-64748b?style=flat-square)
![JSON Items](https://img.shields.io/badge/JSON_Items-35-475569?style=flat-square)
![JSON Nodes](https://img.shields.io/badge/JSON_Nodes-137-dc2626?style=flat-square)
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

![Module Files](https://img.shields.io/badge/Module_Files-4-7c3aed?style=flat-square)
![Service Files](https://img.shields.io/badge/Service_Files-10-0284c7?style=flat-square)
![Command Files](https://img.shields.io/badge/Command_Files-0-16a34a?style=flat-square)
![Constants Files](https://img.shields.io/badge/Constants_Files-4-ea580c?style=flat-square)
![Types Files](https://img.shields.io/badge/Types_Files-4-db2777?style=flat-square)
![Utilities Files](https://img.shields.io/badge/Utilities_Files-1-0ea5e9?style=flat-square)
![TypeORM Entities](https://img.shields.io/badge/TypeORM_Entities-0-059669?style=flat-square)
![Unit Tests](https://img.shields.io/badge/Unit_Tests-12-ca8a04?style=flat-square)
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
