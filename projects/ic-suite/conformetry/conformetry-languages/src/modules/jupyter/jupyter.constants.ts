// ♟️ Constants

import type { LanguageValidatorDescriptor } from "@conformetry/core";

/** Extensions the Jupyter validator claims. */
export const JUPYTER_VALIDATOR_FILE_EXTENSIONS = [".ipynb"];

/** Identifies the Jupyter language to the orchestrator and the `--languages` filter. */
export const JUPYTER_VALIDATOR_DESCRIPTOR: LanguageValidatorDescriptor = {
  description:
    "Checks Jupyter notebook structure, markdown cells, and code cells",
  fileExtensions: JUPYTER_VALIDATOR_FILE_EXTENSIONS,
  name: "jupyter",
};

/**
 * Notebook keys compared structurally.
 *
 * Cell contents are validated by the markdown and Python validators instead,
 * so the structural pass covers only the envelope — kernel, language, format
 * version — and deliberately not `cells`, whose diff would be unreadable.
 */
export const NOTEBOOK_ENVELOPE_KEYS = [
  "metadata",
  "nbformat",
  "nbformat_minor",
];
