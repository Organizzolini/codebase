import { Injectable } from "@nestjs/common";

/** One of nine structural `LineSink` implementations, past the cap of eight. */
@Injectable()
export class TelemetrySinkService {
  // 🔑 Public Fields

  /** Emits one line to the telemetry sink. */
  public readonly emit = (line: string): string => `telemetry:${line}`;
}
