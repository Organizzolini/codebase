import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { Form } from "@codebase/lexico-entities";

import { WordsModule } from "../words/words.module";

import { FormsBuilderGuardsService } from "./forms-builder-guards.service";
import { FormsBuilderVerbService } from "./forms-builder-verb.service";
import { FormsBuilderService } from "./forms-builder.service";
import { FormsTransientWordsService } from "./forms-transient-words.service";
import { FormsService } from "./forms.service";

/**
 * Forms ingestion and entity management module.
 *
 * Coordinates parsing of morphological form data, building Form entities,
 * and persisting forms along with their associated transient words.
 */
@Module({
  controllers: [],
  exports: [FormsBuilderService, FormsService],
  imports: [TypeOrmModule.forFeature([Form]), WordsModule],
  providers: [
    FormsService,
    FormsTransientWordsService,
    FormsBuilderGuardsService,
    FormsBuilderService,
    FormsBuilderVerbService,
  ],
})
export class FormsModule {}
