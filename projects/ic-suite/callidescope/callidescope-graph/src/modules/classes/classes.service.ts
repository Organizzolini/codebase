import { Injectable } from "@nestjs/common";
import ts from "typescript";

import { MAXIMUM_IMPLEMENTATION_CANDIDATES } from "./classes.constants";
import { ExternalService } from "./external.service";

import type { ProjectProgram } from "../program/program.types";
import type {
  BuildHierarchyArguments,
  ImplementationLookup,
} from "./classes.types";

/**
 * Resolves an interface or abstract member to the classes that implement it.
 *
 * The language service can answer this directly, and answering it that way
 * costs milliseconds per call site — minutes across a repository. This builds
 * one index up front instead, and answers from it in constant time.
 *
 * The index has to be structural, not just nominal. Classes in this repository
 * routinely satisfy an interface without writing `implements`, and the
 * interface members themselves are usually arrow-typed properties rather than
 * method signatures. An index that only followed `implements` clauses would
 * find none of them.
 */
@Injectable()
export class ClassesService {
  // 🏗 Dependency Injection

  constructor(private readonly externalService: ExternalService) {}

  // 🔐 Private Fields

  private readonly checkerByClass = new WeakMap<
    ts.ClassDeclaration,
    ts.TypeChecker
  >();

  /** Every traced class that declares a member of a given name. */
  private readonly classesByMemberName = new Map<
    string,
    ts.ClassDeclaration[]
  >();

  /** Classes naming a base in an `implements` or `extends` clause. */
  private readonly derivedByBaseName = new Map<string, ts.ClassDeclaration[]>();

  private readonly lookupCache = new Map<string, ImplementationLookup>();

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Walks the whole inheritance chain below a base, not just its children.
   *
   * An abstract base is often extended by another abstract class, with the
   * concrete implementation another level down. Following only direct
   * subclasses finds the intermediate one, discards it for still being
   * abstract, and reports that nothing implements the member.
   */
  private collectDerived(ownerName: string): ts.ClassDeclaration[] {
    const collected: ts.ClassDeclaration[] = [];
    const pending = [ownerName];
    const visited = new Set<string>([ownerName]);

    while (pending.length > 0) {
      const current = pending.pop();

      for (const derived of this.derivedByBaseName.get(current ?? "") ?? []) {
        collected.push(derived);

        const derivedName = derived.name?.text;

        if (derivedName !== undefined && !visited.has(derivedName)) {
          visited.add(derivedName);
          pending.push(derivedName);
        }
      }
    }

    return collected;
  }

  /** Keeps only classes whose instance type satisfies the declaring type. */
  private filterAssignable(args: {
    candidates: readonly ts.ClassDeclaration[];
    checker: ts.TypeChecker;
    ownerSymbol: ts.Symbol;
  }): ts.ClassDeclaration[] {
    const targetType = args.checker.getDeclaredTypeOfSymbol(args.ownerSymbol);

    return args.candidates.filter((candidate) => {
      const symbol = candidate.name
        ? args.checker.getSymbolAtLocation(candidate.name)
        : undefined;

      if (symbol === undefined) {
        return false;
      }

      return args.checker.isTypeAssignableTo(
        args.checker.getDeclaredTypeOfSymbol(symbol),
        targetType,
      );
    });
  }

  /** Records one class under every base type it names. */
  private indexHeritage(declaration: ts.ClassDeclaration): void {
    for (const clause of declaration.heritageClauses ?? []) {
      for (const typeNode of clause.types) {
        const { expression } = typeNode;

        if (!ts.isIdentifier(expression)) {
          continue;
        }

        const existing = this.derivedByBaseName.get(expression.text);

        if (existing === undefined) {
          this.derivedByBaseName.set(expression.text, [declaration]);
        } else {
          existing.push(declaration);
        }
      }
    }
  }

  /** Records one class under every member name it declares. */
  private indexMembers(declaration: ts.ClassDeclaration): void {
    for (const member of declaration.members) {
      if (member.name === undefined || !ts.isIdentifier(member.name)) {
        continue;
      }

      const existing = this.classesByMemberName.get(member.name.text);

      if (existing === undefined) {
        this.classesByMemberName.set(member.name.text, [declaration]);
      } else {
        existing.push(declaration);
      }
    }
  }

  /** Reads one member's concrete declarations off a candidate class. */
  private readMemberDeclarations(args: {
    candidate: ts.ClassDeclaration;
    checker: ts.TypeChecker;
    memberName: string;
  }): ts.Declaration[] {
    return args.candidate.members
      .filter(
        (member): member is ts.MethodDeclaration | ts.PropertyDeclaration =>
          (ts.isMethodDeclaration(member) ||
            ts.isPropertyDeclaration(member)) &&
          ts.isIdentifier(member.name) &&
          member.name.text === args.memberName,
      )
      .filter(
        (member) =>
          (ts.getCombinedModifierFlags(member) & ts.ModifierFlags.Abstract) ===
          0,
      );
  }

  // 🌎 Public Methods

  /** Walks every traced class once, recording members and heritage. */
  public build(args: BuildHierarchyArguments): void {
    for (const projectProgram of args.programs) {
      this.indexProgram(projectProgram);
    }
  }

  /** Indexes the classes one program owns. */
  public indexProgram(projectProgram: ProjectProgram): void {
    for (const sourceFile of projectProgram.program.getSourceFiles()) {
      if (this.externalService.isExternal(sourceFile)) {
        continue;
      }

      for (const statement of sourceFile.statements) {
        if (!ts.isClassDeclaration(statement)) {
          continue;
        }

        this.checkerByClass.set(statement, projectProgram.checker);
        this.indexMembers(statement);
        this.indexHeritage(statement);
      }
    }
  }

  /**
   * Finds the concrete declarations one interface member resolves to.
   *
   * Nominal implementers are preferred; when a base names none — the common
   * case here — every class declaring a member of that name is tested for
   * assignability instead. Filtering by member name first is what keeps that
   * sweep cheap enough to run.
   */
  public resolveImplementations(args: {
    checker: ts.TypeChecker;
    memberName: string;
    ownerName: string;
    ownerSymbol: ts.Symbol;
  }): ImplementationLookup {
    const cacheKey = `${args.ownerName}#${args.memberName}`;
    const cached = this.lookupCache.get(cacheKey);

    if (cached !== undefined) {
      return cached;
    }

    const nominal = this.collectDerived(args.ownerName);
    const byName = this.classesByMemberName.get(args.memberName) ?? [];
    const candidates =
      nominal.length > 0
        ? nominal.filter((candidate) => byName.includes(candidate))
        : this.filterAssignable({
            candidates: byName,
            checker: args.checker,
            ownerSymbol: args.ownerSymbol,
          });

    const lookup: ImplementationLookup =
      candidates.length > MAXIMUM_IMPLEMENTATION_CANDIDATES
        ? { declarations: [], exceededCandidateLimit: true }
        : {
            declarations: candidates.flatMap((candidate) =>
              this.readMemberDeclarations({
                candidate,
                checker: this.checkerByClass.get(candidate) ?? args.checker,
                memberName: args.memberName,
              }),
            ),
            exceededCandidateLimit: false,
          };

    this.lookupCache.set(cacheKey, lookup);

    return lookup;
  }
}
