// 🏷️ Types

/** Conventional commit configuration loaded from conventional.config.cjs. */
export interface ConventionalConfig {
  scopes: Scope[];
  types: Type[];
}

/** Entry with value and description for markdown tables. */
export interface EntryWithDescription {
  description: string;
  value: string;
}

/** Type configuration in presetConfig from release.config.cjs. */
export interface PresetConfigType {
  hidden?: boolean;
  section: string;
  type: string;
}

/** Release configuration structure from release.config.cjs. */
export interface ReleaseConfig {
  plugins: [
    [string, { releaseRules: ReleaseRule[] }],
    [string, { presetConfig: { types: PresetConfigType[] } }],
    ...unknown[],
  ];
}

/** Release rule configuration from release.config.cjs. */
export interface ReleaseRule {
  breaking?: boolean;
  release: false | string;
  revert?: boolean;
  scope?: string;
  type?: string;
}

/** Scope entry from conventional.config.cjs. */
export interface Scope {
  description: string;
  name: string;
}

/** Shared values derived once per run and passed to mode handlers. */
export interface SyncContext {
  config: ConventionalConfig;
  scopeNames: string[];
  settingsScopes: string[];
  typeNames: string[];
}

/** Type entry from conventional.config.cjs. */
export interface Type {
  code: string;
  description: string;
  emoji: string;
  name: string;
}
