// ♟️ Constants

/**
 * Says an override flag has nothing to override.
 *
 * Mirrors `@callidescope/configuration`'s `buildUndeclaredValueMessage`
 * exactly: a flag may change a value the configuration already declares and
 * may not supply one it left out. `--include`/`--exclude` are checked
 * against the configuration as authored, before `include`/`exclude` are
 * defaulted — so a configuration that never wrote the field is refused even
 * though the resolved value is never itself `undefined`.
 */
export const buildUndeclaredOverrideMessage = (args: {
  field: string;
  flag: string;
}): string =>
  `${args.flag} overrides a value the configuration does not declare. Add \`${args.field}\` to the configuration this run reads, then use ${args.flag} to change it.`;
