import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export function registerRegexExtract(server: McpServer): void {
  server.tool(
    "regex_extract",
    "Extract all matches of a regex pattern from text. Returns a structured array of match objects with full match text, captured groups, and named groups.",
    {
      pattern: z.string().describe("The regular expression pattern to extract matches for"),
      text: z.string().describe("The text to extract matches from"),
      flags: z
        .string()
        .optional()
        .default("g")
        .describe("Regex flags. Defaults to 'g'"),
      captureGroup: z
        .number()
        .optional()
        .describe(
          "If set, return only the value of this capture group number from each match (0 = full match)"
        ),
    },
    async ({ pattern, text, flags, captureGroup }) => {
      try {
        const regex = new RegExp(pattern, flags);
        const matches: Array<{
          match: string;
          index: number;
          captures: (string | undefined)[];
          groups: Record<string, string | undefined>;
        }> = [];

        let result: RegExpExecArray | null;

        if (flags.includes("g")) {
          while ((result = regex.exec(text)) !== null) {
            matches.push({
              match: result[0],
              index: result.index,
              captures: result.slice(1),
              groups: result.groups ? { ...result.groups } : {},
            });

            if (result[0].length === 0) {
              regex.lastIndex++;
            }
          }
        } else {
          result = regex.exec(text);
          if (result) {
            matches.push({
              match: result[0],
              index: result.index,
              captures: result.slice(1),
              groups: result.groups ? { ...result.groups } : {},
            });
          }
        }

        let output: unknown;

        if (captureGroup !== undefined) {
          const extracted = matches.map((m) => {
            if (captureGroup === 0) return m.match;
            return m.captures[captureGroup - 1] ?? null;
          });
          output = {
            pattern,
            flags,
            captureGroup,
            totalMatches: extracted.length,
            values: extracted,
          };
        } else {
          output = {
            pattern,
            flags,
            totalMatches: matches.length,
            matches,
          };
        }

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
