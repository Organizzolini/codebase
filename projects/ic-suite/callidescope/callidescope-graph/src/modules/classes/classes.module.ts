import { Module } from "@nestjs/common";

import { ClassesService } from "./classes.service";
import { ExternalService } from "./external.service";

/**
 * Provides the lookups edge resolution consults for every call site.
 */
@Module({
  controllers: [],
  exports: [ClassesService, ExternalService],
  imports: [],
  providers: [ClassesService, ExternalService],
})
export class ClassesModule {}
