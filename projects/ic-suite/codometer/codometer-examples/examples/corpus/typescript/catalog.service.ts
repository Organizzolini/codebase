import { type Repository } from "./orders.types.js";

/** Something the catalog sells. */
export interface CatalogItem {
  identifier: string;
  name: string;
  price: number;
}

/**
 * Reads catalog items.
 *
 * Carries the counting trap worth knowing about: `blank` is written as a class
 * field holding an arrow function, so it is a static **property** rather than a
 * static method, and a counter asking for `kinds: ["method"]` with
 * `modifiers: ["static"]` does not find it.
 */
export class CatalogService implements Repository<CatalogItem> {
  private readonly items = new Map<string, CatalogItem>();

  /** Builds an item with nothing filled in. A static property, not a method. */
  public static readonly blank = (identifier: string): CatalogItem => ({
    identifier,
    name: "",
    price: 0,
  });

  /** Reads one catalog item, or nothing where the catalog has none. */
  public find(identifier: string): CatalogItem | undefined {
    return this.items.get(identifier);
  }
}
