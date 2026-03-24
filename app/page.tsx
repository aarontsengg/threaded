"use client"

import { useState } from "react"
import { Sparkles, ArrowRight, ImageIcon, DollarSign, AlertCircle, Upload, X, Link, ThumbsUp, ThumbsDown, Minus, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import ImageUpload from "@/components/image-upload"
import TryOnResults from "@/components/tryon-results"

interface UserBudget {
  spent: number
  remaining: number
  limit: number
}

interface ProductMeta {
  title: string | null
  brand: string | null
  price: number | null
  garmentImageUrl: string | null
}

interface ProductInsights {
  verdict: 'Worth it' | 'Think twice' | 'Depends'
  summary: string
  pros: string[]
  cons: string[]
  fitNote: string
  sources: Array<{ title: string; url: string }>
}

type GarmentType = 'upper_body' | 'lower_body' | 'dresses'

// Convert any image to JPEG format (fixes AVIF/WebP compatibility issues with fal.ai)
async function convertToJpeg(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Could not get canvas context'))
        return
      }
      ctx.drawImage(img, 0, 0)
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Could not convert image'))
            return
          }
          const jpegFile = new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), {
            type: 'image/jpeg'
          })
          resolve(jpegFile)
        },
        'image/jpeg',
        0.92
      )
    }
    img.onerror = () => reject(new Error('Could not load image'))
    img.src = URL.createObjectURL(file)
  })
}

