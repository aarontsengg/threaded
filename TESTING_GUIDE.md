# Testing Guide - Locus Payment Integration

## Quick Start

Your demo is ready to test! The development server is running at: **http://localhost:3000**

---

## What's Implemented

✅ **Budget Tracker** - Tracks per-user spending ($0.50 limit each)
✅ **Agent Logic** - Autonomous payment decisions with Locus
✅ **Payment Flow** - Sends USDC to your Coinbase wallet
✅ **Frontend** - Real API integration with budget display
✅ **Error Handling** - Clear messages for budget limits

---

## Test Scenarios

### Test 1: Health Check ✅

```bash
curl http://localhost:3000/api/agent/process-tryon
```

**Expected:**
```json
{
  "status": "ok",
  "service": "virtual-tryon-agent",
  "features": ["locus-payments", "fal-ai-integration"],
  "estimatedCost": 0.05
}
```

### Test 2: First Try-On Request (Happy Path)

**Steps:**
1. Open http://localhost:3000 in your browser
2. Upload a person image (or paste a URL)
3. Paste a clothing image URL
4. Click "Try It On"

**Expected Behavior:**
1. Button shows "Evaluating request..."
2. Agent checks your budget ($0 spent, $0.50 remaining)
3. Agent sends $0.05 to Coinbase wallet `0x6036cD502662E0F965bb919472B895361aEB4eBf`
4. fal.ai processes the virtual try-on
5. Result displayed
6. Budget shows: "Used $0.05 of $0.50"

**Check Locus Dashboard:**
- Transaction should appear
- Memo: `VirtualTryOn-User[session-id]-upper_body`
- Amount: $0.05 USDC
- Recipient: Your Coinbase wallet

### Test 3: User Budget Limit (10 Requests)

**Steps:**
1. Make 10 try-on requests in the same browser session
2. On the 11th request, you should hit the limit

**Expected:**
- First 10 requests: Success, budget increments ($0.05, $0.10, $0.15... $0.50)
- 11th request: Error message "Budget limit reached! You've spent $0.50 of $0.50"
- Agent never even evaluates (fast rejection at app level)

**Visual:**
- Budget progress bar fills to 100%
- Red error card displays

### Test 4: Multiple Users (Different Sessions)

**Steps:**
1. Open browser in private/incognito mode
2. Make a try-on request
3. This creates a NEW session ID
4. Should have independent $0.50 budget

**Expected:**
- User 1 (normal browser): Can spend $0.50
- User 2 (incognito): Also can spend $0.50
- Both tracked separately
- Global Locus budget decrements ($2.00 → $1.95 → $1.90...)

### Test 5: Global Budget Exhaustion

**Steps:**
1. Make 40 total requests across all users
2. 40 × $0.05 = $2.00 (full budget)
3. 41st request should fail

**Expected:**
- Agent checks global budget via Locus tools
- Agent denies: "Insufficient global budget"
- Error displayed to user
- Even if user has personal budget remaining

---

## Monitoring Console Logs

Watch the terminal running `npm run dev` for detailed logs:

```
Processing virtual try-on request:
User ID: session-1699...
User budget check: { hasEnough: true, spent: 0, remaining: 0.5, limit: 0.5 }
Initializing Locus payment agent:
Agent decision: [Agent's reasoning and decision]
Calling fal.ai:
Virtual try-on completed successfully!
Updated user budget: { hasEnough: true, spent: 0.05, remaining: 0.45, limit: 0.5 }
```

---

## Common Issues

### Issue: "Missing required field FAL_KEY"

**Solution:** Add your fal.ai API key to `.env`:
```bash
FAL_KEY=your_key_here
```
Then restart the dev server.

### Issue: Agent denies all requests

**Possible Causes:**
1. Locus wallet has $0 balance
2. Locus policy limits too restrictive
3. LOCUS_CLIENT_ID/SECRET incorrect

**Check:**
- Log into Locus dashboard
- Verify wallet balance > $0
- Check policy group settings

### Issue: "Connection refused" errors

**Solution:** Make sure dev server is running:
```bash
npm run dev
```

### Issue: Frontend doesn't update budget

**Check:**
1. Network tab in browser DevTools
2. Look for POST request to `/api/agent/process-tryon`
3. Check response includes `userBudget` object

---

