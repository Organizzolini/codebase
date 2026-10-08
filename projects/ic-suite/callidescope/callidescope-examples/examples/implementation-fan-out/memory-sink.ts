import { Injectable } from "@nestjs/common";

/** One of nine structural `LineSink` implementations, past the cap of eight. */
@Injectable()
export class MemorySinkService {
  // 🔑 Public Fields

  /** Emits one line to the memory sink. */
  public readonly emit = (line: string): string => `memory:${line}`;
}
