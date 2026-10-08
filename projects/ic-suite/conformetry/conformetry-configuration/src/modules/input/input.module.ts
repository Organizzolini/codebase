import { Module } from "@nestjs/common";

import { InputOptionsService } from "./input-options.service";
import { InputPromptingService } from "./input-prompting.service";
import { InputSchemaService } from "./input-schema.service";
import { InputService } from "./input.service";

/**
 * Owns command-line argument parsing and interactive input resolution.
 *
 * `InputOptionsService` is exported as well as `InputService` because a
 * non-interactive host needs option normalization without the prompting
 * machinery, which has nowhere to prompt. `InputPromptingService` is exported
 * for the opposite reason: a command that decides *whether* to ask needs the
 * predicate and the picker without going through input resolution.
 */
@Module({
  controllers: [],
  exports: [InputOptionsService, InputPromptingService, InputService],
  imports: [],
  providers: [
    InputOptionsService,
    InputPromptingService,
    InputSchemaService,
    InputService,
  ],
})
export class InputModule {}
