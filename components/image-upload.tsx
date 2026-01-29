"use client"

import type React from "react"

import { useRef } from "react"
import { Upload, X } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ImageUploadProps {
  image: string | null
  onImageChange: (image: string | null) => void
  onFileChange?: (file: File | null) => void
  label: string
}

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

export default function ImageUpload({ image, onImageChange, onFileChange, label }: ImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Convert to JPEG for fal.ai compatibility
      const jpegFile = await convertToJpeg(file)
      onFileChange?.(jpegFile)
      const reader = new FileReader()
      reader.onloadend = () => {
        onImageChange(reader.result as string)
      }
      reader.readAsDataURL(jpegFile)
    }
  }

  const handleRemove = () => {
    onImageChange(null)
    onFileChange?.(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  return (
    <div className="space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
        id="image-upload"
      />

      {image ? (
        <div className="relative aspect-[3/4] rounded-lg overflow-hidden bg-secondary">
          <img src={image || "/placeholder.svg"} alt="Uploaded" className="w-full h-full object-cover" />
          <Button onClick={handleRemove} variant="destructive" size="icon" className="absolute top-2 right-2">
            <X className="w-4 h-4" />
          </Button>
        </div>
      ) : (
        <label
          htmlFor="image-upload"
          className="flex flex-col items-center justify-center aspect-[3/4] rounded-lg border-2 border-dashed border-border bg-secondary/50 hover:bg-secondary/70 cursor-pointer transition-colors"
        >
          <Upload className="w-12 h-12 text-muted-foreground mb-4" />
          <span className="text-sm font-medium text-foreground mb-1">{label}</span>
          <span className="text-xs text-muted-foreground">PNG, JPG up to 10MB</span>
        </label>
      )}
    </div>
  )
}
