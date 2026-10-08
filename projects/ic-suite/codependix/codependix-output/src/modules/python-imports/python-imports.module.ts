import { ConfigurationModule } from "@codependix/configuration";
import { PythonModule } from "@codependix/file-imports";
import { Module } from "@nestjs/common";

import { DeliveryModule } from "../delivery/delivery.module";

import { PythonImportsService } from "./python-imports.service";

/** Provides the Python file-level import graph pass. */
@Module({
  controllers: [],
  exports: [PythonImportsService],
  imports: [ConfigurationModule, DeliveryModule, PythonModule],
  providers: [PythonImportsService],
})
export class PythonImportsModule {}
