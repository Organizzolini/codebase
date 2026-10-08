/**
 * The tail two of this package's deep stacks share.
 *
 * A single stack drawn on its own is a straight line, and a straight line is a
 * list with extra steps. Two stacks ending here converge in the mermaid
 * diagram, which is the shape a picture shows and an indented tree cannot.
 */
export function roundToCents(amount: number): number {
  return Math.round(amount * 100) / 100;
}
