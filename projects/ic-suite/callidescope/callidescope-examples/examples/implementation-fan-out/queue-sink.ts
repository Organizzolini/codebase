import { Injectable } from "@nestjs/common";

/** One of nine structural `LineSink` implementations, past the cap of eight. */
@Injectable()
export class QueueSinkService {
  // 🔑 Public Fields

  /** Emits one line to the queue sink. */
  public readonly emit = (line: string): string => `queue:${line}`;
}
