"use client"

import { useCallback, useState } from "react"
import { Upload, FileUp, X } from "lucide-react"

interface STLDropzoneProps {
  onFileLoad: (geometry: ArrayBuffer, fileName: string) => void
  hasFile: boolean
  fileName: string
  onClear: () => void
}

export function STLDropzone({ onFileLoad, hasFile, fileName, onClear }: STLDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const processFile = useCallback(
    (file: File) => {
      setError(null)
      if (!file.name.toLowerCase().endsWith(".stl")) {
        setError("Only .stl files are accepted.")
        return
      }
      const reader = new FileReader()
      reader.onload = (e) => {
        if (e.target?.result) {
          onFileLoad(e.target.result as ArrayBuffer, file.name)
        }
      }
      reader.onerror = () => setError("Failed to read file.")
      reader.readAsArrayBuffer(file)
    },
    [onFileLoad]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      setIsDragging(false)
      const file = e.dataTransfer.files[0]
      if (file) processFile(file)
    },
    [processFile]
  )

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) processFile(file)
      // Reset input so the same file can be re-selected
      e.target.value = ""
    },
    [processFile]
  )

  if (hasFile) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/50 px-4 py-3">
        <div className="flex items-center gap-3">
          <FileUp className="h-5 w-5 text-primary" />
          <span className="text-sm font-medium text-foreground truncate max-w-[200px]">
            {fileName}
          </span>
        </div>
        <button
          onClick={onClear}
          className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
          aria-label="Remove file"
        >
          <X className="h-3.5 w-3.5" />
          Remove
        </button>
      </div>
    )
  }

  return (
    <div>
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`relative flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-10 transition-all ${
          isDragging
            ? "border-primary bg-primary/5 scale-[1.01]"
            : "border-border hover:border-muted-foreground hover:bg-secondary/30"
        }`}
      >
        <input
          type="file"
          accept=".stl"
          onChange={handleInputChange}
          className="absolute inset-0 z-10 cursor-pointer opacity-0"
          aria-label="Upload STL file"
        />
        <Upload
          className={`mb-3 h-8 w-8 ${isDragging ? "text-primary" : "text-muted-foreground"}`}
        />
        <p className="text-sm font-medium text-foreground">
          Drag & drop your STL file here
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          or click to browse files
        </p>
      </div>
      {error && (
        <p className="mt-2 text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
