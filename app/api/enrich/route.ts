import { NextRequest, NextResponse } from 'next/server'
import { ChatAnthropic } from '@langchain/anthropic'

export interface ProductInsights {
  verdict: 'Worth it' | 'Think twice' | 'Depends'
  summary: string
  pros: string[]
  cons: string[]
  fitNote: string
  sources: Array<{ title: string; url: string }>
}

export async function POST(req: NextRequest) {
  const { productName, brand, price, garmentType } = await req.json()

  if (!productName && !brand) {
    return NextResponse.json({ error: 'Product name or brand required' }, { status: 400 })
  }

  const query = [brand, productName].filter(Boolean).join(' ')

  // Fetch Reddit signals
  type RedditPost = { title: string; permalink: string; score: number; subreddit: string }
  let redditPosts: RedditPost[] = []
  try {
    const redditRes = await fetch(
      `https://www.reddit.com/search.json?q=${encodeURIComponent(query + ' review')}&sort=relevance&limit=8&type=link`,
      {
        headers: { 'User-Agent': 'threaded-fashion-app/1.0 (by /u/threaded_app)' },
        signal: AbortSignal.timeout(5000)
      }
    )
    const redditData = await redditRes.json()
    redditPosts = (redditData?.data?.children ?? [])
      .map((c: { data: RedditPost }) => c.data)
      .filter((p: RedditPost) => p.score > 0)
      .slice(0, 5)
  } catch {
    // Reddit unavailable — Claude will use its own knowledge
  }

  const hasSignals = redditPosts.length > 0
  const snippets = redditPosts
    .map((p) => `- "${p.title}" (r/${p.subreddit}, ${p.score} upvotes)`)
    .join('\n')

  const prompt = `You are a fashion shopping assistant. Analyze this clothing item and provide a purchase confidence report.

Item: ${productName || 'Unknown'}
Brand: ${brand || 'Unknown'}
${price ? `Price: $${price}` : ''}
Type: ${garmentType || 'clothing'}

${hasSignals ? `Community signals from Reddit:\n${snippets}` : 'No community data found for this specific item.'}

Respond ONLY with a valid JSON object — no markdown, no explanation, no extra text:
{
  "verdict": "Worth it",
  "summary": "2-3 sentence buying summary based on signals and general brand knowledge",
  "pros": ["pro 1", "pro 2", "pro 3"],
  "cons": ["con 1", "con 2"],
  "fitNote": "Sizing and fit advice from community, or general brand sizing notes if no community data"
}`

  const llm = new ChatAnthropic({
    model: 'claude-haiku-4-5-20251001',
    apiKey: process.env.ANTHROPIC_API_KEY,
    maxTokens: 512
  })

  try {
    const response = await llm.invoke(prompt)
    const content = typeof response.content === 'string' ? response.content : JSON.stringify(response.content)

    // Strip any markdown fences if present
    const cleaned = content.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim()
    const parsed = JSON.parse(cleaned) as ProductInsights

    parsed.sources = redditPosts.slice(0, 3).map((p) => ({
      title: p.title,
      url: `https://reddit.com${p.permalink}`
    }))

    return NextResponse.json(parsed)
  } catch {
    const fallback: ProductInsights = {
      verdict: 'Depends',
      summary: `Not enough data to make a strong recommendation on ${productName || 'this item'} right now.`,
      pros: ['Check brand reviews directly'],
      cons: ['Limited community data available'],
      fitNote: 'No fit data available — check retailer size guide',
      sources: []
    }
    return NextResponse.json(fallback)
  }
}
