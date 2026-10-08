import { Injectable } from "@nestjs/common";

import type { StructuralProvider } from "./structural-provider.js";

/**
 * Calls an interface member and reaches a class that never declared itself.
 *
 * `provider.ingest(…)` names a property on an interface. Callidescope expands
 * it to every class whose instance type satisfies the declaring type, capped
 * by the implementation-candidate cap.
 */
@Injectable()
export class StructuralInterfaceService {
  // 🌎 Public Methods

  /** Ingests one document through whatever satisfies the interface. */
  public ingestDocument(
    provider: StructuralProvider,
    document: string,
  ): number {
    return provider.ingest(document);
  }
}
