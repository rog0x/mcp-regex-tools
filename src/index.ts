#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerRegexTest } from "./tools/regex-test.js";
import { registerRegexReplace } from "./tools/regex-replace.js";
import { registerRegexExtract } from "./tools/regex-extract.js";
import { registerRegexExplain } from "./tools/regex-explain.js";
import { registerTextTransform } from "./tools/text-transform.js";

const server = new McpServer({
  name: "mcp-regex-tools",
  version: "1.0.0",
});

registerRegexTest(server);
registerRegexReplace(server);
registerRegexExtract(server);
registerRegexExplain(server);
registerTextTransform(server);

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
