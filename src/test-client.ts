import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

async function main() {
  console.log("🚀 Testing MCP Server v1.2.0 (State Mutation + Prompt Templates)...\n");

  const transport = new StdioClientTransport({
    command: "node",
    args: ["dist/index.js"]
  });

  const client = new Client(
    { name: "terminal-test-client", version: "1.2.0" },
    { capabilities: {} }
  );

  await client.connect(transport);
  console.log("✅ Connection established.\n");

  // 1. Prompts Capability Test
  console.log("📋 Fetching Prompt Template: ticket_triage_prompt for TCK-101...");
  const promptData = await client.getPrompt({
    name: "ticket_triage_prompt",
    arguments: { ticketId: "TCK-101" }
  });
  const firstMsg = promptData.messages[0];
  if (firstMsg && firstMsg.content && typeof firstMsg.content === "object" && "text" in firstMsg.content) {
    console.log("Prompt Briefing Content:\n", firstMsg.content.text);
  }

  // 2. State Mutation Test (update ticket status)
  console.log("\n⚡ Executing Tool: update_ticket_status...");
  const mutationResult = await client.callTool({
    name: "update_ticket_status",
    arguments: {
      ticketId: "TCK-101",
      status: "in_progress",
      agentName: "AziJan-SupportBot",
      note: "Investigating double charge on Stripe dashboard"
    }
  });

  const mutationContent = mutationResult.content as Array<{ type: string; text: string }>;
  console.log("Mutation Result:\n", mutationContent[0].text);

  // 3. State Verification Test (Query check)
  console.log("\n🔍 Verifying state update via query_tickets_by_category...");
  const queryResult = await client.callTool({
    name: "query_tickets_by_category",
    arguments: { category: "billing", limit: 1 }
  });

  const queryContent = queryResult.content as Array<{ type: string; text: string }>;
  console.log("Verified State Response:\n", queryContent[0].text);

  await client.close();
  console.log("\n🏁 State Lifecycle Test Completed Successfully!");
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Test Failed:", err);
  process.exit(1);
});