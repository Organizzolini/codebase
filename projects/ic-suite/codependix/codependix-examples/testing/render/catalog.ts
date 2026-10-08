import { buildAnchorDocuments } from "./anchor-placement";
import { buildBoundaryDocuments } from "./boundary-rules";
import { buildConfigurationDocuments } from "./configuration";
import { buildDeliveryDocuments } from "./export-delivery";
import { buildGraphLevelDocuments } from "./graph-levels";
import { buildNestjsDocuments } from "./nestjs-graphs";
import { buildNxDocuments } from "./nx-graphs";
import { buildPathQueriesDocuments } from "./path-queries";
import { buildPythonDocuments } from "./python-imports";
import { EXAMPLE_ORDER } from "./reading-order";
import { buildTypescriptDocuments } from "./typescript-imports";

import type { ExampleDocument } from "./types";

// 📇 Collecting

/** Collects every example document, in the order the guides read them. */
export async function collectDocuments(): Promise<ExampleDocument[]> {
  return orderDocuments([
    ...(await buildGraphLevelDocuments()),
    ...buildNxDocuments(),
    ...(await buildNestjsDocuments()),
    ...buildTypescriptDocuments(),
    ...buildPythonDocuments(),
    ...(await buildConfigurationDocuments()),
    ...(await buildDeliveryDocuments()),
    ...buildAnchorDocuments(),
    ...buildBoundaryDocuments(),
    ...(await buildPathQueriesDocuments()),
  ]);
}

/**
 * Puts the built documents into reading order, refusing any disagreement.
 *
 * A document whose `id` is missing from `EXAMPLE_ORDER` would otherwise be
 * silently dropped from the run — rendered nowhere, checked by nothing, and
 * invisible until a reader followed a link that was never written.
 */
export function orderDocuments(
  documents: ExampleDocument[],
): ExampleDocument[] {
  const byId = new Map(documents.map((document) => [document.id, document]));
  const ordered = EXAMPLE_ORDER.map((id) => byId.get(id)).filter(
    (document) => document !== undefined,
  );

  if (ordered.length !== documents.length) {
    throw new Error("EXAMPLE_ORDER and the built documents disagree.");
  }

  return ordered;
}
