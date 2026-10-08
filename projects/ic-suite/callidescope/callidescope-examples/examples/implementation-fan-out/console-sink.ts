import { Injectable } from "@nestjs/common";

/** One of nine structural `LineSink` implementations, past the cap of eight. */
@Injectable()
export class ConsoleSinkService {
  // 🔑 Public Fields

  /** Emits one line to the console sink. */
  public readonly emit = (line: string): string => `console:${line}`;
}
