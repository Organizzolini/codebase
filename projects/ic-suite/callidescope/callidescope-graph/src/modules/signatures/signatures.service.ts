import { Injectable } from "@nestjs/common";
import ts from "typescript";

import { SIGNATURE_FORMAT_FLAGS } from "./signatures.constants";

import type { CallableDeclaration } from "../callables/callables.types";
import type { ReadSignatureArguments } from "./signatures.types";
import type { CallableParameter, CallableSignature } from "@callidescope/core";

/**
 * Reads what a callable takes and what it gives back.
 *
 * Resolved through the type checker rather than read off the syntax, which is
 * what makes it useful on the shapes the graph actually points at. A callback
 * passed to `map` declares no types at all and gets them from the parameter it
 * was passed to; a destructured parameter has no name in the source; an
 * inferred return type is written down nowhere.
 */
@Injectable()
export class SignaturesService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Describes one parameter, including how it may be left out. */
  private readParameter(args: {
    checker: ts.TypeChecker;
    declaration: CallableDeclaration;
    parameter: ts.Symbol;
  }): CallableParameter {
    const { valueDeclaration } = args.parameter;
    const isParameter =
      valueDeclaration !== undefined && ts.isParameter(valueDeclaration);

    return {
      isOptional:
        isParameter &&
        (valueDeclaration.questionToken !== undefined ||
          valueDeclaration.initializer !== undefined),
      isRest: isParameter && valueDeclaration.dotDotDotToken !== undefined,
      name: args.parameter.getName(),
      type: args.checker.typeToString(
        args.checker.getTypeOfSymbolAtLocation(
          args.parameter,
          valueDeclaration ?? args.declaration,
        ),
        undefined,
        SIGNATURE_FORMAT_FLAGS,
      ),
    };
  }

  // 🌎 Public Methods

  /** Reads the parameters and return type of a callable. */
  public read(args: ReadSignatureArguments): CallableSignature | undefined {
    const signature = args.checker.getSignatureFromDeclaration(
      args.declaration,
    );

    if (signature === undefined) {
      return undefined;
    }

    return {
      parameters: signature.getParameters().map((parameter) =>
        this.readParameter({
          checker: args.checker,
          declaration: args.declaration,
          parameter,
        }),
      ),
      returnType: args.checker.typeToString(
        signature.getReturnType(),
        undefined,
        SIGNATURE_FORMAT_FLAGS,
      ),
      // Kept alongside the parts because TypeScript renders some shapes better
      // than reassembling them does: a destructured parameter reads as
      // `{ alpha, beta }` here and as the synthetic `__0` in `parameters`.
      text: args.checker.signatureToString(
        signature,
        args.declaration,
        SIGNATURE_FORMAT_FLAGS,
      ),
    };
  }
}
