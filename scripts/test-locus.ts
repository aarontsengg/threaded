import 'dotenv/config';
import { MCPClientCredentials } from '@locus-technologies/langchain-mcp-m2m';
import { ChatAnthropic } from '@langchain/anthropic';
import { createReactAgent } from '@langchain/langgraph/prebuilt';

async function testLocusIntegration() {
  console.log('🚀 Starting Locus MCP Integration Test...\n');

  try {
    // 1. Create MCP client with Client Credentials
    console.log('📡 Connecting to Locus MCP server...');
    const client = new MCPClientCredentials({
      mcpServers: {
        'locus': {
          url: 'https://mcp.paywithlocus.com/mcp',
          auth: {
            clientId: process.env.LOCUS_CLIENT_ID!,
            clientSecret: process.env.LOCUS_CLIENT_SECRET!
          }
        }
      }
    });

    // 2. Connect and load tools
    console.log('🔌 Initializing connections...');
    await client.initializeConnections();

    console.log('🛠️  Loading available tools...');
    const tools = await client.getTools();

    console.log(`✅ Successfully loaded ${tools.length} tools:\n`);
    tools.forEach((tool, index) => {
      console.log(`${index + 1}. ${tool.name}`);
      if (tool.description) {
        console.log(`   Description: ${tool.description}`);
      }
      console.log('');
    });

    // 3. Create LangChain agent
    console.log('🤖 Creating AI agent with Locus tools...');
    const llm = new ChatAnthropic({
      model: 'claude-sonnet-4-20250514',
      apiKey: process.env.ANTHROPIC_API_KEY!
    });
    const agent = createReactAgent({ llm, tools });

    // 4. Test query: Ask what tools are available
    console.log('💬 Testing agent with query: "What tools are available?"\n');
    const result = await agent.invoke({
      messages: [{ role: 'user', content: 'What tools are available?' }]
    });

    console.log('📝 Agent Response:');
    console.log(result.messages[result.messages.length - 1].content);
    console.log('\n');

    // 5. Test query: Check wallet balance
    console.log('💰 Testing agent with query: "What is my current wallet balance?"\n');
    const balanceResult = await agent.invoke({
      messages: [{ role: 'user', content: 'What is my current wallet balance?' }]
    });

    console.log('📝 Agent Response:');
    console.log(balanceResult.messages[balanceResult.messages.length - 1].content);
    console.log('\n');

    console.log('✨ Test completed successfully!');

    // Cleanup
    await client.close();

  } catch (error) {
    console.error('❌ Error during Locus integration test:');
    console.error(error);
    process.exit(1);
  }
}

// Run the test
testLocusIntegration();
