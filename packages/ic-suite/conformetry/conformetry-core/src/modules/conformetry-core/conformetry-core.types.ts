// 🏷️ Types

/**
 * A structured conformance error produced by any validator.
 *
 * Two discriminating fields identify the error category:
 * - `differenceType` — what kind of element is missing
 * - `language` — which validator / file format produced the error.
 *
 * All differences represent a *missing* or *mismatched* element; there is no
 * separate action field. Consumers render these through `ReportingService`
 * rather than formatting them ad hoc, so every validator reports identically.
 */
export interface ConformetryDifference {
  /** Actual value found in the instance (populated for value-mismatch differences). */
  readonly actual?: string;
  /** Category of missing element. */
  readonly differenceType: ConformetryDifferenceType;
  /** Snippet of the template content that should be present in the instance. */
  readonly expected?: string;
  /** One-line actionable suggestion for the reader (human or coding agent). */
  readonly fix: string;
  /** 1-based column number in the instance file where the error was detected. */
  readonly instanceColumn?: number;
  /** 1-based line number in the instance file where the error was detected. */
  readonly instanceLine?: number;
  /** JSON dot-notation path in the instance document, e.g. `"scripts.build[0]"`. */
  readonly instancePath?: string;
  /**
   * File format of the validator that produced this error.
   * Absent for `"file"` and `"directory"` differences.
   */
  readonly language?: ConformetryDifferenceLanguage;
  /** Short human-readable description of what is missing. */
  readonly message: string;
  /** 1-based column number in the rendered template that defines the requirement. */
  readonly templateColumn?: number;
  /** 1-based line number in the rendered template that defines the requirement. */
  readonly templateLine?: number;
  /** JSON dot-notation path in the template document. */
  readonly templatePath?: string;
  /**
   * How many template requirements this one finding accounts for.
   *
   * A validator reports a missing element once, however much of the template
   * that element contained: deleting a class is one error, not one per member.
   * The weight restores the proportion — a missing class stands in for its
   * whole subtree, a missing import stands only for itself — so an instance's
   * score reflects how much of the template is actually absent.
   *
   * Defaults to 1 when absent, which is right for any leaf requirement.
   */
  readonly weight?: number;
}

/**
 * The language / file format processed by the validator that produced the
 * error. Absent for `"file"` and `"directory"` differences, which are language
 * agnostic and raised by the file-existence pass.
 */
export type ConformetryDifferenceLanguage =
  | "javascript"
  | "json"
  | "markdown"
  | "python"
  | "text"
  | "typescript";

/**
 * Category of the element that caused the conformance failure.
 *
 * `"instance"` is the odd one out: it does not name a missing element inside a
 * file but a directory or file the caller declared to be generated code, which
 * conformetry could not attribute to any single template. `"placeholder"`
 * names a template placeholder whose value no instance node revealed.
 */
export type ConformetryDifferenceType =
  | "code"
  | "comment"
  | "directory"
  | "file"
  | "instance"
  | "placeholder";
// 🏷️ Types

/**
 * A validator for one language or file format.
 *
 * Implementations supply only their descriptor and a single-document
 * comparison. Extension filtering, result grouping, and result assembly are
 * handled once by `RunnerService`, so no validator repeats that envelope.
 *
 * Not to be confused with an Nx plugin — this is the contract between
 * `conformetry-validation` and the Language modules in `conformetry-languages`,
 * such as its TypeScript module.
 */
export interface ConformetryLanguageValidator {
  readonly descriptor: LanguageValidatorDescriptor;
  /**
   * Compares one already-rendered template against its instance and returns
   * every difference, plus how much was asked of the instance. Called only for
   * documents whose extension this validator claims, so implementations never
   * need to re-check the extension.
   */
  validateDocument(
    document: PreparedValidationDocument,
  ): DocumentValidationResult;
}

/**
 * What comparing one document produced: the differences, and the size of the
 * requirement the comparison weighed them against.
 *
 * The total is reported even when nothing is wrong. A conforming document is
 * still evidence — it is the part of the instance that *did* honour its
 * template — and leaving it out of the denominator would score an instance
 * only against the files it got wrong.
 */
