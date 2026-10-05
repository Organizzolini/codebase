import { Injectable } from "@nestjs/common";
import ts from "typescript";

import { LoggerService } from "@codebase/logging";

import { AddressService } from "../callables/address.service";

import {
  BARREL_FILE_SUFFIX,
  BOOTSTRAP_FILE_SUFFIX,
  BOOTSTRAP_FUNCTION_NAMES,
  COMMAND_RUNNER_METHOD_NAME,
  LIFECYCLE_METHOD_NAMES,
} from "./entries.constants";

import type { DiscoveredCallable } from "../callables/callables.types";
import type {
  ClassificationPassArguments,
  EntryPointCollection,
  EntryPointPassArguments,
  ProjectEntryRules,
  ResolveEntriesArguments,
  UnresolvedEntryPointAddress,
} from "./entries.types";
import type { ResolvedCallidescopeEntryPoints } from "@callidescope/configuration";
import type {
  CallableId,
  EntryPoint,
  EntryPointKind,
} from "@callidescope/core";

/**
 * Decides which callables are the roots of a call stack.
 *
 * This is where the tool is most likely to be wrong, and the numbers it reports
 * are only as meaningful as this list. Most code in a repository like this one
 * is never called by anything inside it — a framework calls it. So the roots
 * have to be named, and anything missed would silently vanish from every
 * measurement rather than fail loudly.
 *
 * A configuration can also name a root outright, by the same address the
 * lookup commands take, for the surface no rule here can infer. Those are
 * additive: they never turn a rule off.
 *
 * Orphan promotion is the guard against exactly that. After the named rules
 * run, anything with no caller left in the graph becomes a root anyway, so a
 * rule this list is missing shows up as an orphan instead of as a hole.
 */
@Injectable()
export class EntriesService {
  // 🏗 Dependency Injection

  constructor(
    private readonly addressService: AddressService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(EntriesService.name);
  }

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Classifies a callable's declaration, or leaves it unrooted. */
  private classify(args: {
    callable: DiscoveredCallable;
    rules: ProjectEntryRules;
  }): EntryPointKind | undefined {
    const { declaration, node } = args.callable;

    if (
      this.hasConfiguredDecorator({
        decorators: args.rules.decorators,
        node: declaration,
      })
    ) {
      return "decorated-method";
    }

    if (LIFECYCLE_METHOD_NAMES.has(node.memberName)) {
      return "lifecycle";
    }

    if (this.isCommandRunnerMethod({ ...args, declaration })) {
      return "decorated-method";
    }

    if (this.isBootstrapFunction(node.location.filePath, node.memberName)) {
      return "module-bootstrap";
    }

    return args.rules.includeExportedFunctions &&
      node.isExported &&
      node.location.filePath.endsWith(BARREL_FILE_SUFFIX)
      ? "exported-function"
      : undefined;
  }

  /** Roots every callable one of the entry-point rules recognizes. */
  private classifyEveryCallable(args: ClassificationPassArguments): void {
    for (const callable of args.resolveArguments.callablesById.values()) {
      const kind = this.classify({
        callable,
        rules: this.readRules(args, callable),
      });

      if (kind !== undefined) {
        args.entryPoints.push({ callableId: callable.node.id, kind });
        args.claimed.add(callable.node.id);
      }
    }
  }

  /** True when a node carries one of the configured framework decorators. */
  private hasConfiguredDecorator(args: {
    decorators: ReadonlySet<string>;
    node: ts.Node;
  }): boolean {
    return this.readDecoratorNames(args.node).some((name) =>
      args.decorators.has(name),
    );
  }

  /** True when a function is a module's own runtime entry point. */
  private isBootstrapFunction(filePath: string, memberName: string): boolean {
    return (
      filePath.endsWith(BOOTSTRAP_FILE_SUFFIX) &&
      BOOTSTRAP_FUNCTION_NAMES.has(memberName)
    );
  }

  /** True when a method is the entry point of a decorated command class. */
  private isCommandRunnerMethod(args: {
    callable: DiscoveredCallable;
    declaration: ts.Node;
    rules: ProjectEntryRules;
  }): boolean {
    if (args.callable.node.memberName !== COMMAND_RUNNER_METHOD_NAME) {
      return false;
    }

    const owner = ts.findAncestor(args.declaration, ts.isClassDeclaration);

    return (
      owner !== undefined &&
      this.hasConfiguredDecorator({
        decorators: args.rules.decorators,
        node: owner,
      })
    );
  }

  /**
   * Every configuration whose declared addresses a run must resolve, paired
   * with the project that wrote it.
   *
   * The workspace configuration is one of them and has no project to name, so
   * it is listed once under `undefined` rather than repeated for each project
   * that inherits it — which would resolve one address as many times as there
   * are projects, and report one mistake as several.
   */
  private listDeclaringConfigurations(
    args: ResolveEntriesArguments,
  ): [string | undefined, ResolvedCallidescopeEntryPoints][] {
    return [[undefined, args.entryPoints], ...args.entryPointsByProject];
  }

