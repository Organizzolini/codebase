import path from "node:path";
import { fileURLToPath } from "node:url";

import { NeighborhoodService } from "@codependix/nx-projects";
import { Injectable } from "@nestjs/common";

import {
  FRAME_POSITION,
  NODE_MODULES_SEGMENT,
  STACK_FRAME_PREFIX,
} from "./boundary-check.constants";

import type {
  BoundaryCheckFailure,
  CollectFailureArguments,
} from "./boundary-check.types";
import type { NxProject } from "@codependix/nx-projects";

/**
 * Turns an error a graph builder raised into the failure a run reports.
 *
 * The failure is charged to the project whose graph was being built — a
 * container that cannot boot fails that project, whichever class broke it.
 * What the message alone cannot say is whose class that was: NestJS
 * containers are booted by `import()`, and a module that fails evaluation in
 * a dependency rethrows the same error into every project importing it. The
 * stack still holds the frame that threw, so the first frame inside the root
 * of a project the charged ones depend on names the project that owns the
 * failing code.
 *
 * Only their dependency closure: when codependix runs from source, its own
 * packages are workspace projects too, and an error it raises itself would
 * otherwise blame whichever of them threw.
 */
@Injectable()
export class BoundaryFailureService {
  // 🏗 Dependency Injection

  constructor(private readonly neighborhoodService: NeighborhoodService) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * The project whose root holds a file, the innermost when roots nest — or
   * nothing for a file no project holds, or one inside `node_modules`.
   */
  private findProjectHolding(
    filePath: string,
    workspaceProjects: readonly NxProject[],
  ): string | undefined {
    if (filePath.includes(NODE_MODULES_SEGMENT)) {
      return undefined;
    }

    const holders = workspaceProjects.filter((project) =>
      filePath.startsWith(`${project.absoluteRoot}${path.sep}`),
    );

    return holders.toSorted(
      (first, second) => second.absoluteRoot.length - first.absoluteRoot.length,
    )[0]?.name;
  }

  /**
   * The location one stack line names, without its line and column — or
   * nothing for a line that is not a frame, or a frame naming no position.
   *
   * String operations rather than a regular expression: a stack is library
   * input, and every single-pattern reading of both frame shapes backtracks
   * in polynomial time on a crafted line.
   */
  private readFrameLocation(line: string): string | undefined {
    const frame = line.trim();

    if (!frame.startsWith(STACK_FRAME_PREFIX)) return undefined;

    const body = frame.slice(STACK_FRAME_PREFIX.length);
    const location = body.endsWith(")")
      ? body.slice(body.lastIndexOf("(") + 1, -1)
      : body;
    const columnAt = location.lastIndexOf(":");
    const lineAt = location.lastIndexOf(":", columnAt - 1);
    const isPositioned =
      lineAt > 0 &&
      FRAME_POSITION.test(location.slice(lineAt + 1, columnAt)) &&
      FRAME_POSITION.test(location.slice(columnAt + 1));

    return isPositioned ? location.slice(0, lineAt) : undefined;
  }

  /**
   * The absolute file path one stack line names, or nothing for a line that
   * is not a frame or names no file — a `node:` internal, say, or a `file:`
   * URL that is no path on this machine, which `fileURLToPath` throws on.
   * The frame is dropped rather than the failure it belongs to: a stack is
   * library input, and a malformed line must not hide what broke.
   */
  private readFramePath(line: string): string | undefined {
    const location = this.readFrameLocation(line);

    if (location?.startsWith("file:") === true) {
      try {
        return fileURLToPath(location);
      } catch {
        return undefined;
      }
    }

    return location !== undefined && path.isAbsolute(location)
      ? location
      : undefined;
  }

  /**
   * The project owning the first stack frame inside the root of a project
   * the charged ones transitively depend on, themselves included.
   *
   * The first such frame rather than any: frames below it are whatever was
   * importing the failing module, which is every project that depends on it.
   * A frame in any other project is skipped — that project is not something
   * the charged ones are built from, so it cannot be what broke them.
   */
  private resolveOwnerProject(
    args: CollectFailureArguments,
  ): string | undefined {
    const closure = new Set(
      this.neighborhoodService.resolveDependencyClosure(
        args.graph,
        args.projects,
      ),
    );
    const candidates = args.workspaceProjects.filter((project) =>
      closure.has(project.name),
    );
    const stack = args.error instanceof Error ? (args.error.stack ?? "") : "";

    for (const line of stack.split("\n")) {
      const framePath = this.readFramePath(line);
      const owner =
        framePath === undefined
          ? undefined
          : this.findProjectHolding(framePath, candidates);

      if (owner !== undefined) {
        return owner;
      }
    }

    return undefined;
  }

  // 🌎 Public Methods

  /**
   * Collects one graph's failure, charged to the projects it was built for.
   *
   * `ownerProject` is set only when the stack resolves to a project that is
   * not already charged: naming the charged project a second time says
   * nothing, and naming a guess would blame a project that did nothing wrong.
   */
  public collect(args: CollectFailureArguments): BoundaryCheckFailure {
    const owner = this.resolveOwnerProject(args);

    return {
      error:
        args.error instanceof Error ? args.error.message : String(args.error),
      level: args.level,
      ...(owner !== undefined &&
        !args.projects.includes(owner) && { ownerProject: owner }),
      projects: args.projects,
    };
  }
}
