import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { url } = await req.json()

  if (!url) {
    return NextResponse.json({ error: 'URL required' }, { status: 400 })
  }

  // Always extract price from sp param — works even if page fetch fails
  let price: number | null = null
  try {
    const parsed = new URL(url)
    const sp = parsed.searchParams.get('sp')
    if (sp) price = parseFloat(sp)
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
  }

  // Try to fetch OG metadata from the page
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml'
      },
      signal: AbortSignal.timeout(6000)
    })

    const html = await response.text()

    const titleMatch =
      html.match(/<meta[^>]*property="og:title"[^>]*content="([^"]+)"[^>]*>/) ||
      html.match(/<meta[^>]*content="([^"]+)"[^>]*property="og:title"[^>]*>/) ||
      html.match(/<title[^>]*>([^<]+)<\/title>/)

    const imageMatch =
      html.match(/<meta[^>]*property="og:image"[^>]*content="([^"]+)"[^>]*>/) ||
      html.match(/<meta[^>]*content="([^"]+)"[^>]*property="og:image"[^>]*>/)

    const title = titleMatch?.[1]?.trim() || null
    const garmentImageUrl = imageMatch?.[1]?.trim() || null
    const brand = title ? title.split(/\s+/)[0] : null

    return NextResponse.json({ title, brand, price, garmentImageUrl })
  } catch {
    // Page fetch failed — return what we could extract from the URL
    return NextResponse.json({ title: null, brand: null, price, garmentImageUrl: null })
  }
}
