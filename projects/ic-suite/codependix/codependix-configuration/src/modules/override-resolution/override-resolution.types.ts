// 🏷️ Types

import type {
  CodependixConfiguration,
  CodependixConfigurationOverrides,
  ResolvedCodependixConfiguration,
} from "../configuration/configuration.types";

/** Arguments accepted when applying `--include`/`--exclude` overrides. */
export interface ApplyOverridesArguments {
  /** The configuration exactly as parsed, before any default is applied. */
  authored: CodependixConfiguration;
  overrides: CodependixConfigurationOverrides | undefined;
  /** The configuration with every default already applied. */
  resolved: ResolvedCodependixConfiguration;
}
