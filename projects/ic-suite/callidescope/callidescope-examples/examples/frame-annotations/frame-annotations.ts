import { Injectable } from "@nestjs/common";

/** The object a destructured parameter is written against. */
interface DescribeArguments {
  count: number;
  name: string;
}

/**
 * One frame per annotation shape a comment-trivia reader gets wrong.
 *
 * `trace` heads a stack seven deep on purpose: annotations are read only for
 * the frames a report actually prints, so a shape has to sit inside a reported
 * stack to be demonstrated at all.
 *
 * `legacyRender` heads a second, shorter one, because a deprecated frame cannot
 * live inside the first. Calling a `@deprecated` member is an ESLint error in
 * this repository, so the only honest way to give the tag a frame is to make
 * the deprecated callable a root of its own — which is what it would be in real
 * code on its way out anyway.
 */
@Injectable()
export class FrameAnnotationsService {
  // 🔑 Public Fields

  /** Collapses a rendered value to something a description can quote. */
  public readonly summarize = (rendered: string): string =>
    this.describe({ count: rendered.length, name: rendered });

  // 🔏 Private Methods

  /** Joins the parts a description was built from. */
  private compose(description: string): string {
    return this.collapseThisSignatureBecauseItRunsLong(description, "", "wide");
  }

  /**
   * Finishes the chain and hands back what the layers above it built. Every
   * word after that first sentence is the explanation rather than the summary,
   * which is exactly why a printed frame stops at the sentence boundary and
   * leaves the rest to the `file:line` beside it.
   */
  private finish(description: string): string {
    return description.trim();
  }

  // 🌎 Public Methods

  /**
   * Takes three parameters whose rendered signature runs past eighty
   * characters, so the printed frame collapses it to `(…): ReturnType`.
   */
  public collapseThisSignatureBecauseItRunsLong(
    firstDocumentIdentifier: string,
    secondDocumentIdentifier: string,
    requestedPresentationMode: string,
  ): string {
    return this.finish(
      `${firstDocumentIdentifier}${secondDocumentIdentifier}${requestedPresentationMode}`,
    );
  }

  /** Describes a value from a parameter with no name at all in the syntax. */
  public describe({ count, name }: DescribeArguments): string {
    return this.compose(`${name}:${String(count)}`);
  }

  /**
   * Renders a value the way this package used to.
   *
   * @deprecated Superseded by `render`, and left here so a `@deprecated` tag
   * has a frame of its own to mark.
   */
  public legacyRender(value: string): string {
    return this.compose(value);
  }

  /**
   * Renders one value for display, in the form its type calls for.
   *
   * The two overloads return different types on purpose. Identical return types
   * collapse into one signature taking a union, and this shape exists to show
   * where an overload's documentation lives — on the signature, not on the
   * implementation the call graph points at.
   */
  public render(value: string): string;
  public render(value: number): string[];
  public render(value: number | string): string | string[] {
    return typeof value === "string"
      ? this.summarize(value)
      : [this.summarize(String(value))];
  }

  /** Traces one value through every annotation shape below. */
  public trace(value: string): string {
    return this.render(value);
  }
}
