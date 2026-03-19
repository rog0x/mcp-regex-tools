import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export function registerRegexTest(server: McpServer): void {
  server.tool(
    "regex_test",
    "Test a regex pattern against text. Returns all matches with indices, captured groups, and named groups.",
    {
      pattern: z.string().describe("The regular expression pattern to test"),
      text: z.string().describe("The text to test the pattern against"),
      flags: z
        .string()
        .optional()
        .default("g")
        .describe("Regex flags (e.g. 'gi' for global case-insensitive). Defaults to 'g'"),
    },
    async ({ pattern, text, flags }) => {
      try {
        const regex = new RegExp(pattern, flags);
        const matches: Array<{
          match: string;
          index: number;
          endIndex: number;
          groups: Record<string, string | undefined>;
          captures: (string | undefined)[];
        }> = [];

        let result: RegExpExecArray | null;

        if (flags.includes("g")) {
          while ((result = regex.exec(text)) !== null) {
            matches.push({
              match: result[0],
              index: result.index,
              endIndex: result.index + result[0].length,
              groups: result.groups ? { ...result.groups } : {},
              captures: result.slice(1),
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
              endIndex: result.index + result[0].length,
              groups: result.groups ? { ...result.groups } : {},
              captures: result.slice(1),
            });
          }
        }

        const output = {
          pattern,
          flags,
          totalMatches: matches.length,
          isMatch: matches.length > 0,
          matches,
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
