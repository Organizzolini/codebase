import { Injectable } from "@nestjs/common";

import {
  CONFORMETRY_ERROR_LANGUAGES,
  CONFORMETRY_ERROR_TYPES,
  DEFAULT_CONFORMETRY_ERROR_TYPE,
} from "./differences.constants";

import type {
  BuildMissingDirectoryErrorArguments,
  BuildMissingFileErrorArguments,
} from "./differences.types";
import type {
  ConformetryDifference,
  ConformetryDifferenceLanguage,
  ConformetryDifferenceType,
} from "@conformetry/core";

/**
 * Builds and narrows structured conformance differences.
 *
 * Every validator funnels through here so that error wording, the `fix`
 * suggestion, and the location fields stay consistent across languages. The
 * `resolve*` guards additionally narrow untrusted payloads — notably the JSON
 * emitted by the Python validator bridge, whose fields cross a process
 * boundary and cannot be trusted to match the TypeScript types.
 */
@Injectable()
export class DifferencesService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  // 🌎 Public Methods

  /**
   * Builds the error raised when a template directory has no counterpart in
   * the instance tree. Carries no `language`, since a missing directory is not
   * attributable to any one file format.
   */
  public buildMissingDirectoryDifference(
    args: BuildMissingDirectoryErrorArguments,
  ): ConformetryDifference {
    return {
      differenceType: "directory",
      fix: `Create the directory ${args.instanceDirectoryPath} to match the template at ${args.templateDirectoryPath}.`,
      message: `Missing directory: ${args.instanceDirectoryPath}`,
    };
  }

  /**
   * Builds the error raised when a template file has no counterpart in the
   * instance tree. This is the one check that runs for every template file
   * regardless of extension, so extension-less files such as `.gitignore` are
   * covered too.
   */
  public buildMissingFileDifference(
    args: BuildMissingFileErrorArguments,
  ): ConformetryDifference {
    return {
      differenceType: "file",
      fix: `Create the file using the generator, or manually from the template at ${args.templateFilePath}.`,
      message: `Missing file: ${args.instanceFilePath}`,
    };
  }

  /**
   * Narrows an untrusted value to a known error category, falling back to
   * `"code"`. Falling back rather than throwing keeps one malformed error from
   * failing an entire validation run.
   */
  public resolveDifferenceType(value: unknown): ConformetryDifferenceType {
    return (
      CONFORMETRY_ERROR_TYPES.find(
        (differenceType) => differenceType === value,
      ) ?? DEFAULT_CONFORMETRY_ERROR_TYPE
    );
  }

  /**
   * Narrows an untrusted value to a known error language, returning
   * `undefined` when it matches none. Callers omit the field entirely rather
   * than storing a bogus language.
   */
  public resolveErrorLanguage(
    value: unknown,
  ): ConformetryDifferenceLanguage | undefined {
    return CONFORMETRY_ERROR_LANGUAGES.find((language) => language === value);
  }
}
