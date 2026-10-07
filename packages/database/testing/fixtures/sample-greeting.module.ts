import { Module } from "@nestjs/common";

import { SAMPLE_GREETING } from "./sample-greeting.constants";

/** A module of the kind a suite imports: it provides a value of its own. */
@Module({
  exports: [SAMPLE_GREETING],
  providers: [{ provide: SAMPLE_GREETING, useValue: "hello" }],
})
export class SampleGreetingModule {}
