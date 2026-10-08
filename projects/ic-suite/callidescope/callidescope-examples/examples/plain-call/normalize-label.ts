/** Trims a label and collapses the whitespace inside it. */
export function normalizeLabel(label: string): string {
  return label.trim().replaceAll(/\s+/gu, " ");
}
