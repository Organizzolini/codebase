/**
 * Returns the object keys as a typed array of the object's known keys.
 */
export function typedObjectKeys<T extends object>(object: T): (keyof T)[] {
  // type-coverage:ignore-next-line
  return Object.keys(object) as (keyof T)[];
}
