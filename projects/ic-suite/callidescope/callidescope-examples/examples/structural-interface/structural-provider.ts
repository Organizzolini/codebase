import { Injectable } from "@nestjs/common";

/**
 * A provider declared with arrow-typed properties and satisfied structurally.
 *
 * Every member is a property holding an arrow, not a method signature, and no
 * class in this package writes `implements StructuralProvider`. A nominal-only
 * index finds nothing here; the checker finds the class anyway.
 */
export interface StructuralProvider {
  ingest: (document: string) => number;
}

/**
 * Satisfies `StructuralProvider` without saying so.
 *
 * There is no `implements` keyword and no method — only a readonly property
 * holding an arrow, which is the shape this repository actually writes.
 */
@Injectable()
export class FilesystemProviderService {
  // 🔑 Public Fields

  /** Counts the words one document contributes. */
  public readonly ingest = (document: string): number =>
    document.split(" ").length;
}
