"use client"

import type React from "react"

import { useRef } from "react"
import { Upload, X } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ImageUploadProps {
  image: string | null
  onImageChange: (image: string | null) => void
  label: string
}

export default function ImageUpload({ image, onImageChange, label }: ImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        onImageChange(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleRemove = () => {
    onImageChange(null)
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
