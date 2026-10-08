import { ConfigurationService } from "@callidescope/configuration";
import { Injectable } from "@nestjs/common";

import type { CallidescopeConfiguration } from "@callidescope/configuration";

/**
 * The same injected hop as `injected-dependency`, made across a package
 * boundary.
 *
 * `ConfigurationService` is declared in `@callidescope/configuration`, a
 * workspace package this one depends on. A run scoped to this package alone
 * follows the call into that declaration only because the dependency is in the
 * run's closure — without it, `readDepthLimit` is the last frame there is.
 */
@Injectable()
export class DependencyClosureService {
  // 🏗 Dependency Injection

  constructor(private readonly configurationService: ConfigurationService) {}

  // 🔏 Private Methods

  /** Reads the depth limit the dependency's own defaulting settles on. */
  private readDepthLimit(configuration: CallidescopeConfiguration): number {
    return this.configurationService.resolveConfiguration(configuration).limits
      .maximumDepth;
  }

  // 🌎 Public Methods

  /** Whether a configuration allows a stack as deep as the one asked about. */
  public allowsDepth(args: {
    configuration: CallidescopeConfiguration;
    depth: number;
  }): boolean {
    return args.depth <= this.readDepthLimit(args.configuration);
  }
}
