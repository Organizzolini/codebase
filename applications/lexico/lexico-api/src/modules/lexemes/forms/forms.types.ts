// 🏷️ Types

/**
 * The `Form` columns the API does not expose: the audit and soft-deletion
 * columns, which the schema has never carried for forms, and both sides of
 * the joins to the lexeme and to the words a form surfaces as.
 */
export type FormDatabaseOnlyField =
  | "createdAt"
  | "createdBy"
  | "deletedAt"
  | "deletedBy"
  | "lexeme"
  | "updatedAt"
  | "updatedBy"
  | "wordForms";
