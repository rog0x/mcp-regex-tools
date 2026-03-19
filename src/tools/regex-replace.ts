import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export function registerRegexReplace(server: McpServer): void {
  server.tool(
    "regex_replace",
    "Find and replace using a regex pattern. Supports capture group references ($1, $2, $&, etc.) in the replacement string.",
    {
      pattern: z.string().describe("The regular expression pattern to match"),
      replacement: z
        .string()
        .describe(
          "The replacement string. Use $1, $2 for captured groups, $& for full match, $` for text before match, $' for text after match"
        ),
      text: z.string().describe("The input text to perform replacements on"),
      flags: z
        .string()
        .optional()
        .default("g")
        .describe("Regex flags (e.g. 'gi'). Defaults to 'g'"),
    },
    async ({ pattern, replacement, text, flags }) => {
      try {
        const regex = new RegExp(pattern, flags);

        let replacementCount = 0;
        const result = text.replace(regex, (...args) => {
          replacementCount++;
          const fullMatch = args[0] as string;
          const groups = typeof args[args.length - 1] === "object" ? args[args.length - 1] : undefined;
          const offset = args[args.length - (groups ? 3 : 2)] as number;

          let output = replacement;

          output = output.replace(/\$(\d+)/g, (_, num) => {
            const idx = parseInt(num, 10);
            return args[idx] !== undefined ? String(args[idx]) : `$${num}`;
          });
          output = output.replace(/\$&/g, fullMatch);
          output = output.replace(/\$`/g, text.slice(0, offset));
          output = output.replace(/\$'/g, text.slice(offset + fullMatch.length));

          if (groups) {
            output = output.replace(/\$<(\w+)>/g, (_, name) => {
              return groups[name] !== undefined ? String(groups[name]) : `$<${name}>`;
            });
          }

          return output;
        });

        const output = {
          original: text,
          result,
          replacementCount,
          changed: text !== result,
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
