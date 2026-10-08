import { AddressLookupService } from "@callidescope/cli";
import { DEFAULT_OUTPUT_FORMAT } from "@callidescope/configuration";
import { AddressDepthService, BreadthService } from "@callidescope/graph";
import { AddressReportService } from "@callidescope/output";
import { Injectable } from "@nestjs/common";

import type { LookupArguments, LookupResult } from "./address.types";
import type { LocatedWorkspace } from "@callidescope/cli";
import type { CallableId } from "@callidescope/core";
import type { BreadthReport } from "@callidescope/output";

/**
 * Answers `depth` and `breadth` about the callables it is named, inside a
 * resolved selection of Nx projects.
 *
 * The lookup itself is callidescope's — this only decides what it is asked
 * about. What the plugin adds is the scope: the CLI resolves an address
 * against the whole workspace, while here it is resolved against one project
 * and its Nx dependencies, which is both faster and the set the address
 * actually belongs to.
 */
@Injectable()
export class AddressService {
  // 🏗 Dependency Injection

  constructor(
    private readonly addressLookupService: AddressLookupService,
    private readonly addressReportService: AddressReportService,
    private readonly addressDepthService: AddressDepthService,
    private readonly breadthService: BreadthService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Matches one address against an already-traced selection, or explains why
   * it could not be.
   *
   * The explanation is returned rather than logged: an executor's product is
   * what it writes to stdout, and a reader looking at a failed task needs the
   * reason in the same place the report would have been.
   */
  private identify(args: {
    address: string;
    workspace: LocatedWorkspace;
  }): { id: CallableId } | { problem: string } {
    const resolution = this.addressLookupService.resolve(args);
    const problem = this.addressLookupService.describeProblem({
      address: args.address,
      resolution,
    });

    if (problem !== undefined || resolution.kind !== "resolved") {
      return { problem: problem ?? `"${args.address}" resolved to nothing.` };
    }

    // Wrapped rather than returned as `CallableId | string`: `CallableId` is
    // itself a string, so a bare union could not tell an id from a problem
    // and read every resolved address as a failed one.
    return { id: resolution.id };
  }

  /**
   * Traces the selection, then matches every address against it.
   *
   * All or nothing, the way the command line is: a task that printed the
   * addresses it understood and skipped the rest would report a partial
   * answer under a `success` nobody asked it to qualify.
   */
  private async locate(args: LookupArguments): Promise<
    | string
    | {
        identified: { address: string; id: CallableId }[];
        workspace: LocatedWorkspace;
      }
  > {
    const workspace = await this.addressLookupService.locate({
      ...(args.configurationPath === undefined
        ? {}
        : { config: args.configurationPath }),
      directories: [...args.directories],
      ...(args.format === undefined ? {} : { format: args.format }),
    });
    const identified: { address: string; id: CallableId }[] = [];
    const problems: string[] = [];

    for (const address of args.addresses) {
      const found = this.identify({ address, workspace });

      if ("problem" in found) {
        problems.push(found.problem);
        continue;
      }

      identified.push({ address, id: found.id });
    }

    return problems.length > 0
      ? problems.join("\n")
      : { identified, workspace };
  }

  // 🌎 Public Methods

  /** Prints each callable's direct callers and callees, side by side. */
  public async runBreadth(args: LookupArguments): Promise<LookupResult> {
    const located = await this.locate(args);

    if (typeof located === "string") {
      return { ok: false, report: located };
    }

    const { identified, workspace } = located;
    const { located: traced } = workspace;
    const reports: BreadthReport[] = [];

    for (const { address, id } of identified) {
      const callable = traced.callablesById.get(id);

      if (callable === undefined) {
        return {
          ok: false,
          report: `"${address}" resolved to a callable that was not traced.`,
        };
      }

      reports.push({
        address,
        directCalls: this.breadthService.describeDirectCalls({
          callablesById: traced.callablesById,
          graph: traced.graph,
          id,
        }),
        displayName: callable.node.displayName,
        id,
        location: callable.node.location,
      });
    }

    return {
      ok: true,
      report: this.addressReportService.renderBreadthReports({
        format: args.format ?? DEFAULT_OUTPUT_FORMAT,
        reports,
      }),
    };
  }

  /** Prints every call stack above and below each callable. */
  public async runDepth(args: LookupArguments): Promise<LookupResult> {
    const located = await this.locate(args);

    if (typeof located === "string") {
      return { ok: false, report: located };
    }

    const { identified, workspace } = located;

    return {
      ok: true,
      report: this.addressReportService.renderDepthReports({
        format: args.format ?? DEFAULT_OUTPUT_FORMAT,
        reports: identified.map(({ address, id }) => {
          const stackArguments = {
            callablesById: workspace.located.callablesById,
            graph: workspace.located.graph,
            startId: id,
          };

          return {
            address,
            downward:
              this.addressDepthService.buildDownwardStacks(stackArguments),
            upward: this.addressDepthService.buildUpwardStacks(stackArguments),
          };
        }),
      }),
    };
  }
}
