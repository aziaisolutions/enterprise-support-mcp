import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

async function main() {
  console.log("🚀 Testing MCP Server v1.1.0 (Tools + Resources + Telemetry)...\n");

  const transport = new StdioClientTransport({
    command: "npx",
    args: ["tsx", "src/index.ts"]
  });

  const client = new Client(
    { name: "terminal-test-client", version: "1.1.0" },
    { capabilities: {} }
  );

  await client.connect(transport);
  console.log("✅ Connection established.\n");

  // 1. Resources Test (SOPs check karein)
  console.log("📚 Checking Available MCP Resources (Internal SOPs)...");
  const resourcesList = await client.listResources();
  console.log("Discovered Resources:", resourcesList.resources.map(r => r.uri));

  console.log("\n📖 Reading Resource: sop://support/billing-escalation...");
  const sopContent = await client.readResource({ uri: "sop://support/billing-escalation" });
  console.log("SOP Content:\n", sopContent.contents[0].text);

  // 2. Tool + Telemetry Test
  console.log("\n⚡ Executing Tool: query_tickets_by_category ('billing')...");
  const toolResult = await client.callTool({
    name: "query_tickets_by_category",
    arguments: { category: "billing", limit: 2 }
  });

  console.log("\n🎯 Tool Execution Response with Telemetry:");
  console.log(toolResult.content[0].text);

  await client.close();
  console.log("\n🏁 All Tests Passed Successfully!");
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Test Failed:", err);
  process.exit(1);
});