import { Global, Module } from "@nestjs/common";

/** Global, but in a container too small for the ambient rule to fire. */
@Global()
@Module({})
export class SettingsModule {}
