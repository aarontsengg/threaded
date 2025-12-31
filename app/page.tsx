"use client"

import { useState, useEffect } from "react"
import { Sparkles, ArrowRight, ImageIcon, DollarSign, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import ImageUpload from "@/components/image-upload"
import TryOnResults from "@/components/tryon-results"

interface UserBudget {
  spent: number
  remaining: number
  limit: number
}

interface PaymentInfo {
  amount: number
  walletAddress: string
  agentDecision: string
}

export default function VirtualTryOnPage() {
  const [personImage, setPersonImage] = useState<string | null>(null)
  const [clothingUrl, setClothingUrl] = useState("")
  const [clothingDescription, setClothingDescription] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingStage, setProcessingStage] = useState("")
  const [resultImage, setResultImage] = useState<string | null>(null)
  const [userBudget, setUserBudget] = useState<UserBudget | null>(null)
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [sessionId] = useState(() => `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`)

  const handleTryOn = async () => {
    if (!personImage || !clothingUrl) {
      return
    }

    setIsProcessing(true)
    setError(null)
    setProcessingStage("Evaluating request...")

    try {
      const response = await fetch('/api/agent/process-tryon', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-id': sessionId
        },
        body: JSON.stringify({
          humanImageUrl: personImage,
          garmentImageUrl: clothingUrl,
          garmentType: 'upper_body' // Default to upper_body for now
        })
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 402) {
          // Budget limit reached
          if (data.userBudget) {
            setError(`Budget limit reached! You've spent $${data.userBudget.spent.toFixed(2)} of $${data.userBudget.limit.toFixed(2)}`)
          } else {
            setError(data.error || 'Payment declined by agent')
          }
        } else {
          setError(data.error || 'Failed to process request')
        }
        return
      }

      // Success!
      setResultImage(data.result.imageUrl)
      setUserBudget(data.userBudget)
      setPaymentInfo(data.payment)

    } catch (error) {
      console.error("Try-on failed:", error)
      setError(error instanceof Error ? error.message : 'Network error occurred')
    } finally {
      setIsProcessing(false)
      setProcessingStage("")
    }
  }

  const handleReset = () => {
    setResultImage(null)
    setClothingUrl("")
    setClothingDescription("")
  }

  if (resultImage) {
    return (
      <TryOnResults
        originalImage={personImage!}
        resultImage={resultImage}
        onReset={handleReset}
        onTryAnother={handleReset}
      />
    )
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            <Sparkles className="w-4 h-4" />
            AI-Powered Virtual Try-On
          </div>
          <h1 className="text-5xl font-bold mb-4 text-balance">See Yourself in Any Outfit</h1>
          <p className="text-xl text-muted-foreground text-balance max-w-2xl mx-auto">
            Upload your photo and instantly visualize how any clothing item looks on you using advanced AI technology
          </p>
        </div>

        {/* Main Content */}
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left Column - Person Image */}
          <Card className="p-6 bg-card border-border">
            <div className="mb-4">
              <Label className="text-lg font-semibold flex items-center gap-2">
                <ImageIcon className="w-5 h-5" />
                Your Photo
              </Label>
              <p className="text-sm text-muted-foreground mt-1">Upload a clear, full-body photo for best results</p>
            </div>

            <ImageUpload image={personImage} onImageChange={setPersonImage} label="Upload your photo" />
          </Card>

          {/* Right Column - Clothing Input */}
          <Card className="p-6 bg-card border-border">
            <div className="mb-4">
              <Label className="text-lg font-semibold flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                Clothing Item
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                Provide a clothing image URL or describe what you want to try on
              </p>
            </div>

            <div className="space-y-6">
              <div>
                <Label htmlFor="clothing-url" className="text-sm font-medium">
                  Clothing Image URL
                </Label>
                <Input
                  id="clothing-url"
                  type="url"
                  placeholder="https://example.com/shirt.jpg"
                  value={clothingUrl}
                  onChange={(e) => setClothingUrl(e.target.value)}
                  className="mt-2"
                />
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">Or</span>
                </div>
              </div>

              <div>
                <Label htmlFor="clothing-description" className="text-sm font-medium">
                  Describe the Clothing
                </Label>
                <Input
                  id="clothing-description"
                  type="text"
                  placeholder="e.g., red summer dress, blue denim jacket"
                  value={clothingDescription}
                  onChange={(e) => setClothingDescription(e.target.value)}
                  className="mt-2"
                />
              </div>

              {/* Error Message */}
              {error && (
                <Card className="p-4 bg-destructive/10 border-destructive/20">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-destructive mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-destructive">{error}</p>
                    </div>
                  </div>
                </Card>
              )}

              {/* Budget Display */}
              {userBudget && (
                <Card className="p-4 bg-primary/5 border-primary/20">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium">Your Budget</span>
                    </div>
                    <span className="text-sm font-semibold text-primary">
                      ${userBudget.remaining.toFixed(2)} remaining
                    </span>
                  </div>
                  <div className="w-full bg-primary/10 rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all"
                      style={{ width: `${(userBudget.spent / userBudget.limit) * 100}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Used ${userBudget.spent.toFixed(2)} of ${userBudget.limit.toFixed(2)}
                  </p>
                </Card>
              )}

              <Button
                onClick={handleTryOn}
                disabled={!personImage || !clothingUrl || isProcessing}
                className="w-full h-12 text-base font-semibold"
                size="lg"
              >
                {isProcessing ? (
                  <>
                    <Sparkles className="w-5 h-5 mr-2 animate-spin" />
                    {processingStage || "Processing..."}
                  </>
                ) : (
                  <>
                    Try It On
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </Card>
        </div>

        {/* Info Banner */}
        <Card className="mt-8 p-6 bg-accent/5 border-accent/20">
          <div className="flex items-start gap-4">
            <div className="p-2 rounded-lg bg-accent/10">
              <Sparkles className="w-6 h-6 text-accent" />
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-1">How It Works</h3>
              <p className="text-muted-foreground text-balance">
                Our AI analyzes your photo and the clothing item, then generates a realistic visualization of how the
                outfit would look on you. The technology preserves your pose, body shape, and lighting for the most
                accurate results.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </main>
  )
}
