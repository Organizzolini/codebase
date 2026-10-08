import path from "node:path";

import { Injectable } from "@nestjs/common";

import {
  PROJECT_CONFIGURATION_NESTED_FIELD_NAMES,
  PROJECT_CONFIGURATION_PERMITTED_FIELD_NAMES,
  PROJECT_CONFIGURATION_REQUIRED_FIELDS,
  ProjectConfigurationError,
  ProjectConfigurationFieldNotPermittedError,
  ProjectConfigurationIncompleteError,
  ProjectConfigurationMissingError,
} from "./configuration.constants";

import type { ConfigurationFileReader } from "./configuration-file.types";
import type {
  CallidescopeConfiguration,
  CallidescopeLimitOverrides,
  LoadedProjectConfiguration,
  LoadProjectConfigurationsArguments,
  ProjectLimits,
  ProjectLimitsLookup,
  ResolveProjectLimitsArguments,
} from "./configuration.types";

/**
 * Resolves the configuration file sitting beside each traced project.
 *
 * Its own service rather than more of `ConfigurationFileService`, because the two
 * answer different questions: one loads the file a run was pointed at, and this
 * one asks which of a run's projects configure themselves. Every refusal a
 * project configuration can earn belongs here, where the project it names is
 * already in hand.
 */
@Injectable()
export class ProjectConfigurationService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Refuses a project configuration that leaves any field out.
   *
   * Walked against `authored`, the file exactly as written, for the same reason
   * the permission check is: resolution manufactures every field for every
   * project, so asking the resolved object whether a field is missing can never
   * say yes.
   */
  private assertComplete(
    loadedConfiguration: LoadedProjectConfiguration,
  ): void {
    const field = this.findMissingField(loadedConfiguration.authored);

    if (field === undefined) {
      return;
    }

    throw new ProjectConfigurationIncompleteError({
      field,
      project: loadedConfiguration.project,
    });
  }

  /**
   * Refuses a project configuration that sets a field only the workspace
   * configuration may set.
   */
  private assertNoForbiddenFields(
    loadedConfiguration: LoadedProjectConfiguration,
  ): void {
    const field = this.findForbiddenField(loadedConfiguration.authored);

    if (field === undefined) {
      return;
    }

    throw new ProjectConfigurationFieldNotPermittedError({
      field,
      project: loadedConfiguration.project,
    });
  }

  /**
   * Reads the limits one project's own configuration declares.
   *
   * The whole object comes from that one file, because completeness means both
   * numbers were written in it. There is nothing left to fall back to and
   * nothing to fall back per field: a project that declared no breadth limit
   * wrote `maximumBreadth: undefined`, which is a decision rather than a gap.
   */
  private buildProjectLimits(args: {
    overrides: CallidescopeLimitOverrides | undefined;
    projectConfiguration: LoadedProjectConfiguration;
  }): ProjectLimits {
    const { limits } = args.projectConfiguration.configuration;

    return {
      maximumBreadth: this.overrideLimit({
        declared: limits.maximumBreadth,
        override: args.overrides?.maximumBreadth,
      }),
      maximumDepth:
        this.overrideLimit({
          declared: limits.maximumDepth,
          override: args.overrides?.maximumDepth,
        }) ?? limits.maximumDepth,
      path: args.projectConfiguration.path,
    };
  }

  /**
   * Reads the limits the workspace file itself declares.
   *
   * These are the numbers `projectDefaults` carries into every project's file,
   * and the ones the directory holding the workspace configuration is judged
   * by — that being the one project which cannot write a file of its own.
   *
   * The file is named only when it really wrote a limit. `maximumDepth` is
   * defaulted during resolution, so a path stamped unconditionally would name a
   * file for a number that file never mentions.
   */
  private buildWorkspaceLimits(
    args: ResolveProjectLimitsArguments,
  ): ProjectLimits {
    // Already overridden: the run's own configuration is what the flags were
    // resolved against, so re-applying them here would be the second answer to
    // a number this service exists to give one answer to.
    const { maximumBreadth, maximumDepth } = args.workspaceConfiguration.limits;

    const authored = args.workspaceAuthoredLimits;
    const wroteALimit =
      authored?.maximumBreadth !== undefined ||
      authored?.maximumDepth !== undefined;

    return {
      maximumBreadth,
      maximumDepth,
      path: wroteALimit ? args.workspaceConfigurationPath : undefined,
    };
  }

  /**
   * Finds the first field a project's own configuration sets that only the
   * workspace configuration may set.
   *
   * Checked against `authored`, the file exactly as written, never against the
   * resolved configuration: resolution manufactures every field for every
   * project, so asking the resolved object whether it "has" a field can never
   * say no.
   *
   * The file's own fields are walked and each is asked whether it is
   * permitted, rather than a list of forbidden ones being looked for. That is
   * what makes the check fail closed: a field nothing classifies — a tenth one
   * added upstream, a name somebody misspelled — is refused by name instead of
   * being accepted and then quietly doing nothing.
   */
  private findForbiddenField(
    authored: CallidescopeConfiguration,
  ): string | undefined {
    // Widened before it is walked, because a field name read off a file is a
    // string and the interface has no index signature to read it through.
    const fields: Readonly<Record<string, unknown>> = { ...authored };

    for (const [field, value] of Object.entries(fields)) {
      if (value === undefined) {
        continue;
      }

      const forbidden = PROJECT_CONFIGURATION_NESTED_FIELD_NAMES.has(field)
        ? this.findForbiddenMember({ field, value })
        : this.readForbiddenField(field);

      if (forbidden !== undefined) {
        return forbidden;
      }
    }

    return undefined;
  }

  /**
   * Finds the first member a project set inside a field classified one member
   * at a time.
   *
   * The dotted name is what comes back — `write.json` rather than `write` —
   * because the field alone would send a reader to delete a block half of
   * which they are entitled to keep.
   *
   * A value that is not an object at all is refused under the field's own
   * name. The schema has already rejected every such file by the time this
   * runs, so this is the guard that makes the walk total rather than a branch
   * with a story behind it.
   */
  private findForbiddenMember(args: {
    field: string;
    value: unknown;
  }): string | undefined {
    if (typeof args.value !== "object" || args.value === null) {
      return args.field;
    }

    // Widened the same way the field walk above is, and for the same reason: a
    // member name read off a file is a string, and `Object.entries` over a bare
    // `object` hands back values nothing has typed.
    const members: Readonly<Record<string, unknown>> = { ...args.value };

    for (const [member, memberValue] of Object.entries(members)) {
      const name = `${args.field}.${member}`;

      if (
        memberValue !== undefined &&
        !PROJECT_CONFIGURATION_PERMITTED_FIELD_NAMES.has(name)
      ) {
        return name;
      }
    }

    return undefined;
  }

  /**
   * Finds the first name a project's configuration leaves out.
   *
   * A field is checked for presence rather than for a value, so a project
   * writing `maximumBreadth: undefined` or `mermaid: undefined` has spoken.
   * Those two are the whole reason presence and value are kept apart: each is a
   * project saying it gates no breadth, or publishes no diagram, and an absent
   * field could never distinguish either from a project that forgot.
   *
   * A field present but not an object is reported under its own name, which is
   * unreachable through the schema and is what makes the walk total.
   */
  private findMissingField(
    authored: CallidescopeConfiguration,
  ): string | undefined {
    // Widened before it is walked, because the required names are strings and
    // the interface has no index signature to read them through.
    const fields: Readonly<Record<string, unknown>> = { ...authored };

    for (const [field, members] of Object.entries(
      PROJECT_CONFIGURATION_REQUIRED_FIELDS,
    )) {
      if (!(field in fields)) {
        return field;
      }

      const value = fields[field];

      if (members.length === 0) {
        continue;
      }

      if (typeof value !== "object" || value === null) {
        return field;
      }

      const missing = members.find((member) => !(member in value));

      if (missing !== undefined) {
        return `${field}.${missing}`;
      }
    }

    return undefined;
  }

  /**
   * Reads one project's configuration file.
   *
   * Every failure the read can produce — a file nothing can parse, a shape the
   * schema rejects — is rethrown naming the project, because a run resolves a
   * file per project and a bare parse error says nothing about which one to go
   * and fix.
   */
  private async loadProjectConfiguration(args: {
    configurationPath: string;
    project: string;
    reader: ConfigurationFileReader;
  }): Promise<LoadedProjectConfiguration> {
    try {
      const loaded = await args.reader.loadConfigurationFile({
        configurationPath: args.configurationPath,
      });

      return {
        authored: loaded.authored,
        configuration: loaded.configuration,
        // The path the loader settled on, never the one it was handed: a named
        // path is resolved before it is read, and the file that was read is the
        // one every later rule has to be talking about.
        path: loaded.path,
        project: args.project,
      };
    } catch (error) {
      throw new ProjectConfigurationError({
        cause: error,
        configurationPath: args.configurationPath,
        project: args.project,
      });
    }
  }

  /**
   * Applies one command-line limit override to one project's declared limit.
   *
   * The precedence rule, at the level a limit is actually enforced: a project
   * that declared the limit is judged by the flag instead, and a project that
   * declared none keeps no limit at all. A flag may override what a project chose
   * and may not choose for a project that chose nothing — which for breadth is
   * the whole difference between a run `--check breadth` can gate and one it
   * refuses.
   */
  private overrideLimit(args: {
    declared: number | undefined;
    override: number | undefined;
  }): number | undefined {
    return args.declared === undefined
      ? undefined
      : (args.override ?? args.declared);
  }

  /** The name of a whole field a project may not set, or nothing when it may. */
  private readForbiddenField(field: string): string | undefined {
    return PROJECT_CONFIGURATION_PERMITTED_FIELD_NAMES.has(field)
      ? undefined
      : field;
  }

  // 🌎 Public Methods

  /**
   * Resolves the configuration file sitting at each project's own root — the
   * directory holding the `tsconfig.json` that makes it a project.
   *
   * A traced project with no file of its own is refused. That is the whole
   * point of the arrangement: what a project is judged by is written in that
   * project's own file, so a project with no file has nothing written down and
   * a reader has no second file to go and resolve it against.
   *
   * The file must also be complete — every field present, `undefined` written
   * where a project means to publish nothing or gate nothing. A project spreads
   * the workspace's `projectDefaults` to get there in one line, which is what
   * makes completeness cheap enough to require. What it may **not** spread is
   * the workspace configuration itself: that object carries fields only the
   * workspace may set, and `findForbiddenField` below refuses the file for the
   * first one it finds.
   *
   * The file a run was pointed at is skipped, and the project holding it is
   * exempt from the two rules above, because that file is already serving as
   * the run's workspace configuration. One file, one role per run — reading it
   * a second time as a project's would refuse it for the workspace-only fields
   * it legitimately sets, and no second file can sit beside it under a name
   * discovery would find. That project is judged by the workspace's own limits,
   * which `resolveLimits` reports for it.
   */
  public async loadProjectConfigurations(
    args: LoadProjectConfigurationsArguments,
    reader: ConfigurationFileReader,
  ): Promise<LoadedProjectConfiguration[]> {
    const workspaceConfigurationPath =
      args.workspaceConfigurationPath === undefined
        ? undefined
        : path.resolve(args.workspaceRoot, args.workspaceConfigurationPath);

    const loaded: LoadedProjectConfiguration[] = [];

    for (const project of args.projects) {
      const configurationPath = reader.findConfigurationFileAt(
        path.resolve(args.workspaceRoot, project),
      );

      if (configurationPath === undefined) {
        throw new ProjectConfigurationMissingError(project);
      }

      if (configurationPath === workspaceConfigurationPath) {
        continue;
      }

      const projectConfiguration = await this.loadProjectConfiguration({
        configurationPath,
        project,
        reader,
      });
      this.assertNoForbiddenFields(projectConfiguration);
      this.assertComplete(projectConfiguration);
      loaded.push(projectConfiguration);
    }

    return loaded;
  }

  /**
   * Resolves the depth and breadth limits every traced project is judged
   * against, each carrying the file its number was written in.
   *
   * Every number comes from the project's own file, because loading refuses a
   * project whose file is absent or incomplete. Nothing is inherited and
   * nothing is merged — the workspace's numbers reach a project by being
   * spread into its file, where a reader can see them, rather than by being
   * resolved behind one.
   *
   * The one project handed the workspace's own limits is the directory holding
   * the workspace configuration, which cannot write a second file under a name
   * discovery would find.
   *
   * One resolver rather than one per reader. A gate and a listing that each
   * worked this out for themselves could disagree about the same number, and a
   * limit two answers can be given for is worse than no limit.
   */
  public resolveLimits(
    args: ResolveProjectLimitsArguments,
  ): ProjectLimitsLookup {
    const workspace = this.buildWorkspaceLimits(args);
    const limitsByProject = new Map(
      args.projectConfigurations.map((projectConfiguration) => [
        projectConfiguration.project,
        this.buildProjectLimits({
          overrides: args.limitOverrides,
          projectConfiguration,
        }),
      ]),
    );

    return {
      byProject: new Map(
        args.projects.map((project) => [
          project,
          limitsByProject.get(project) ?? workspace,
        ]),
      ),
      workspace,
    };
  }
}
