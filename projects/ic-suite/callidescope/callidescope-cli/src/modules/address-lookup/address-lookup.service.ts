import { ConfigurationService } from "@callidescope/configuration";
import { AddressService } from "@callidescope/graph";
import { Injectable } from "@nestjs/common";

import { CallidescopeService } from "../callidescope/callidescope.service";

import { ADDRESS_NOT_FOUND_ADVICE } from "./address-lookup.constants";

import type {
  LocatedWorkspace,
  ResolveAddressArguments,
} from "./address-lookup.types";
import type { AddressCommandOptions } from "@callidescope/configuration";
import type { CallableAddressResolution } from "@callidescope/graph";

/**
 * Resolves `depth` and `breadth`'s callable address into a callable, sharing
 * every step the two commands would otherwise duplicate: loading the
 * configuration, tracing the workspace, and matching the address against
 * what was found.
 */
@Injectable()
export class AddressLookupService {
  // 🏗 Dependency Injection

  constructor(
    private readonly addressService: AddressService,
    private readonly callidescopeService: CallidescopeService,
    private readonly configurationService: ConfigurationService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  // 🌎 Public Methods

  /**
   * States why a resolution cannot be acted on, or nothing when it can.
   *
   * One message per failure kind rather than a generic "not found": an
   * invalid address, an address matching nothing, and an address matching
   * several declarations are each fixed a different way, and only the message
   * for the one that actually happened tells the caller which.
   *
   * The candidates of an ambiguous address are rendered by `AddressService`,
   * the same renderer the workspace run's own refusal prints, so one concept
   * reaches a reader one way — as an address they can paste back, rather than
   * a file location they cannot.
   */
  public describeProblem(args: {
    address: string;
    resolution: CallableAddressResolution;
  }): string | undefined {
    const { resolution } = args;

    if (resolution.kind === "resolved") {
      return undefined;
    }

    if (resolution.kind === "invalid") {
      return resolution.reason;
    }

    if (resolution.kind === "not-found") {
      return `No callable matches "${args.address}". ${ADDRESS_NOT_FOUND_ADVICE}`;
    }

    return `"${args.address}" matches more than one declaration. ${this.addressService.describeCandidates(
      { address: args.address, candidates: resolution.candidates },
    )}`;
  }

  /**
   * Every callable the trace found, written as an address that resolves to it.
   *
   * What a prompt completes against, so a caller picks from what is actually
   * there rather than recalling a qualified name it has no way to look up.
   */
  public listAddresses(workspace: LocatedWorkspace): string[] {
    return this.addressService.listAddresses(workspace.located.callablesById);
  }

  /** Loads the configuration and traces the workspace, matching nothing yet. */
  public async locate(
    options: AddressCommandOptions,
  ): Promise<LocatedWorkspace> {
    const {
      authoredLimits,
      configuration,
      configurationPath,
      format,
      workspaceRoot,
    } = await this.configurationService.prepareLookup(options);
    const located = await this.callidescopeService.locate({
      authoredLimits,
      configuration,
      configurationPath,
      // The flag and the configured list were already merged by the one
      // resolver that does that, so this reads the answer rather than
      // choosing between them a second way.
      directories: configuration.directories,
      workspaceRoot,
    });

    return { configuration, format, located, workspaceRoot };
  }

  /** Matches an address against a workspace already traced. */
  public resolve(args: ResolveAddressArguments): CallableAddressResolution {
    return this.addressService.resolve({
      address: args.address,
      callablesById: args.workspace.located.callablesById,
      workspaceRoot: args.workspace.workspaceRoot,
    });
  }
}
