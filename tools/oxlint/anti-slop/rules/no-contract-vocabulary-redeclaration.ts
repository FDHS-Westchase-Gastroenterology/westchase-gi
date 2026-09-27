import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { defineRule } from "@oxlint/plugins";
import type { ESTree } from "@oxlint/plugins";

/* The contract modules declare each vocabulary once as an `as const` array
   (`export const REQUEST_STATES = ["new", ...] as const`). Any other file
   that spells the same member set as a string-literal union, an `as const`
   array, or a `z.enum([...])` argument has restated the contract, and the
   copy will drift the next time the contract changes. The owners are read
   from disk so the rule never holds a copy of the members itself. */

interface Vocabulary {
  readonly name: string;
  readonly owner: string;
  readonly members: readonly string[];
}

const DECLARATION = /export const (\w+) = \[([^\]]*)\] as const;/g;
const STRING_LITERAL = /"([^"\\]*)"/g;

function membersKey(members: readonly string[]): string {
  return [...new Set(members)].sort().join("\u0000");
}

/* Owner paths are relative to the repository root, found from this file rather
   than from the working directory so the rule behaves the same from any cwd. */
const REPOSITORY_ROOT = fileURLToPath(new URL("../../../../", import.meta.url));

function readVocabularies(owners: readonly string[]): Map<string, Vocabulary[]> {
  const found = new Map<string, Vocabulary[]>();
  for (const owner of owners) {
    let source: string;
    try {
      source = readFileSync(resolve(REPOSITORY_ROOT, owner), "utf8");
    } catch {
      throw new Error(`no-contract-vocabulary-redeclaration: owner file not found: ${owner}`);
    }
    for (const match of source.matchAll(DECLARATION)) {
      const [, name, body] = match;
      if (name === undefined || body === undefined) continue;
      const members = [...body.matchAll(STRING_LITERAL)].flatMap((hit) =>
        hit[1] === undefined ? [] : [hit[1]],
      );
      if (members.length < 2) continue;
      const key = membersKey(members);
      found.set(key, [...(found.get(key) ?? []), { name, owner, members }]);
    }
  }
  return found;
}

function unionMembers(node: ESTree.TSUnionType): readonly string[] | null {
  const members: string[] = [];
  for (const type of node.types) {
    if (type.type !== "TSLiteralType") return null;
    const { literal } = type;
    if (literal.type !== "Literal" || typeof literal.value !== "string") return null;
    members.push(literal.value);
  }
  return members;
}

function arrayMembers(node: ESTree.ArrayExpression): readonly string[] | null {
  const members: string[] = [];
  for (const element of node.elements) {
    if (element === null || element.type !== "Literal" || typeof element.value !== "string") {
      return null;
    }
    members.push(element.value);
  }
  return members;
}

function isVocabularyArray(node: ESTree.ArrayExpression): boolean {
  const { parent } = node;
  if (parent === null || parent === undefined) return false;
  if (parent.type === "TSAsExpression") {
    const annotation = parent.typeAnnotation;
    return (
      annotation.type === "TSTypeReference" &&
      annotation.typeName.type === "Identifier" &&
      annotation.typeName.name === "const"
    );
  }
  if (parent.type === "CallExpression") {
    const { callee } = parent;
    return (
      callee.type === "MemberExpression" &&
      callee.property.type === "Identifier" &&
      callee.property.name === "enum"
    );
  }
  return false;
}

export const noContractVocabularyRedeclarationRule = defineRule({
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow restating a contract module's string-literal vocabulary as a union, an `as const` array, or a z.enum argument.",
    },
    messages: {
      redeclared:
        "This restates {{name}} from {{owner}}; import it (or derive with Extract/Exclude) so the copy cannot drift.",
    },
    schema: [
      {
        type: "object",
        properties: {
          owners: { type: "array", items: { type: "string" } },
        },
        additionalProperties: false,
      },
    ],
    defaultOptions: [{ owners: [] }],
  },
  createOnce(context) {
    let vocabularies: Map<string, Vocabulary[]> | null = null;
    let owners: readonly string[] = [];

    const report = (node: ESTree.Node, members: readonly string[]) => {
      const declared = vocabularies?.get(membersKey(members));
      if (declared === undefined) return;
      context.report({
        node,
        messageId: "redeclared",
        data: {
          name: declared.map((vocabulary) => vocabulary.name).join(" / "),
          owner: [...new Set(declared.map((vocabulary) => vocabulary.owner))].join(", "),
        },
      });
    };

    return {
      Program() {
        const [options] = context.options as readonly [{ owners?: readonly string[] } | undefined];
        owners = options?.owners ?? [];
        vocabularies ??= readVocabularies(owners);
      },
      TSUnionType(node) {
        if (owners.some((owner) => context.physicalFilename.endsWith(owner))) return;
        const members = unionMembers(node);
        if (members !== null && members.length >= 2) report(node, members);
      },
      ArrayExpression(node) {
        if (owners.some((owner) => context.physicalFilename.endsWith(owner))) return;
        if (!isVocabularyArray(node)) return;
        const members = arrayMembers(node);
        if (members !== null && members.length >= 2) report(node, members);
      },
    };
  },
});
