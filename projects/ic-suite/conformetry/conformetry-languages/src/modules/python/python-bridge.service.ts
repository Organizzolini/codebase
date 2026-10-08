import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { Injectable } from "@nestjs/common";

import { DifferencesService } from "../differences/differences.service";
import { ScoringService } from "../scoring/scoring.service";

import {
  DEFAULT_BRIDGE_WEIGHT,
  PYTHON_BRIDGE_MODULE,
  PYTHON_EXECUTABLE,
  PYTHON_UNAVAILABLE_FIX,
} from "./python.constants";

import type {
  PythonBridgeError,
  PythonBridgeResponse,
  RunPythonBridgeArguments,
} from "./python.types";
import type {
  ConformetryDifference,
  DocumentValidationResult,
} from "@conformetry/core";

/* v8 ignore start -- the decorator helper emits a branch no test can reach */
/**
 * Runs Python conformance checks through the Python interpreter.
 *
 * Python's syntax tree is only available from Python, so structural validation
 * shells out to a small module shipped inside this package rather than
 * approximating it with a line comparison. The subprocess is synchronous
 * because callers are, and because one file's validation has nothing to
 * overlap with.
 */
@Injectable()
/* v8 ignore stop */
export class PythonBridgeService {
  // 🏗 Dependency Injection

  constructor(
    private readonly errorsService: DifferencesService,
    private readonly scoringService: ScoringService,
  ) {}

  // 🔐 Private Fields

  /**
   * Directory holding the `python` package, resolved from this module rather
   * than from the workspace root, so the bridge is found the same way whether
   * conformetry runs from a checkout or from `node_modules`.
   */
  private readonly pythonRootPath = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "..",
    "..",
  );

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Wraps a bridge failure as a reportable error rather than throwing.
   *
   * Weighed as a single failed requirement out of one: the file could not be
   * checked at all, so claiming any particular proportion of it conforms would
   * be an invention.
   */
  private buildBridgeError(message: string): DocumentValidationResult {
    return {
      differences: [
        {
          differenceType: "code",
          fix: PYTHON_UNAVAILABLE_FIX,
          language: "python",
          message,
        },
      ],
      totalWeight: 1,
    };
  }

  /** Reads the optional location fields, omitting any the bridge left out. */
  private readLocations(
    error: PythonBridgeError,
  ): Partial<ConformetryDifference> {
    const instanceColumn = this.readNumber(error, "instance_column");
    const instanceLine = this.readNumber(error, "instance_line");
    const templateColumn = this.readNumber(error, "template_column");
    const templateLine = this.readNumber(error, "template_line");

    return {
      ...(instanceColumn === undefined ? {} : { instanceColumn }),
      ...(instanceLine === undefined ? {} : { instanceLine }),
      ...(templateColumn === undefined ? {} : { templateColumn }),
      ...(templateLine === undefined ? {} : { templateLine }),
    };
  }

  /** Narrows an untrusted numeric field from the bridge payload. */
  private readNumber(
    error: PythonBridgeError,
    key: string,
  ): number | undefined {
    const value = error[key];

    return typeof value === "number" ? value : undefined;
  }

  /** Narrows an untrusted string field from the bridge payload. */
  private readString(
    error: PythonBridgeError,
    key: string,
  ): string | undefined {
    const value = error[key];

    return typeof value === "string" ? value : undefined;
  }

  /** Reads the optional expected and actual values. */
  private readValues(error: PythonBridgeError): Partial<ConformetryDifference> {
    const actual = this.readString(error, "actual");
    const expected = this.readString(error, "expected");

    return {
      ...(actual === undefined ? {} : { actual }),
      ...(expected === undefined ? {} : { expected }),
    };
  }

  /** Maps one snake_case bridge error onto the shared error shape. */
  private toConformetryDifference(
    error: PythonBridgeError,
  ): ConformetryDifference {
    return {
      ...this.readValues(error),
      ...this.readLocations(error),
      differenceType: this.errorsService.resolveDifferenceType(
        error["difference_type"],
      ),
      fix: this.readString(error, "fix") ?? "Fix the conformance issue.",
      language:
        this.errorsService.resolveErrorLanguage(error["language"]) ?? "python",
      message:
        this.readString(error, "message") ?? "Python conformance issue found.",
      weight: this.readNumber(error, "weight") ?? DEFAULT_BRIDGE_WEIGHT,
    };
  }

  // 🌎 Public Methods

  /**
   * Compares one Python source against its rendered template.
   *
   * A missing interpreter, a crashed bridge, or unreadable output are all
   * reported as conformance differences: they mean this file could not be checked,
   * which the run should surface, but they must not abort validation of every
   * other file.
   */
  public validatePythonSource(
    args: RunPythonBridgeArguments,
  ): DocumentValidationResult {
    const result = spawnSync(PYTHON_EXECUTABLE, ["-m", PYTHON_BRIDGE_MODULE], {
      cwd: this.pythonRootPath,
      encoding: "utf8",
      // eslint-disable-next-line unicorn/prevent-abbreviations
      env: { ...process.env, PYTHONPATH: this.pythonRootPath },
      input: JSON.stringify(args),
    });

    if (result.error !== undefined) {
      return this.buildBridgeError(
        `Could not run ${PYTHON_EXECUTABLE}: ${result.error.message}`,
      );
    }

    if (result.status !== 0) {
      return this.buildBridgeError(
        `Python validator exited with status ${String(result.status)}: ${result.stderr || result.stdout}`,
      );
    }

    try {
      const payload = JSON.parse(result.stdout) as PythonBridgeResponse;
      const differences = payload.differences.map((error) => {
        return this.toConformetryDifference(error);
      });

      return {
        differences,
        totalWeight:
          typeof payload.total_weight === "number"
            ? payload.total_weight
            : // A bridge that reported findings but no total is broken in a
              // way that would otherwise inflate the score to 1; charge the
              // findings against themselves instead.
              this.scoringService.sumWeights(differences),
      };
    } catch {
      return this.buildBridgeError(
        "Python validator returned output that could not be parsed.",
      );
    }
  }
}
