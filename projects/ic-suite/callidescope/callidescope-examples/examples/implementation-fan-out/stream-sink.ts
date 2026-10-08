import { Injectable } from "@nestjs/common";

/** One of nine structural `LineSink` implementations, past the cap of eight. */
@Injectable()
export class StreamSinkService {
  // 🔑 Public Fields

  /** Emits one line to the stream sink. */
  public readonly emit = (line: string): string => `stream:${line}`;
}
