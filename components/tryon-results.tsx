"use client"

import { Download, RotateCcw, Sparkles, ThumbsUp, ThumbsDown, Minus, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

interface ProductInsights {
  verdict: 'Worth it' | 'Think twice' | 'Depends'
  summary: string
  pros: string[]
  cons: string[]
  fitNote: string
  sources: Array<{ title: string; url: string }>
}

interface TryOnResultsProps {
  originalImage: string
  resultImage: string
  generatedGarment?: string | null
  insights?: ProductInsights | null
  isLoadingInsights?: boolean
  onReset: () => void
  onTryAnother: () => void
}

const verdictConfig = {
  'Worth it': { icon: ThumbsUp, color: 'text-green-500', bg: 'bg-green-500/10 border-green-500/20' },
  'Think twice': { icon: ThumbsDown, color: 'text-red-500', bg: 'bg-red-500/10 border-red-500/20' },
  'Depends': { icon: Minus, color: 'text-yellow-500', bg: 'bg-yellow-500/10 border-yellow-500/20' },
}

export default function TryOnResults({ originalImage, resultImage, generatedGarment, insights, isLoadingInsights, onReset, onTryAnother }: TryOnResultsProps) {
  const handleDownload = () => {
    const link = document.createElement("a")
    link.href = resultImage
    link.download = "virtual-tryon-result.png"
    link.click()
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            <Sparkles className="w-4 h-4" />
            Try-On Complete
          </div>
          <h1 className="text-4xl font-bold mb-4">Here's How You Look!</h1>
          <p className="text-lg text-muted-foreground">Compare the before and after to see the transformation</p>
        </div>

        {/* Results Grid */}
        <div className={`grid gap-8 mb-8 ${generatedGarment ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
          {/* Original */}
          <Card className="p-6 bg-card border-border">
            <h3 className="text-lg font-semibold mb-4">Original Photo</h3>
            <div className="aspect-[3/4] rounded-lg overflow-hidden bg-secondary">
              <img src={originalImage || "/placeholder.svg"} alt="Original" className="w-full h-full object-cover" />
            </div>
          </Card>

          {/* Generated Garment (if AI-generated from description) */}
          {generatedGarment && (
            <Card className="p-6 bg-card border-border">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-accent" />
                AI-Generated Garment
              </h3>
              <div className="aspect-[3/4] rounded-lg overflow-hidden bg-secondary">
                <img src={generatedGarment} alt="Generated garment" className="w-full h-full object-cover" />
              </div>
            </Card>
          )}

          {/* Result */}
          <Card className="p-6 bg-card border-border">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Virtual Try-On Result
            </h3>
            <div className="aspect-[3/4] rounded-lg overflow-hidden bg-secondary">
              <img src={resultImage || "/placeholder.svg"} alt="Result" className="w-full h-full object-cover" />
            </div>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-4 justify-center">
          <Button onClick={handleDownload} size="lg" className="gap-2">
            <Download className="w-5 h-5" />
            Download Result
          </Button>
          <Button onClick={onTryAnother} variant="outline" size="lg" className="gap-2 bg-transparent">
            <RotateCcw className="w-5 h-5" />
            Try Another Outfit
          </Button>
          <Button onClick={onReset} variant="outline" size="lg">
            Start Over
          </Button>
        </div>

        {/* Enriched Insights Panel */}
        {(isLoadingInsights || insights) && (
          <Card className="mt-8 p-6 bg-card border-border">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-semibold">Purchase Confidence Report</h3>
              {isLoadingInsights && (
                <span className="text-xs text-muted-foreground ml-auto animate-pulse">Analyzing community signals...</span>
              )}
            </div>

            {isLoadingInsights && !insights && (
              <div className="space-y-3">
                <div className="h-4 bg-secondary/60 rounded animate-pulse w-3/4" />
                <div className="h-4 bg-secondary/60 rounded animate-pulse w-1/2" />
                <div className="h-4 bg-secondary/60 rounded animate-pulse w-2/3" />
              </div>
            )}

            {insights && (() => {
              const { icon: VerdictIcon, color, bg } = verdictConfig[insights.verdict]
              return (
                <div className="space-y-5">
                  {/* Verdict badge */}
                  <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-semibold ${bg} ${color}`}>
                    <VerdictIcon className="w-4 h-4" />
                    {insights.verdict}
                  </div>

                  {/* Summary */}
                  <p className="text-muted-foreground text-sm leading-relaxed">{insights.summary}</p>

                  {/* Pros / Cons */}
                  <div className="grid sm:grid-cols-2 gap-4">
                    {insights.pros.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-green-500 uppercase tracking-wide mb-2">Pros</p>
                        <ul className="space-y-1">
                          {insights.pros.map((pro, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm">
                              <span className="text-green-500 mt-0.5">+</span>
                              {pro}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {insights.cons.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-red-500 uppercase tracking-wide mb-2">Cons</p>
                        <ul className="space-y-1">
                          {insights.cons.map((con, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm">
                              <span className="text-red-500 mt-0.5">–</span>
                              {con}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Fit note */}
                  {insights.fitNote && (
                    <div className="p-3 rounded-lg bg-secondary/50 text-sm">
                      <span className="font-medium">Fit note: </span>
                      <span className="text-muted-foreground">{insights.fitNote}</span>
                    </div>
                  )}

                  {/* Sources */}
                  {insights.sources.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground font-medium mb-2">Community sources</p>
                      <ul className="space-y-1">
                        {insights.sources.map((s, i) => (
                          <li key={i}>
                            <a
                              href={s.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-xs text-primary hover:underline"
                            >
                              <ExternalLink className="w-3 h-3 shrink-0" />
                              <span className="truncate">{s.title}</span>
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )
            })()}
          </Card>
        )}

        {/* Note */}
        <Card className="mt-4 p-6 bg-accent/5 border-accent/20">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Powered by fal.ai virtual try-on technology. Results may vary based on image quality and lighting.
            </p>
          </div>
        </Card>
      </div>
    </main>
  )
}
