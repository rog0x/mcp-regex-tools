import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

interface ExplanationPart {
  token: string;
  description: string;
}

function explainRegex(pattern: string): ExplanationPart[] {
  const parts: ExplanationPart[] = [];
  let i = 0;

  while (i < pattern.length) {
    const ch = pattern[i];

    if (ch === "\\") {
      const next = pattern[i + 1];
      if (next === undefined) {
        parts.push({ token: "\\", description: "Literal backslash (incomplete escape)" });
        i++;
        continue;
      }
      const escapeMap: Record<string, string> = {
        d: "Digit character [0-9]",
        D: "Non-digit character [^0-9]",
        w: "Word character [a-zA-Z0-9_]",
        W: "Non-word character [^a-zA-Z0-9_]",
        s: "Whitespace character (space, tab, newline, etc.)",
        S: "Non-whitespace character",
        b: "Word boundary",
        B: "Non-word boundary",
        n: "Newline character",
        r: "Carriage return",
        t: "Tab character",
        f: "Form feed",
        v: "Vertical tab",
        "0": "Null character",
      };
      if (escapeMap[next]) {
        parts.push({ token: `\\${next}`, description: escapeMap[next] });
        i += 2;
      } else if (/[1-9]/.test(next)) {
        parts.push({ token: `\\${next}`, description: `Back-reference to capture group ${next}` });
        i += 2;
      } else {
        parts.push({ token: `\\${next}`, description: `Literal '${next}' (escaped)` });
        i += 2;
      }
      continue;
    }

    if (ch === "^") {
      parts.push({ token: "^", description: "Start of string (or start of line in multiline mode)" });
      i++;
      continue;
    }
    if (ch === "$") {
      parts.push({ token: "$", description: "End of string (or end of line in multiline mode)" });
      i++;
      continue;
    }
    if (ch === ".") {
      parts.push({ token: ".", description: "Any character except newline" });
      i++;
      continue;
    }
    if (ch === "|") {
      parts.push({ token: "|", description: "Alternation (OR)" });
      i++;
      continue;
    }

    if (ch === "*") {
      const lazy = pattern[i + 1] === "?";
      parts.push({
        token: lazy ? "*?" : "*",
        description: lazy ? "Zero or more (lazy/non-greedy)" : "Zero or more (greedy)",
      });
      i += lazy ? 2 : 1;
      continue;
    }
    if (ch === "+") {
      const lazy = pattern[i + 1] === "?";
      parts.push({
        token: lazy ? "+?" : "+",
        description: lazy ? "One or more (lazy/non-greedy)" : "One or more (greedy)",
      });
      i += lazy ? 2 : 1;
      continue;
    }
    if (ch === "?") {
      parts.push({ token: "?", description: "Optional (zero or one)" });
      i++;
      continue;
    }

    if (ch === "{") {
      const braceMatch = pattern.slice(i).match(/^\{(\d+)(,(\d*)?)?\}/);
      if (braceMatch) {
        const token = braceMatch[0];
        const min = braceMatch[1];
        const hasComma = braceMatch[2] !== undefined;
        const max = braceMatch[3];
        let desc: string;
        if (!hasComma) {
          desc = `Exactly ${min} times`;
        } else if (max === undefined || max === "") {
          desc = `${min} or more times`;
        } else {
          desc = `Between ${min} and ${max} times`;
        }
        const lazy = pattern[i + token.length] === "?";
        if (lazy) {
          desc += " (lazy/non-greedy)";
        }
        parts.push({ token: lazy ? token + "?" : token, description: desc });
        i += token.length + (lazy ? 1 : 0);
        continue;
      }
    }

    if (ch === "[") {
      let j = i + 1;
      if (pattern[j] === "^") j++;
      if (pattern[j] === "]") j++;
      while (j < pattern.length && pattern[j] !== "]") {
        if (pattern[j] === "\\") j++;
        j++;
      }
      const token = pattern.slice(i, j + 1);
      const negated = pattern[i + 1] === "^";
      const inner = token.slice(negated ? 2 : 1, -1);
      parts.push({
        token,
        description: negated
          ? `Character class: any character NOT in '${inner}'`
          : `Character class: any character in '${inner}'`,
      });
      i = j + 1;
      continue;
    }

    if (ch === "(") {
      if (pattern[i + 1] === "?") {
        if (pattern[i + 2] === ":") {
          parts.push({ token: "(?:", description: "Non-capturing group start" });
          i += 3;
          continue;
        }
        if (pattern[i + 2] === "=") {
          parts.push({ token: "(?=", description: "Positive lookahead start" });
          i += 3;
          continue;
        }
        if (pattern[i + 2] === "!") {
          parts.push({ token: "(?!", description: "Negative lookahead start" });
          i += 3;
          continue;
        }
        if (pattern[i + 2] === "<" && pattern[i + 3] === "=") {
          parts.push({ token: "(?<=", description: "Positive lookbehind start" });
          i += 4;
          continue;
        }
        if (pattern[i + 2] === "<" && pattern[i + 3] === "!") {
          parts.push({ token: "(?<!", description: "Negative lookbehind start" });
          i += 4;
          continue;
        }
        if (pattern[i + 2] === "<") {
          const nameMatch = pattern.slice(i).match(/^\(\?<(\w+)>/);
          if (nameMatch) {
            parts.push({
              token: nameMatch[0],
              description: `Named capturing group '${nameMatch[1]}' start`,
            });
            i += nameMatch[0].length;
            continue;
          }
        }
      }
      parts.push({ token: "(", description: "Capturing group start" });
      i++;
      continue;
    }

    if (ch === ")") {
      parts.push({ token: ")", description: "Group end" });
      i++;
      continue;
    }

    parts.push({ token: ch, description: `Literal '${ch}'` });
    i++;
  }

  return parts;
}

function explainFlags(flags: string): string[] {
  const flagMap: Record<string, string> = {
    g: "global - find all matches, not just the first",
    i: "case-insensitive matching",
    m: "multiline - ^ and $ match line boundaries",
    s: "dotAll - . matches newline characters",
    u: "unicode - enable full Unicode matching",
    v: "unicodeSets - extended Unicode character class syntax",
    y: "sticky - match only from lastIndex position",
    d: "hasIndices - generate indices for substring matches",
  };
  const explanations: string[] = [];
  for (const f of flags) {
    if (flagMap[f]) {
      explanations.push(`${f}: ${flagMap[f]}`);
    } else {
      explanations.push(`${f}: unknown flag`);
    }
  }
  return explanations;
}

export function registerRegexExplain(server: McpServer): void {
  server.tool(
    "regex_explain",
    "Take a regex pattern and return a human-readable explanation of each component, including flags.",
    {
      pattern: z.string().describe("The regular expression pattern to explain"),
      flags: z.string().optional().default("").describe("Regex flags to explain (e.g. 'gi')"),
    },
    async ({ pattern, flags }) => {
      try {
        new RegExp(pattern, flags);

        const parts = explainRegex(pattern);
        const flagExplanations = flags ? explainFlags(flags) : [];

        const output = {
          pattern,
          flags: flags || "(none)",
          breakdown: parts,
          ...(flagExplanations.length > 0 ? { flagExplanations } : {}),
          summary: parts.map((p) => `  ${p.token.padEnd(12)} ${p.description}`).join("\n"),
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
