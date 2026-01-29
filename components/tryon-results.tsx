"use client"

import { Download, RotateCcw, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

interface TryOnResultsProps {
  originalImage: string
  resultImage: string
  generatedGarment?: string | null
  onReset: () => void
  onTryAnother: () => void
}

export default function TryOnResults({ originalImage, resultImage, generatedGarment, onReset, onTryAnother }: TryOnResultsProps) {
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

        {/* Note */}
        <Card className="mt-8 p-6 bg-accent/5 border-accent/20">
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
