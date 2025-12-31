import { NextRequest, NextResponse } from 'next/server';
import { MCPClientCredentials } from '@locus-technologies/langchain-mcp-m2m';
import { ChatAnthropic } from '@langchain/anthropic';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { fal } from '@fal-ai/client';
import { budgetTracker } from '@/lib/budget-tracker';

fal.config({
  credentials: process.env.FAL_KEY
});

// Estimated cost per virtual try-on request (in USDC)
const ESTIMATED_COST = 0.05;

// Payment goes to your Coinbase wallet
const COINBASE_WALLET = process.env.COINBASE_WALLET!;

interface TryOnRequest {
  humanImageUrl: string;
  garmentImageUrl: string;
  garmentType: 'upper_body' | 'lower_body' | 'dresses';
}

export async function POST(req: NextRequest) {
  console.log('Processing virtual try-on request:');

  try {
    const body: TryOnRequest = await req.json();
    const { humanImageUrl, garmentImageUrl, garmentType } = body;

    // Validate inputs
    if (!humanImageUrl || !garmentImageUrl || !garmentType) {
      return NextResponse.json(
        { error: 'Missing required fields: humanImageUrl, garmentImageUrl, garmentType' },
        { status: 400 }
      );
    }

    // Get user ID (use session ID from header, or fallback to IP/forwarded IP)
    const userId = req.headers.get('x-session-id') ||
                   req.headers.get('x-forwarded-for')?.split(',')[0] ||
                   req.headers.get('x-real-ip') ||
                   'anonymous';
    console.log(`User ID: ${userId}`);

    // Check user budget BEFORE initializing agent
    const budgetCheck = budgetTracker.checkBudget(userId, ESTIMATED_COST);
    console.log('User budget check:', budgetCheck);

    if (!budgetCheck.hasEnough) {
      return NextResponse.json({
        success: false,
        error: 'User budget limit reached',
        userBudget: {
          spent: budgetCheck.spent,
          remaining: budgetCheck.remaining,
          limit: budgetCheck.limit
        },
        estimatedCost: ESTIMATED_COST
      }, { status: 402 }); // Payment Required
    }

    // Step 1: Initialize Locus MCP Client
    console.log('Initializing Locus payment agent:');
    const locusClient = new MCPClientCredentials({
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

    await locusClient.initializeConnections();
    const tools = await locusClient.getTools();

    // Step 2: Create AI Agent with payment capabilities
    const llm = new ChatAnthropic({
      model: 'claude-sonnet-4-20250514',
      apiKey: process.env.ANTHROPIC_API_KEY!,
      temperature: 0
    });

    const agent = createReactAgent({ llm, tools });

    // Step 3: Agent decides whether to proceed with payment
    const decisionPrompt = `
You are a payment agent managing API costs for a virtual try-on service.

Request Details:
- Service: fal.ai virtual try-on API
- Cost per request: $${ESTIMATED_COST} USDC
- Garment Type: ${garmentType}

User Budget Status:
- User ID: ${userId}
- User has spent: $${budgetCheck.spent.toFixed(2)} USDC
- User budget limit: $${budgetCheck.limit.toFixed(2)} USDC
- User remaining: $${budgetCheck.remaining.toFixed(2)} USDC

Your Decision Process:
1. The user budget has been PRE-CHECKED and is sufficient
2. Now check YOUR payment context for global budget availability
3. If global budget is sufficient, APPROVE and send $${ESTIMATED_COST} USDC to wallet: ${COINBASE_WALLET}
4. Use memo: "VirtualTryOn-User${userId.substring(0, 8)}-${garmentType}"
5. Provide clear justification for your decision

Important:
- User-level budget already verified
- Focus on checking global budget via your payment context tool
- Only proceed if global budget sufficient
- Be explicit about approval/denial in your response

Make the payment decision now.
`;

    const decisionResult = await agent.invoke({
      messages: [{ role: 'user', content: decisionPrompt }]
    });

    const agentResponse = decisionResult.messages[decisionResult.messages.length - 1].content;
    console.log('Agent decision:', agentResponse);

    // Step 4: Parse agent decision (simplified - in production, use structured output)
    const shouldProceed = typeof agentResponse === 'string' &&
                          (agentResponse.toLowerCase().includes('approved') ||
                           agentResponse.toLowerCase().includes('sent') ||
                           agentResponse.toLowerCase().includes('transaction'));

    if (!shouldProceed) {
      await locusClient.close();
      return NextResponse.json({
        success: false,
        error: 'Payment agent declined the request',
        reason: agentResponse,
        estimatedCost: ESTIMATED_COST
      }, { status: 402 });
    }

    // Step 5: Call fal.ai virtual try-on API
    console.log('Calling fal.ai:');
    const tryOnResult = await fal.subscribe('fal-ai/leffa/virtual-tryon', {
      input: {
        human_image_url: humanImageUrl,
        garment_image_url: garmentImageUrl,
        garment_type: garmentType
      },
      logs: true,
      onQueueUpdate: (update: any) => {
        console.log('Queue update:', update);
      }
    });

    console.log('Virtual try-on completed successfully!');

    // Step 6: Record user spending
    budgetTracker.recordSpending(userId, ESTIMATED_COST);
    const updatedBudget = budgetTracker.checkBudget(userId, 0);
    console.log('Updated user budget:', updatedBudget);

    // Step 7: Cleanup
    await locusClient.close();

    // Step 8: Return result
    return NextResponse.json({
      success: true,
      result: {
        imageUrl: tryOnResult.data.image.url,
        width: tryOnResult.data.image.width,
        height: tryOnResult.data.image.height,
        seed: tryOnResult.data.seed,
        hasNsfwConcepts: tryOnResult.data.has_nsfw_concepts
      },
      payment: {
        amount: ESTIMATED_COST,
        walletAddress: COINBASE_WALLET,
        agentDecision: agentResponse
      },
      userBudget: {
        spent: updatedBudget.spent,
        remaining: updatedBudget.remaining,
        limit: updatedBudget.limit
      },
      metadata: {
        userId,
        garmentType,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error processing try-on request:', error);

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    }, { status: 500 });
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'virtual-tryon-agent',
    features: ['locus-payments', 'fal-ai-integration'],
    estimatedCost: ESTIMATED_COST
  });
}
