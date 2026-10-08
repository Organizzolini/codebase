import { ObjectType } from "@nestjs/graphql";

import { InflectionType } from "./inflection.entities";

import type { GraphQLObjectOf } from "../../../lexico-api.types";
import type { InflectionDatabaseOnlyField } from "./inflections.types";
import type { UninflectedInflection } from "@codebase/lexico-entities";

/** The marker for a lexeme that does not inflect. */
@ObjectType("UninflectedInflection", { implements: InflectionType })
export class UninflectedInflectionType
  extends InflectionType
  implements
    GraphQLObjectOf<
      UninflectedInflection,
      UninflectedInflectionType,
      InflectionDatabaseOnlyField
    > {}
