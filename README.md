# mcp-regex-tools

Regex and text processing tools for AI agents via the Model Context Protocol (MCP).

## Tools

| Tool | Description |
|------|-------------|
| `regex_test` | Test a regex pattern against text. Returns all matches with indices, captured groups, and named groups. |
| `regex_replace` | Find and replace using regex with support for capture group references (`$1`, `$2`, `$&`, `$<name>`). |
| `regex_extract` | Extract all matches of a pattern from text as a structured array. Optionally return only a specific capture group. |
| `regex_explain` | Parse a regex pattern and return a human-readable explanation of each component and flag. |
| `text_transform` | Apply common text transformations: camelCase, snake_case, kebab-case, PascalCase, UPPER, lower, title case, reverse, trim, deduplicate lines, sort lines, remove blank lines, count words/chars/lines. Chain multiple transforms in one call. |

## Setup

```bash
npm install
npm run build
```

## Usage with Claude Desktop

Add this to your Claude Desktop config file:

- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "regex-tools": {
      "command": "node",
      "args": ["D:/products/mcp-servers/mcp-regex-tools/dist/index.js"]
    }
  }
}
```

## Usage with Claude Code

```bash
claude mcp add regex-tools node D:/products/mcp-servers/mcp-regex-tools/dist/index.js
```

Or add to your `.mcp.json`:

```json
{
  "mcpServers": {
    "regex-tools": {
      "command": "node",
      "args": ["D:/products/mcp-servers/mcp-regex-tools/dist/index.js"]
    }
  }
}
```

## Examples

### Test a regex

```
regex_test({ pattern: "(\\d{4})-(\\d{2})-(\\d{2})", text: "Today is 2026-03-19 and tomorrow is 2026-03-20" })
```

### Replace with capture groups

```
regex_replace({ pattern: "(\\w+)\\s(\\w+)", replacement: "$2 $1", text: "hello world" })
```

### Extract matches

```
regex_extract({ pattern: "[\\w.]+@[\\w.]+", text: "Contact us at info@example.com or support@example.com" })
```

### Explain a regex

```
regex_explain({ pattern: "^(?:https?://)?(?:www\\.)?([\\w-]+)\\.\\w{2,}$", flags: "i" })
```

### Transform text

```
text_transform({ text: "hello world example", transforms: ["PascalCase"] })
text_transform({ text: "some text\nwith\nlines\nwith\nduplicates\nlines", transforms: ["deduplicate_lines", "sort_lines"] })
```

## License

MIT
