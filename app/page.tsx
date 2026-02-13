"use client"

import { useCallback, useState, useMemo } from "react"
import dynamic from "next/dynamic"
import * as THREE from "three"
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js"
import { STLDropzone } from "@/components/stl-dropzone"
import { StabilityResultPanel } from "@/components/stability-result"
import { analyzeStability, type StabilityResult } from "@/lib/stability"
import { Loader2, Box, Instagram, Twitter, Github, Linkedin } from "lucide-react"

// Dynamically import the 3D viewer to avoid SSR issues with Three.js
const STLViewer = dynamic(
  () => import("@/components/stl-viewer").then((mod) => mod.STLViewer),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center rounded-lg border border-border bg-card">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    ),
  }
)

export default function Page() {
  const [geometry, setGeometry] = useState<THREE.BufferGeometry | null>(null)
  const [fileName, setFileName] = useState("")
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [stabilityResult, setStabilityResult] = useState<StabilityResult | null>(null)

  const handleFileLoad = useCallback((buffer: ArrayBuffer, name: string) => {
    setIsAnalyzing(true)
    setStabilityResult(null)

    requestAnimationFrame(() => {
      try {
        const loader = new STLLoader()
        const geo = loader.parse(buffer)
        geo.computeVertexNormals()

        setGeometry(geo)
        setFileName(name)

        const result = analyzeStability(geo)
        setStabilityResult(result)
      } catch {
        setGeometry(null)
        setFileName("")
        setStabilityResult(null)
      } finally {
        setIsAnalyzing(false)
      }
    })
  }, [])

  const handleClear = useCallback(() => {
    setGeometry(null)
    setFileName("")
    setStabilityResult(null)
    setIsAnalyzing(false)
  }, [])

  const hasFile = useMemo(() => geometry !== null, [geometry])

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="border-b border-border px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center gap-3">
          <div className="flex items-center justify-center rounded-md bg-primary/10 p-2">
            <Box className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-foreground">
              3D Stability Checker
            </h1>
            <p className="text-xs text-muted-foreground">
              Upload an STL model to check if it will stand on its own
            </p>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex flex-1 flex-col lg:flex-row">
        {/* Sidebar / Controls */}
        <aside className="flex w-full shrink-0 flex-col gap-6 border-b border-border p-6 lg:w-96 lg:border-b-0 lg:border-r">
          <section>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Upload Model
            </h2>
            <STLDropzone
              onFileLoad={handleFileLoad}
              hasFile={hasFile}
              fileName={fileName}
              onClear={handleClear}
            />
          </section>

          {isAnalyzing && (
            <div className="flex items-center gap-3 rounded-lg border border-border bg-secondary/30 px-4 py-6">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                Analyzing stability...
              </p>
            </div>
          )}

          {stabilityResult && (
            <section>
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Analysis Result
              </h2>
              <StabilityResultPanel result={stabilityResult} />
            </section>
          )}

          {!hasFile && !isAnalyzing && (
            <div className="flex flex-1 flex-col items-center justify-center rounded-lg border border-dashed border-border py-12 text-center">
              <Box className="mb-3 h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                No model loaded yet
              </p>
              <p className="mt-1 text-xs text-muted-foreground/60">
                Upload an .stl file to get started
              </p>
            </div>
          )}
        </aside>

        {/* 3D Viewport */}
        <section className="relative flex-1" aria-label="3D Viewport">
          {geometry ? (
            <STLViewer geometry={geometry} stabilityResult={stabilityResult} />
          ) : (
            <div className="flex h-full min-h-[400px] items-center justify-center bg-card">
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-border bg-secondary/30">
                  <Box className="h-7 w-7 text-muted-foreground/40" />
                </div>
                <p className="text-sm text-muted-foreground">
                  3D viewport will appear here
                </p>
                <p className="mt-1 text-xs text-muted-foreground/60">
                  Upload an STL file to see your model
                </p>
              </div>
            </div>
          )}

          {stabilityResult && geometry && (
            <div className="absolute left-4 top-4 z-10">
              <div
                className={`flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-wider backdrop-blur-md ${stabilityResult.isStable
                  ? "border-stable/40 bg-stable/15 text-stable"
                  : "border-unstable/40 bg-unstable/15 text-unstable"
                  }`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${stabilityResult.isStable ? "bg-stable" : "bg-unstable"
                    }`}
                />
                {stabilityResult.isStable ? "Stable" : "Unstable - Will tip over"}
              </div>
            </div>
          )}
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-6 bg-card">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} - 3D Stability Checker.
          </p>
          <div className="flex items-center gap-5">
            <a href="https://www.linkedin.com/in/francomartino/" target="_blank" className="text-muted-foreground hover:text-primary transition-colors" aria-label="LinkedIn">
              <Linkedin className="h-5 w-5" />
            </a>
            <a href="https://github.com/FrancoMartino/3d-stability-checker" target="_blank" className="text-muted-foreground hover:text-primary transition-colors" aria-label="Github">
              <Github className="h-5 w-5" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}