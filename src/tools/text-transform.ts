import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

type TransformName =
  | "camelCase"
  | "snake_case"
  | "kebab-case"
  | "PascalCase"
  | "UPPER"
  | "lower"
  | "title"
  | "reverse"
  | "trim"
  | "deduplicate_lines"
  | "sort_lines"
  | "remove_blank_lines"
  | "count";

function splitWords(text: string): string[] {
  return text
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .replace(/[-_]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0);
}

function toCamelCase(text: string): string {
  const words = splitWords(text);
  return words
    .map((w, i) =>
      i === 0 ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
    )
    .join("");
}

function toSnakeCase(text: string): string {
  return splitWords(text)
    .map((w) => w.toLowerCase())
    .join("_");
}

function toKebabCase(text: string): string {
  return splitWords(text)
    .map((w) => w.toLowerCase())
    .join("-");
}

function toPascalCase(text: string): string {
  return splitWords(text)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join("");
}

function toTitleCase(text: string): string {
  return text.replace(/\b\w/g, (ch) => ch.toUpperCase());
}

function deduplicateLines(text: string): string {
  const seen = new Set<string>();
  return text
    .split("\n")
    .filter((line) => {
      if (seen.has(line)) return false;
      seen.add(line);
      return true;
    })
    .join("\n");
}

function sortLines(text: string): string {
  return text.split("\n").sort().join("\n");
}

function removeBlankLines(text: string): string {
  return text
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .join("\n");
}

function countStats(text: string): { words: number; characters: number; lines: number } {
  const lines = text.split("\n").length;
  const words = text
    .split(/\s+/)
    .filter((w) => w.length > 0).length;
  const characters = text.length;
  return { words, characters, lines };
}

const TRANSFORMS: Record<TransformName, (text: string) => string | object> = {
  camelCase: toCamelCase,
  "snake_case": toSnakeCase,
  "kebab-case": toKebabCase,
  PascalCase: toPascalCase,
  UPPER: (t) => t.toUpperCase(),
  lower: (t) => t.toLowerCase(),
  title: toTitleCase,
  reverse: (t) => t.split("").reverse().join(""),
  trim: (t) => t.trim(),
  deduplicate_lines: deduplicateLines,
  sort_lines: sortLines,
  remove_blank_lines: removeBlankLines,
  count: countStats,
};

const TRANSFORM_NAMES = Object.keys(TRANSFORMS) as TransformName[];

export function registerTextTransform(server: McpServer): void {
  server.tool(
    "text_transform",
    `Apply common text transformations. Available transforms: ${TRANSFORM_NAMES.join(", ")}. Multiple transforms can be chained and will be applied in order.`,
    {
      text: z.string().describe("The input text to transform"),
      transforms: z
        .array(
          z.enum([
            "camelCase",
            "snake_case",
            "kebab-case",
            "PascalCase",
            "UPPER",
            "lower",
            "title",
            "reverse",
            "trim",
            "deduplicate_lines",
            "sort_lines",
            "remove_blank_lines",
            "count",
          ])
        )
        .describe("One or more transformations to apply in order"),
    },
    async ({ text, transforms }) => {
      try {
        const results: Array<{ transform: string; result: string | object }> = [];
        let current: string = text;

        for (const name of transforms) {
          const fn = TRANSFORMS[name];
          const result = fn(current);

          if (typeof result === "string") {
            results.push({ transform: name, result });
            current = result;
          } else {
            results.push({ transform: name, result });
          }
        }

        const output = {
          original: text,
          transformsApplied: transforms,
          results,
          final: results.length > 0 ? results[results.length - 1].result : text,
        };

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(output, null, 2),
            },
          ],
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return {
          content: [{ type: "text" as const, text: `Error: ${message}` }],
          isError: true,
        };
      }
    }
  );
}
