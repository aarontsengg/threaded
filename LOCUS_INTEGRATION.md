# Locus Payment Integration - Setup Guide

This project integrates Locus autonomous payment infrastructure with a virtual try-on application powered by fal.ai.

## Architecture Overview

```
User Request → AI Agent (Claude) → Locus Payment → fal.ai API → Virtual Try-On Result
```

### Key Components

1. **Locus MCP Client**: Manages autonomous payments via policy-based spending controls
2. **AI Agent**: Claude-powered decision-making for API cost management
3. **fal.ai API**: Virtual try-on image generation service

---

## Setup Instructions

### 1. Environment Variables

Add the following to your `.env` file:

```bash
# Locus Credentials (Already configured)
LOCUS_CLIENT_ID=39ce9c0j6joc6f486r5fnlp2se
LOCUS_CLIENT_SECRET=1oqqoh1hcgopnsipn06kgsdb9mn1t8r27u60d1eu8huri43r0hsd

# Anthropic API (Already configured)
ANTHROPIC_API_KEY=sk-ant-api03-...

# fal.ai Configuration (TO BE ADDED)
FAL_KEY=your_fal_api_key_here
FAL_WALLET_ADDRESS=0xYourWalletAddressForReceivingPayments
```

### 2. Get fal.ai API Key

