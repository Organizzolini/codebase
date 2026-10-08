import { Author, Line, Text, Token } from "@codebase/lexico-entities";

import { LiteratureRelationsLoader } from "../src/modules/literature/literature-relations.loader";
import { LiteratureRelationsService } from "../src/modules/literature/literature-relations.service";
import { LiteratureService } from "../src/modules/literature/literature.service";

import type { DatabaseTestingModule } from "@codebase/database/testing";

/** The literature services a resolver is handed, over a real database. */
export interface LiteratureServices {
  /** A fresh relations loader, standing in for one GraphQL request's. */
  readonly createLoader: () => LiteratureRelationsLoader;
  readonly service: LiteratureService;
}

/**
 * Builds the literature services over a migrated test database's
 * repositories, the way the module wires them, without booting Nest.
 */
export function createLiteratureServices(
  database: DatabaseTestingModule,
): LiteratureServices {
  const relations = new LiteratureRelationsService(
    database.repository(Line),
    database.repository(Text),
    database.repository(Token),
  );

  return {
    createLoader: () => new LiteratureRelationsLoader(relations),
    service: new LiteratureService(
      database.repository(Author),
      database.repository(Line),
      database.repository(Text),
      database.repository(Token),
    ),
  };
}
