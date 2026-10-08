import { Module } from "@nestjs/common";

import { InputService } from "./input.service";

/**
 * NestJS module that wires the shared CLI option parsing and prompting.
 */
@Module({
  controllers: [],
  exports: [InputService],
  imports: [],
  providers: [InputService],
})
export class InputModule {}