  /** Roots whatever neither a rule nor a declaration claimed, and nothing calls. */
  private promoteOrphans(args: ClassificationPassArguments): void {
    for (const callable of args.resolveArguments.callablesById.values()) {
      const callers =
        args.resolveArguments.graph.callerIdsByCallee.get(callable.node.id) ??
        [];

      if (
        !args.claimed.has(callable.node.id) &&
        callers.length === 0 &&
        this.readRules(args, callable).includeOrphans
      ) {
        args.entryPoints.push({
          callableId: callable.node.id,
          kind: "orphan-root",
        });
        args.claimed.add(callable.node.id);
      }
    }
  }

  /** Reads the names of the decorators applied to a node. */
  private readDecoratorNames(node: ts.Node): string[] {
    if (!ts.canHaveDecorators(node)) {
      return [];
    }

    return (ts.getDecorators(node) ?? []).map((decorator) => {
      const { expression } = decorator;
      const callee = ts.isCallExpression(expression)
        ? expression.expression
        : expression;

      return ts.isIdentifier(callee) ? callee.text : "";
    });
  }

  /**
   * The rules the project owning a callable is judged by.
   *
   * Positional rather than an options object, unlike almost everything else
   * here: it is asked once per callable in each of two passes, and building an
   * argument object for every one of them is thousands of allocations to say
   * what two names already say.
   */
  private readRules(
    args: ClassificationPassArguments,
    callable: DiscoveredCallable,
  ): ProjectEntryRules {
    return (
      args.rulesByProject.get(callable.node.projectName) ?? args.defaultRules
    );
  }

  /**
   * Roots one declared address, or reports why it named no single callable.
   *
   * Resolved through the service the `depth` and `breadth` commands use, so
   * the `:<line>` disambiguator and every refusal behave here exactly as they
   * do at a prompt. An address landing on a callable something already
   * claimed adds no second root: the two are one callable under two
   * spellings, and roots are deduplicated by the callable, never by the text.
   */
  private rootDeclaredAddress(
    args: EntryPointPassArguments & {
      address: string;
      projectName: string | undefined;
    },
  ): undefined | UnresolvedEntryPointAddress {
    const resolution = this.addressService.resolve({
      address: args.address,
      callablesById: args.resolveArguments.callablesById,
      workspaceRoot: args.resolveArguments.workspaceRoot,
    });

    if (resolution.kind !== "resolved") {
      return {
        address: args.address,
        projectName: args.projectName,
        resolution,
      };
    }

    if (!args.claimed.has(resolution.id)) {
      args.entryPoints.push({ callableId: resolution.id, kind: "declared" });
      args.claimed.add(resolution.id);
    }

    return undefined;
  }

  /** Roots every declared address, collecting the ones that resolved to nothing. */
  private rootDeclaredAddresses(
    args: EntryPointPassArguments,
  ): UnresolvedEntryPointAddress[] {
    const unresolvedAddresses: UnresolvedEntryPointAddress[] = [];

    for (const [projectName, entryPoints] of this.listDeclaringConfigurations(
      args.resolveArguments,
    )) {
      for (const address of entryPoints.addresses) {
        const unresolved = this.rootDeclaredAddress({
          address,
          projectName,
          ...args,
        });

        if (unresolved !== undefined) {
          unresolvedAddresses.push(unresolved);
        }
      }
    }

    return unresolvedAddresses;
  }

  /** Reads one configuration's entry-point rules into what classification needs. */
  private toRules(
    entryPoints: ResolvedCallidescopeEntryPoints,
  ): ProjectEntryRules {
    return {
      decorators: new Set(entryPoints.decorators),
      includeExportedFunctions: entryPoints.includeExportedFunctions,
      includeOrphans: entryPoints.includeOrphans,
    };
  }

  // 🌎 Public Methods

  /**
   * Resolves every root a run will measure depth from.
   *
   * Three passes, in this order. The rules run first, so a callable one of
   * them already rooted keeps the kind saying *why* something calls it.
   * Declared addresses run next, rooting whatever the rules did not reach.
   * Orphan promotion runs last, over what neither claimed.
   *
   * Every pass reads the rules of the project owning the callable, so a
   * package's own entry points hold wherever the run started from — a leaf
   * pulled in through another project's dependency closure is judged by its
   * own configuration, not by whoever reached it.
   */
  public resolve(args: ResolveEntriesArguments): EntryPointCollection {
    const entryPoints: EntryPoint[] = [];
    const claimed = new Set<CallableId>();
    const pass = { claimed, entryPoints, resolveArguments: args };
    const classification = {
      ...pass,
      defaultRules: this.toRules(args.entryPoints),
      rulesByProject: new Map(
        [...args.entryPointsByProject].map(([projectName, rules]) => [
          projectName,
          this.toRules(rules),
        ]),
      ),
    };

    this.classifyEveryCallable(classification);

    const unresolvedAddresses = this.rootDeclaredAddresses(pass);

    this.promoteOrphans(classification);

    this.logger.info("🔭 Resolved entry points", undefined, {
      total: entryPoints.length,
    });

    return { entryPoints, unresolvedAddresses };
  }
}
