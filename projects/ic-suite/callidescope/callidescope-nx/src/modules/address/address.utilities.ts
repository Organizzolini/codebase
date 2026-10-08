// 🛠️ Utilities

import {
  resolveAddressService,
  resolveOptionsService,
} from "../plugin/plugin-context.utilities";
import { resolveExecutorScope } from "../plugin/plugin.utilities";

import type { AddressExecutorOptions } from "../../executors/address.types";
import type { ExecutorContext } from "@nx/devkit";

/**
 * Runs the address lookups on behalf of the `depth` or `breadth` executor.
 *
 * The two differ in a single call, so the scoping, the refusals, and the
 * printing are stated once here rather than twice in the executors — which are
 * left thin enough to read as the declarations Nx treats them as.
 */
export async function runAddressExecutor(args: {
  context: ExecutorContext;
  kind: "breadth" | "depth";
  options: AddressExecutorOptions;
}): Promise<{ success: boolean }> {
  const addresses = (args.options.addresses ?? []).filter(
    (address) => address !== "",
  );

  // Refused rather than prompted for: a task runner has nobody to ask, which
  // is the same reason the command line refuses one there.
  if (addresses.length === 0) {
    throw new Error(
      `The callidescope ${args.kind} executor needs --addresses, as in "--addresses=src/foo.service.ts#FooService.bar".`,
    );
  }

  const scope = await resolveExecutorScope({
    context: args.context,
    label: args.kind,
    options: args.options,
  });
  const optionsService = await resolveOptionsService();
  const addressService = await resolveAddressService();
  const lookupArguments = {
    addresses,
    ...(args.options.configurationPath === undefined
      ? {}
      : { configurationPath: args.options.configurationPath }),
    directories: scope.directories,
    format: optionsService.readFormat(args.options.format),
  };
  const result =
    args.kind === "depth"
      ? await addressService.runDepth(lookupArguments)
      : await addressService.runBreadth(lookupArguments);

  // The report — or the reason the address resolved to nothing — is the
  // executor's product, so it goes to stdout either way.
  process.stdout.write(`${result.report}\n`);

  return { success: result.ok };
}
