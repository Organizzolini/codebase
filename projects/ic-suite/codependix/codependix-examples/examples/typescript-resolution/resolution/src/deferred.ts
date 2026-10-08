/** A dynamic `import()` is a call expression, not a declaration — no edge. */
export async function loadSettings(): Promise<unknown> {
  return import("./settings.js");
}
