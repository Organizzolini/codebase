// 🏷️ Types

/**
 * A directory entry read from the source template tree.
 */
export interface DirectoryEntry {
  isDirectory: boolean;
  name: string;
}

/**
 * Filesystem operations used by the runtime.
 *
 * Exists so a host with a virtual filesystem — an Nx generator `Tree`, for
 * instance — can run generation without touching disk. The default
 * implementation reads and writes directly.
 */
export interface FileSystemAdapter {
  listDirectory(directoryPath: string): Promise<DirectoryEntry[]>;
  makeDirectory(directoryPath: string): Promise<void>;
  readFile(filePath: string): Promise<string>;
  writeFile(filePath: string, content: string): Promise<void>;
}

/**
 * Formatting applied once generation completes.
 *
 * The default is a no-op: formatting is the host's concern, and a plain CLI
 * run leaves files to the workspace formatter.
 */
export interface FormatterAdapter {
  formatFiles(filePaths: string[]): Promise<void>;
}

/**
 * Generator metadata and runtime configuration.
 */
export interface GeneratorDefinition {
  description?: string;
  hooks?: GeneratorHooks;
  name: string;
  templateDirectoryPath: string;
}

/**
 * A generator hook function.
 */
export type GeneratorHook = (
  context: GeneratorHookContext,
) => Promise<void> | void;

/**
 * Data exposed to generator hooks.
 */
export interface GeneratorHookContext {
  definition: GeneratorDefinition;
  generatedFilePaths: string[];
  input: Record<string, string>;
  outputDirectoryPath: string;
  substitutions: Record<string, string>;
}

/**
 * Generator lifecycle hooks.
 */
export interface GeneratorHooks {
  postGenerate?: GeneratorHook;
  preGenerate?: GeneratorHook;
}

/**
 * Arguments accepted by the runtime runner.
 */
export interface RunGeneratorArguments {
  definition: GeneratorDefinition;
  filesystem?: FileSystemAdapter;
  formatter?: FormatterAdapter;
  inputs?: Record<string, string | undefined>;
  /**
   * The directory the template's tree is rendered into.
   *
   * A template that should produce a folder contains that folder, so this is
   * the folder's parent. Nothing here derives a path — the caller decides
   * where an instance goes, because that is workspace knowledge.
   */
  instancePath: string;
}

/**
 * Result returned by the runtime runner.
 */
export interface RunGeneratorResult {
  generatedFilePaths: string[];
  outputDirectoryPath: string;
}