export default function VirtualTryOnPage() {
  const [personImage, setPersonImage] = useState<string | null>(null)
  const [personFile, setPersonFile] = useState<File | null>(null)

  // Garment inputs - four modes
  const [garmentMode, setGarmentMode] = useState<'upload' | 'url' | 'describe' | 'phia'>('upload')
  const [garmentFile, setGarmentFile] = useState<File | null>(null)
  const [garmentPreview, setGarmentPreview] = useState<string | null>(null)
  const [clothingUrl, setClothingUrl] = useState("")
  const [clothingDescription, setClothingDescription] = useState("")
  const [garmentType, setGarmentType] = useState<GarmentType>('upper_body')

  const [isProcessing, setIsProcessing] = useState(false)
  const [processingStage, setProcessingStage] = useState("")
  const [resultImage, setResultImage] = useState<string | null>(null)
  const [generatedGarment, setGeneratedGarment] = useState<string | null>(null)
  const [userBudget, setUserBudget] = useState<UserBudget | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [sessionId] = useState(() => `session-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`)

  // Phia link mode
  const [phiaUrl, setPhiaUrl] = useState("")
  const [productMeta, setProductMeta] = useState<ProductMeta | null>(null)
  const [isLookingUp, setIsLookingUp] = useState(false)
  const [lookupError, setLookupError] = useState<string | null>(null)

  // Enriched insights (populated after try-on if productMeta available)
  const [insights, setInsights] = useState<ProductInsights | null>(null)
  const [isLoadingInsights, setIsLoadingInsights] = useState(false)

  const handleGarmentFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Convert to JPEG to ensure compatibility with fal.ai
      const jpegFile = await convertToJpeg(file)
      setGarmentFile(jpegFile)
      const reader = new FileReader()
      reader.onloadend = () => {
        setGarmentPreview(reader.result as string)
      }
      reader.readAsDataURL(jpegFile)
    }
  }

  const clearGarmentFile = () => {
    setGarmentFile(null)
    setGarmentPreview(null)
  }

  const handlePhiaLookup = async () => {
    if (!phiaUrl) return
    setIsLookingUp(true)
    setLookupError(null)
    setProductMeta(null)
    try {
      const res = await fetch('/api/phia-lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: phiaUrl })
      })
      const data = await res.json()
      if (!res.ok) {
        setLookupError(data.error || 'Lookup failed')
        return
      }
      if (!data.garmentImageUrl) {
        setLookupError("Could not extract garment image from this URL. Try the URL tab instead.")
        return
      }
      setProductMeta(data)
    } catch {
      setLookupError('Network error during lookup')
    } finally {
      setIsLookingUp(false)
    }
  }

  const handleEnrich = async (meta: ProductMeta, type: GarmentType) => {
    if (!meta.title && !meta.brand) return
    setIsLoadingInsights(true)
    try {
      const res = await fetch('/api/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productName: meta.title,
          brand: meta.brand,
          price: meta.price,
          garmentType: type
        })
      })
      if (res.ok) {
        const data = await res.json()
        setInsights(data)
      }
    } catch {
      // Insights are bonus — fail silently
    } finally {
      setIsLoadingInsights(false)
    }
  }

  const canSubmit = () => {
    if (!personImage && !personFile) return false

    switch (garmentMode) {
      case 'upload':
        return !!garmentFile
      case 'url':
        return !!clothingUrl
      case 'describe':
        return !!clothingDescription
      case 'phia':
        return !!productMeta?.garmentImageUrl
      default:
        return false
    }
  }

  const handleTryOn = async () => {
    if (!canSubmit()) return

    setIsProcessing(true)
    setError(null)
    setGeneratedGarment(null)

    try {
      // Use FormData if we have files, otherwise JSON
      const hasFiles = personFile || garmentFile

      let response: Response

      if (hasFiles) {
        setProcessingStage("Uploading images...")
        const formData = new FormData()

        if (personFile) {
          formData.append('humanImage', personFile)
        } else if (personImage) {
          formData.append('humanImageUrl', personImage)
        }

        if (garmentMode === 'upload' && garmentFile) {
          formData.append('garmentImage', garmentFile)
        } else if (garmentMode === 'url' && clothingUrl) {
          formData.append('garmentImageUrl', clothingUrl)
        } else if (garmentMode === 'describe' && clothingDescription) {
          formData.append('garmentDescription', clothingDescription)
        } else if (garmentMode === 'phia' && productMeta?.garmentImageUrl) {
          formData.append('garmentImageUrl', productMeta.garmentImageUrl)
        }

        formData.append('garmentType', garmentType)

        response = await fetch('/api/agent/process-tryon', {
          method: 'POST',
          headers: {
            'x-session-id': sessionId
          },
          body: formData
        })
      } else {
        setProcessingStage("Processing request...")
        response = await fetch('/api/agent/process-tryon', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-session-id': sessionId
          },
          body: JSON.stringify({
            humanImageUrl: personImage,
            garmentImageUrl: garmentMode === 'url' ? clothingUrl : garmentMode === 'phia' ? (productMeta?.garmentImageUrl ?? undefined) : undefined,
            garmentDescription: garmentMode === 'describe' ? clothingDescription : undefined,
            garmentType
          })
        })
      }

      setProcessingStage("Generating try-on result...")

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 402) {
          if (data.userBudget) {
            setError(`Budget limit reached! You've spent $${data.userBudget.spent.toFixed(2)} of $${data.userBudget.limit.toFixed(2)}`)
          } else {
            setError(data.error || 'Payment declined')
          }
        } else {
          setError(data.error || 'Failed to process request')
        }
        return
      }

      // Success!
      setResultImage(data.result.imageUrl)
      setUserBudget(data.userBudget)
      if (data.generatedGarment) {
        setGeneratedGarment(data.generatedGarment)
      }

      // Kick off enrichment if we have product metadata
      if (productMeta?.title || productMeta?.brand) {
        handleEnrich(productMeta, garmentType)
      }

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
    setGarmentFile(null)
    setGarmentPreview(null)
    setGeneratedGarment(null)
    setPhiaUrl("")
    setProductMeta(null)
    setLookupError(null)
    setInsights(null)
  }

  if (resultImage) {
    return (
      <TryOnResults
        originalImage={personImage!}
        resultImage={resultImage}
        generatedGarment={generatedGarment}
        insights={insights}
        isLoadingInsights={isLoadingInsights}
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

            <ImageUpload
              image={personImage}
              onImageChange={(img) => setPersonImage(img)}
              onFileChange={(file) => setPersonFile(file)}
              label="Upload your photo"
            />
          </Card>

          {/* Right Column - Clothing Input */}
          <Card className="p-6 bg-card border-border">
            <div className="mb-4">
              <Label className="text-lg font-semibold flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                Clothing Item
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                Upload an image, paste a URL, describe it, or link from Phia
              </p>
            </div>

            <div className="space-y-6">
              {/* Garment Type Selector */}
              <div>
                <Label className="text-sm font-medium">Garment Type</Label>
                <Select value={garmentType} onValueChange={(v) => setGarmentType(v as GarmentType)}>
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="upper_body">Top / Shirt / Jacket</SelectItem>
                    <SelectItem value="lower_body">Pants / Skirt</SelectItem>
                    <SelectItem value="dresses">Dress / Full Outfit</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Input Mode Tabs */}
              <Tabs value={garmentMode} onValueChange={(v) => setGarmentMode(v as 'upload' | 'url' | 'describe' | 'phia')}>
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="upload">Upload</TabsTrigger>
                  <TabsTrigger value="url">URL</TabsTrigger>
                  <TabsTrigger value="describe">Describe</TabsTrigger>
                  <TabsTrigger value="phia" className="flex items-center gap-1">
                    <Link className="w-3 h-3" />
                    Phia
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="upload" className="mt-4">
                  {garmentPreview ? (
                    <div className="relative aspect-square rounded-lg overflow-hidden bg-secondary max-w-[200px]">
                      <img src={garmentPreview} alt="Garment" className="w-full h-full object-cover" />
                      <Button onClick={clearGarmentFile} variant="destructive" size="icon" className="absolute top-2 right-2">
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center aspect-square rounded-lg border-2 border-dashed border-border bg-secondary/50 hover:bg-secondary/70 cursor-pointer transition-colors max-w-[200px]">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleGarmentFileChange}
                        className="hidden"
                      />
                      <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                      <span className="text-sm font-medium">Upload garment</span>
                      <span className="text-xs text-muted-foreground">PNG, JPG</span>
                    </label>
                  )}
                </TabsContent>

                <TabsContent value="url" className="mt-4">
                  <Input
                    type="url"
                    placeholder="https://example.com/shirt.jpg"
                    value={clothingUrl}
                    onChange={(e) => setClothingUrl(e.target.value)}
                  />
                </TabsContent>

                <TabsContent value="describe" className="mt-4">
                  <Input
                    type="text"
                    placeholder="e.g., red summer dress, blue denim jacket"
                    value={clothingDescription}
                    onChange={(e) => setClothingDescription(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    AI will generate a garment image from your description (+$0.03)
                  </p>
                </TabsContent>

                <TabsContent value="phia" className="mt-4 space-y-3">
                  <div className="flex gap-2">
                    <Input
                      type="url"
                      placeholder="Paste a Phia product URL..."
                      value={phiaUrl}
                      onChange={(e) => { setPhiaUrl(e.target.value); setProductMeta(null); setLookupError(null) }}
                    />
                    <button
                      onClick={handlePhiaLookup}
                      disabled={!phiaUrl || isLookingUp}
                      className="px-3 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50 shrink-0"
                    >
                      {isLookingUp ? '...' : 'Look up'}
                    </button>
                  </div>

                  {lookupError && (
                    <p className="text-xs text-destructive">{lookupError}</p>
                  )}

                  {productMeta?.garmentImageUrl && (
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50">
                      <img
                        src={productMeta.garmentImageUrl}
                        alt={productMeta.title ?? 'Product'}
                        className="w-16 h-16 object-cover rounded-md shrink-0"
                      />
                      <div className="min-w-0">
                        {productMeta.title && (
                          <p className="text-sm font-medium truncate">{productMeta.title}</p>
                        )}
                        {productMeta.price && (
                          <p className="text-sm text-primary font-semibold">${productMeta.price.toFixed(2)}</p>
                        )}
                        <p className="text-xs text-green-500 mt-0.5">Ready to try on</p>
                      </div>
                    </div>
                  )}

                  <p className="text-xs text-muted-foreground">
                    Link any Phia product to try it on and get enriched community insights
                  </p>
                </TabsContent>
              </Tabs>

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
                disabled={!canSubmit() || isProcessing}
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
