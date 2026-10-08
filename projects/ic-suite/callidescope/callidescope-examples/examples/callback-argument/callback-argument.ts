import { Injectable } from "@nestjs/common";

/**
 * Passes a callback to a dependency and gets a frame for the callback alone.
 *
 * `Array.prototype.map` is external, so it is a leaf and never a frame. The
 * arrow handed to it is this repository's own code, so it is recorded as its
 * own frame — and the call it makes is followed from there.
 */
@Injectable()
export class CallbackArgumentService {
  // 🔏 Private Methods

  /** Upper-cases one entry. */
  private shout(entry: string): string {
    return entry.toUpperCase();
  }

  // 🌎 Public Methods

  /** Shouts every entry, through a callback `map` invokes. */
  public shoutAll(entries: readonly string[]): string[] {
    return entries.map((entry) => this.shout(entry));
  }
}
