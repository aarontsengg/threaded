# threaded

An AI-powered virtual try-on app. Upload your photo, provide a clothing item (via image upload, URL, or text description), and see yourself wearing it — generated in seconds using fal.ai's Leffa model.

Built with autonomous payment infrastructure via [Locus](https://paywithlocus.com), where an AI agent manages API spending budgets and approves each request before it executes.

![Stack](https://img.shields.io/badge/stack-Next.js%20%2B%20TypeScript%20%2B%20fal.ai-black)
![License](https://img.shields.io/badge/license-MIT-blue)

---

## Features

- **Virtual try-on** — Upload a photo of yourself and see how any garment looks on you
- **Three garment input modes** — Upload an image, paste a URL, or describe the item in text (AI generates it with Flux Schnell)
- **Garment type support** — Tops/shirts/jackets, pants/skirts, and full dresses/outfits
- **Autonomous payment agent** — Locus AI agent evaluates each request, checks budget policy, and sends USDC per try-on
- **Per-user budget tracking** — $0.50 limit per session with a live progress bar
- **Image format normalization** — Automatically converts AVIF/WebP uploads to JPEG for fal.ai compatibility

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15, React, TypeScript |
| UI | shadcn/ui, Tailwind CSS |
| AI / Image Generation | fal.ai (Leffa virtual try-on, Flux Schnell) |
| Payments | Locus autonomous payment infrastructure |
| Budget tracking | In-memory session tracker |

---

## Getting Started

### Prerequisites

- Node.js 18+
- A [fal.ai](https://fal.ai) API key
- A [Locus](https://paywithlocus.com) account with client credentials

### 1. Clone the repo

```bash
git clone https://github.com/aarontsengg/threaded.git
cd threaded
```

### 2. Install dependencies

```bash
npm install
# or
pnpm install
```

### 3. Set up environment variables

Create a `.env.local` file:

```bash
# fal.ai
FAL_KEY=your_fal_api_key

# Locus (autonomous payments)
# LOCUS_CLIENT_ID=your_locus_client_id
# LOCUS_CLIENT_SECRET=your_locus_client_secret

# Anthropic (AI agent decision-making)
ANTHROPIC_API_KEY=your_anthropic_api_key
```

### 4. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## How It Works

### Try-On Flow

1. User uploads a photo of themselves
2. User provides a garment — either as an uploaded image, a URL, text description, or Phia URL
3. If text description: Flux Schnell generates a garment image (~$0.03)
4. The Locus AI agent checks the user's remaining budget and global policy limits
5. If approved: agent sends USDC payment, then fal.ai's Leffa model runs the try-on (~$0.05)
6. Result image is returned and displayed alongside the original

### Payment Architecture

```
User Request
    ↓
Budget check (per-user: $0.50 limit)
    ↓
Locus AI agent evaluates → sends USDC
    ↓
fal.ai API call (Leffa virtual try-on)
    ↓
Result + updated budget returned to user
```

Each request costs ~$0.05 USDC. Per-user sessions are limited to $0.50 (10 requests). Global Locus budget caps total spend.

---

## Project Structure

```
threaded/
├── app/
│   ├── page.tsx                          # Main try-on UI
│   └── api/agent/process-tryon/
│       └── route.ts                      # API endpoint — orchestrates payment + fal.ai
├── components/
│   ├── image-upload.tsx                  # Drag-and-drop image uploader
│   ├── tryon-results.tsx                 # Result display with comparison
│   └── ui/                              # shadcn/ui components
├── lib/
│   └── budget-tracker.ts                # Per-user session spending tracker
├── scripts/
│   └── test-locus.ts                    # Locus integration test
├── LOCUS_INTEGRATION.md                 # Detailed Locus setup and architecture
└── TESTING_GUIDE.md                     # Test scenarios and demo script
```

---

## API Endpoint

### `POST /api/agent/process-tryon`

Accepts `multipart/form-data` (with file uploads) or `application/json`.

**Request fields:**

| Field | Type | Description |
|---|---|---|
| `humanImage` | File | Person photo (file upload) |
| `humanImageUrl` | string | Person photo (URL alternative) |
| `garmentImage` | File | Garment photo (file upload) |
| `garmentImageUrl` | string | Garment photo (URL alternative) |
| `garmentDescription` | string | Text description — AI generates garment image |
| `garmentType` | string | `upper_body`, `lower_body`, or `dresses` |

**Headers:** `x-session-id` (optional — auto-generated per browser session)

**Success response (200):**

```json
{
  "success": true,
  "result": { "imageUrl": "...", "width": 1024, "height": 1536 },
  "cost": 0.05,
  "userBudget": { "spent": 0.05, "remaining": 0.45, "limit": 0.50 }
}
```

**Budget exceeded (402):**

```json
{
  "success": false,
  "error": "User budget limit reached",
  "userBudget": { "spent": 0.50, "remaining": 0.00, "limit": 0.50 }
}
```

---

## Related Projects

- [phia-discovery-scraper](https://github.com/aarontsengg/phia-discovery-scraper) — Selenium-based scraper for Phia fashion discovery, with a React browsing UI