## Demo Script for Locus Review

### Preparation:
1. Open Locus dashboard in one tab
2. Open http://localhost:3000 in another
3. Have sample images ready (person + clothing URLs)

### Demo Flow:

**1. Introduction (30 seconds)**
> "This demo shows autonomous AI agent payment management using Locus. The agent manages a $2 budget, enforces per-user limits, and maintains full audit trails."

**2. Show Current State (30 seconds)**
- Locus dashboard: Point out $2 budget, policies configured
- Frontend: Clean UI, no budget displayed yet

**3. First Request (1 minute)**
- Upload person image
- Paste clothing URL
- Click "Try It On"
- Point out: "Agent is evaluating the request right now"
- Show result + budget display: "$0.05 used, $0.45 remaining"

**4. Check Locus Dashboard (30 seconds)**
- Refresh Locus transactions
- Point out the new transaction with user ID in memo
- Highlight: "$0.05 sent to Coinbase wallet"

**5. Approach User Limit (1 minute)**
- Make several more requests quickly
- Watch budget bar fill up
- Show smooth UX as budget depletes

**6. Hit User Limit (30 seconds)**
- Make 11th request (or whatever exceeds $0.50)
- Show error message
- Explain: "Agent enforces $0.50 per-user limit autonomously"

**7. New User (30 seconds)**
- Open incognito window
- Make request as "new user"
- Works! Shows independent budget tracking

**8. Locus Dashboard Review (1 minute)**
- Show full transaction history
- Each transaction has user ID
- All include agent's decision reasoning
- Full audit trail for compliance

**9. Key Takeaways (30 seconds)**
> "This demonstrates:
> - Autonomous decision-making by AI agents
> - Multi-tenant budget management
> - Policy enforcement at two levels (user + global)
> - Complete audit trail
> - Real B2B SaaS pattern for API cost management"

---

## API Endpoint Documentation

### POST /api/agent/process-tryon

**Request:**
```typescript
{
  humanImageUrl: string;      // URL to person image
  garmentImageUrl: string;    // URL to clothing image
  garmentType: 'upper_body' | 'lower_body' | 'dresses';
}
```

**Headers:**
```
Content-Type: application/json
x-session-id: <optional-session-id>  // Auto-generated if not provided
```

**Success Response (200):**
```typescript
{
  success: true;
  result: {
    imageUrl: string;
    width: number;
    height: number;
    seed: number;
    hasNsfwConcepts: boolean;
  };
  payment: {
    amount: number;           // 0.05
    walletAddress: string;    // Your Coinbase wallet
    agentDecision: string;    // Agent's reasoning
  };
  userBudget: {
    spent: number;
    remaining: number;
    limit: number;            // 0.50
  };
  metadata: {
    userId: string;
    garmentType: string;
    timestamp: string;
  };
}
```

**Error Response (402 - Payment Required):**
```typescript
{
  success: false;
  error: string;
  userBudget?: {
    spent: number;
    remaining: number;
    limit: number;
  };
  estimatedCost: number;
}
```

---

## Architecture Summary

```
User Browser (Session ID: abc123)
    ↓
Next.js Frontend (localhost:3000)
    ↓ POST /api/agent/process-tryon
Backend API Route
    ├─ Check user budget ($0.50 limit) ← In-memory tracker
    ├─ If OK: Initialize Locus agent
    ├─ Agent checks global budget ← Locus tools
    ├─ Agent sends USDC → Your Coinbase wallet
    ├─ Call fal.ai API (uses your prepaid credits)
    ├─ Record user spending
    └─ Return result + updated budget
```

---

## Next Steps After Testing

1. **Add FAL_KEY** to `.env`
2. **Test all scenarios** above
3. **Record demo video** for Locus feedback
4. **Gather metrics:**
   - Number of successful transactions
   - Agent approval/denial reasoning
   - Budget tracking accuracy
   - Any edge cases encountered

5. **Prepare feedback for Cole:**
   - What worked well
   - Pain points in integration
   - Feature requests
   - Ideas for improvement

---

## Questions?

- Check console logs for detailed info
- Review [LOCUS_INTEGRATION.md](LOCUS_INTEGRATION.md) for architecture
- Test each scenario methodically
- Document any issues for Locus feedback

**Good luck with your demo! 🚀**
