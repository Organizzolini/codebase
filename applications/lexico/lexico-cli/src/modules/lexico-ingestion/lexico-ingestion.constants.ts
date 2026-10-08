// ♟️ Constants

/**
 * Sentinel UUID identifying the lexico-ingestion process as the author of
 * all records it creates or updates. Used for `createdBy` / `updatedBy`.
 */
export const LEXICO_INGESTION_BY_ID = "02e585d7-e8b0-412c-b9a8-0e5a65820ea7";

/**
 * The value behind an option prompt's "All" or "None" entry. `prompts` falls
 * back to a choice's title when its value is falsy, so a `null` value would
 * come back as the string "None" rather than as no selection.
 */
export const NO_SELECTION_CHOICE = "__no-selection__";
