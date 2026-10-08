import { Injectable } from "@nestjs/common";

/** A sink with more implementations than the cap allows. */
export interface LineSink {
  emit: (line: string) => string;
}

/**
 * Shows what the implementation-candidate cap is protecting against.
 *
 * Nine classes in this directory satisfy `LineSink` structurally, and the cap
 * is eight. A member named `emit`, `run`, or `sync` matches dozens of unrelated
 * classes in a real workspace, and expanding all of them manufactures call
 * stacks no execution ever takes — so the cap drops the whole expansion rather
 * than picking a favorite.
 */
@Injectable()
export class ImplementationFanOutService {
  // 🌎 Public Methods

  /** Emits one line through whichever sink was handed in. */
  public write(sink: LineSink, line: string): string {
    return sink.emit(line);
  }
}