1. Sign up at [fal.ai](https://fal.ai)
2. Navigate to your dashboard
3. Generate an API key
4. Add it to `.env` as `FAL_KEY`

### 3. Configure Payment Wallet Address

You need to provide a wallet address where the AI agent will send payments for API usage:

**Option A: Use Your Own Wallet**
- Set `FAL_WALLET_ADDRESS` to your Ethereum wallet (0x...)

**Option B: Use fal.ai's Payment Address (if they provide one)**
- Check fal.ai documentation for their preferred payment method
- Some APIs might not require upfront payment via crypto

**Note**: Currently the estimated cost is set to $0.05 USDC per request. Adjust in [route.ts:13](app/api/agent/process-tryon/route.ts#L13) based on actual fal.ai pricing.

### 4. Locus Policy Configuration

Your Locus dashboard should have the following policies configured (already done - $2 total budget):

- ✅ Maximum per transaction limit
- ✅ Daily spending cap
- ✅ Total budget allocation ($2.00)

---

## API Endpoint

### POST `/api/agent/process-tryon`

Processes a virtual try-on request with autonomous payment handling.

**Request Body:**
```typescript
{
  "humanImageUrl": "https://example.com/person.jpg",
  "garmentImageUrl": "https://example.com/shirt.jpg",
  "garmentType": "upper_body" | "lower_body" | "dresses"
}
```

**Success Response (200):**
```typescript
{
  "success": true,
  "result": {
    "imageUrl": "https://fal.ai/output/...",
    "width": 1024,
    "height": 1536,
    "seed": 12345,
    "hasNsfwConcepts": false
  },
  "payment": {
    "amount": 0.05,
    "walletAddress": "0x...",
    "agentDecision": "Payment approved. Transaction sent..."
  },
  "metadata": {
    "garmentType": "upper_body",
    "timestamp": "2025-01-08T..."
  }
}
```

**Payment Required Response (402):**
```typescript
{
  "success": false,
  "error": "Payment agent declined the request",
  "reason": "Insufficient budget remaining...",
  "estimatedCost": 0.05
}
```

### GET `/api/agent/process-tryon`

Health check endpoint.

**Response:**
```typescript
{
  "status": "ok",
  "service": "virtual-tryon-agent",
  "features": ["locus-payments", "fal-ai-integration"],
  "estimatedCost": 0.05
}
```

---

## How It Works

### Payment Flow

1. **User submits try-on request** via frontend
2. **API route receives request** at `/api/agent/process-tryon`
3. **Locus MCP client initializes** and connects to payment server
4. **AI Agent evaluates request**:
   - Checks current budget availability
   - Estimates API cost ($0.05)
   - Makes autonomous decision to proceed or decline
5. **If approved**: Agent sends USDC payment to fal.ai wallet
6. **API call executed**: fal.ai virtual try-on processes the images
7. **Result returned** to user with payment details

### Agent Decision Logic

The AI agent considers:
- Current budget balance (via `get_payment_context`)
- Policy limits configured in Locus dashboard
- Cost of the API request
- Justification for the transaction

The agent will **decline** if:
- Insufficient funds
- Would exceed policy limits
- Request appears invalid or suspicious

---

## Available Locus Tools

The agent has access to these payment tools:

1. **get_payment_context**: Check budget status and whitelisted contacts
2. **send_to_contact**: Send USDC to whitelisted contacts by number
3. **send_to_address**: Send USDC to any wallet address (used for fal.ai)
4. **send_to_email**: Send USDC via escrow to email addresses

---

## Testing

### 1. Test Script

Run the Locus integration test to verify connectivity:

```bash
npx tsx scripts/test-locus.ts
```

Expected output:
```
✅ Successfully loaded 4 tools
🤖 Creating AI agent with Locus tools...
✨ Test completed successfully!
```

### 2. API Health Check

```bash
curl http://localhost:3000/api/agent/process-tryon
```

### 3. Full End-to-End Test

```bash
curl -X POST http://localhost:3000/api/agent/process-tryon \
  -H "Content-Type: application/json" \
  -d '{
    "humanImageUrl": "https://example.com/person.jpg",
    "garmentImageUrl": "https://example.com/shirt.jpg",
    "garmentType": "upper_body"
  }'
```

---

## Monitoring

### View Transactions

1. Log in to [Locus Dashboard](https://app.paywithlocus.com)
2. Navigate to **Transactions** tab
3. View detailed audit trail with agent justifications

### Check Budget

Run the test script and ask: "What is my payment context?"

```bash
npx tsx scripts/test-locus.ts
```

---

## Troubleshooting

### Agent Declines All Requests

**Issue**: Agent response contains "insufficient budget" or "declined"

**Solutions**:
1. Check Locus dashboard for available balance
2. Increase policy limits if needed
3. Verify total budget allocation ($2.00 currently)

### fal.ai API Errors

**Issue**: API call fails after payment

**Solutions**:
1. Verify `FAL_KEY` is correct in `.env`
2. Check fal.ai API status
3. Ensure image URLs are publicly accessible
4. Review fal.ai pricing - adjust `ESTIMATED_COST` if needed

### TypeScript Errors

**Issue**: Import errors or type mismatches

**Solution**:
```bash
npm install
npm run build
```

---

## Cost Estimation

### Current Configuration

- **Estimated cost per request**: $0.05 USDC
- **Total budget**: $2.00 USDC
- **Maximum requests**: ~40 try-ons

### Adjusting Costs

Update the cost estimate in [route.ts:13](app/api/agent/process-tryon/route.ts#L13):

```typescript
const ESTIMATED_COST = 0.10; // Increase to $0.10 per request
```

---

## Next Steps

1. ✅ Get fal.ai API key
2. ✅ Configure `FAL_KEY` in `.env`
3. ✅ Set `FAL_WALLET_ADDRESS` (or remove payment requirement for testing)
4. ⬜ Update frontend to call `/api/agent/process-tryon`
5. ⬜ Test end-to-end flow
6. ⬜ Monitor transactions in Locus dashboard
7. ⬜ Gather metrics for Locus feedback

---

## Technical Details

### Dependencies

```json
{
  "@locus-technologies/langchain-mcp-m2m": "^0.1.0",
  "@langchain/anthropic": "^1.0.0",
  "@langchain/langgraph": "^1.0.1",
  "@langchain/core": "^1.0.3",
  "@fal-ai/client": "^1.7.2"
}
```

### File Structure

```
├── app/
│   └── api/
│       └── agent/
│           └── process-tryon/
│               └── route.ts          # Main API endpoint
├── scripts/
│   └── test-locus.ts                # Integration test script
├── .env                              # Environment variables
└── LOCUS_INTEGRATION.md             # This file
```

---

## Support

- **Locus Discord**: [discord.gg/TGnjUceXwE](https://discord.gg/TGnjUceXwE)
- **Locus Email**: founders@paywithlocus.com
- **fal.ai Docs**: [docs.fal.ai](https://docs.fal.ai)

---

## Demo for Locus Feedback

When ready to provide feedback to Cole:

1. Record a video walkthrough showing:
   - User submits try-on request
   - Agent autonomously evaluates and pays
   - Transaction appears in Locus dashboard
   - Virtual try-on result delivered

2. Prepare metrics:
   - Number of successful transactions
   - Agent decision accuracy
   - Payment latency
   - Any edge cases or errors encountered

3. Suggestions for improvement:
   - Direct balance checking tool
   - Webhook notifications for low balance
   - Batch payment support
   - Better structured output from agent decisions
