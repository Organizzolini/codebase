import { Global, Module } from "@nestjs/common";

/** Registered into every module in the container, so it is drawn as ambient. */
@Global()
@Module({})
export class SettingsModule {}
