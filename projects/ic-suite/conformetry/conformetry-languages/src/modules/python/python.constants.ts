// ♟️ Constants

import type { LanguageValidatorDescriptor } from "@conformetry/core";

/**
 * Weight assumed for a bridge finding that declares none.
 *
 * Right for any leaf requirement, and the only safe assumption for a payload
 * that crossed a process boundary without one.
 */
export const DEFAULT_BRIDGE_WEIGHT = 1;

/**
 * Extensions the Python validator claims.
 *
 * Notebooks are deliberately absent — `.ipynb` is a JSON envelope containing
 * markdown and code cells, so the Jupyter module owns it and calls back into
 * this module for the code cells alone.
 */
export const PYTHON_VALIDATOR_FILE_EXTENSIONS = [".py"];

/** Identifies the Python language to the orchestrator and the `--languages` filter. */
export const PYTHON_VALIDATOR_DESCRIPTOR: LanguageValidatorDescriptor = {
  description: "Checks Python structure and comments against templates",
  fileExtensions: PYTHON_VALIDATOR_FILE_EXTENSIONS,
  name: "python",
};

/** Interpreter used to run the validator bridge. */
export const PYTHON_EXECUTABLE = "python3";

/** Module the bridge is invoked as, resolved against the package's `src`. */
export const PYTHON_BRIDGE_MODULE = "python.bridge";

/** Guidance shown when the interpreter is missing or the bridge fails. */
export const PYTHON_UNAVAILABLE_FIX =
  "Install Python 3 and ensure `python3` is on PATH; conformetry validates Python files through the interpreter's own ast module.";