export interface DocumentValidationResult {
  /**
   * What each placeholder value in the rendered template stood for, keyed by
   * the value: the text of the instance node the comparison aligned with the
   * template node holding it, first occurrence first. Absent when a language
   * captures nothing.
   */
  readonly captures?: Readonly<Record<string, string>>;
  readonly differences: ConformetryDifference[];
  /** Combined weight of the template requirements this document imposes. */
  readonly totalWeight: number;
}

/**
 * How well one matched instance honours the template it was matched to.
 *
 * Lives in core rather than beside the orchestrator because reporting renders
 * it and the orchestrator produces it, and a shape shared by two layers is
 * exactly what the leaf package is for.
 */
export interface InstanceScore {
  /** Combined weight of the requirements this instance failed. */
  readonly failedWeight: number;
  readonly instancePath: string;
  /** Whether the score reached the threshold that applies to this instance. */
  readonly ok: boolean;
  /** Share of the template's requirements honoured, from 0 to 1. */
  readonly score: number;
  readonly templateName: string;
  /** The threshold that applied, after resolving every level. */
  readonly threshold: number;
  /** Combined weight of the requirements that were checked. */
  readonly totalWeight: number;
}
// 🏷️ Types

/**
 * One instance found on disk, paired with the templates that explain it.
 *
 * Lives in core for the same reason [[InstanceScore]] does: discovery produces
 * it and the output layer renders it, so the shape belongs to neither side.
 */
export interface InventoriedInstance {
  /** Where the instance is, including its name stem. */
  readonly path: string;
  /** Templates that explain this instance, best fit first. */
  readonly templates: InventoriedPairing[];
}

/**
 * How well one template and one instance fit each other.
 *
 * The ratio is file overlap, not conformance: it says how much of a template's
 * structure an instance has, never how faithfully those files honour it.
 */
export interface InventoriedPairing {
  readonly matchedFileCount: number;
  /** Share of the template's files the instance already has, 0 to 1. */
  readonly matchRatio: number;
  /** The other side of the pairing — a template name or an instance path. */
  readonly name: string;
  readonly templateFileCount: number;
}

/** One declared template, paired with the instances it explains. */
export interface InventoriedTemplate {
  readonly description: string;
  /** Instances this template explains, empty when nothing matched it. */
  readonly instances: InventoriedPairing[];
  readonly name: string;
  readonly templatePath: string;
}

/** Identifies a language validator and declares which files it claims. */
export interface LanguageValidatorDescriptor {
  /** Human-readable summary shown in CLI help and reports. */
  readonly description?: string;
  /** Extensions this validator claims, including the leading dot. */
  readonly fileExtensions: readonly string[];
  /** Stable identifier, also usable as a `--languages` filter value. */
  readonly name: string;
}

/** Outcome of running one language validator over a document set. */
export interface LanguageValidatorResult {
  readonly checkedPaths: string[];
  readonly fileResults: ValidationFileResult[];
  readonly languageName: string;
  readonly ok: boolean;
  /**
   * Combined weight of every document this validator claimed, conforming ones
   * included — see `DocumentValidationResult.totalWeight`.
   */
  readonly totalWeight: number;
}

/**
 * A template file paired with the instance file it governs, with the template
 * already rendered against the project's substitutions. Producing these is
 * `conformetry-configuration`'s job; validators only compare them.
 *
 * A document exists only when both sides are present on disk — missing files
 * are reported by the file-existence pass before validators ever run.
 */
export interface PreparedValidationDocument {
  /** Basename of the instance file, used to pick a parser. */
  readonly filename: string;
  /** Verbatim contents of the instance file. */
  readonly instance: string;
  /** Absolute path to the instance file, used in error messages. */
  readonly instanceFilePath: string;
  /** Template contents after substitutions have been applied. */
  readonly renderedTemplate: string;
  /** Absolute path to the source template, used in error messages. */
  readonly templateFilePath: string;
}

/** The document pairs discovered for one validation run. */
export interface PreparedValidationPayload {
  readonly checkedPaths: string[];
  readonly documents: PreparedValidationDocument[];
}
// 🏷️ Types

/**
 * Every error found in one instance file, kept grouped by file so reports can
 * print a per-file heading with its originating template.
 */
export interface ValidationFileResult {
  readonly differences: ConformetryDifference[];
  readonly filename: string;
  readonly instanceFilePath: string;
  readonly templateFilePath: string;
  /** Combined weight of the template requirements checked in this file. */
  readonly totalWeight: number;
}
