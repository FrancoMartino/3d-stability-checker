"use client"

import { ShieldCheck, ShieldAlert, Box, Crosshair, Triangle } from "lucide-react"
import type { StabilityResult } from "@/lib/stability"

interface StabilityResultProps {
  result: StabilityResult
}

export function StabilityResultPanel({ result }: StabilityResultProps) {
  const { centerOfMass, supportBase, isStable, totalVolume } = result

  return (
    <div className="flex flex-col gap-4">
      {/* Verdict badge */}
      <div
        className={`flex items-center gap-3 rounded-lg border px-5 py-4 ${
          isStable
            ? "border-stable/30 bg-stable/10"
            : "border-unstable/30 bg-unstable/10"
        }`}
      >
        {isStable ? (
          <ShieldCheck className="h-7 w-7 shrink-0 text-stable" />
        ) : (
          <ShieldAlert className="h-7 w-7 shrink-0 text-unstable" />
        )}
        <div>
          <p
            className={`text-lg font-bold tracking-tight ${
              isStable ? "text-stable" : "text-unstable"
            }`}
          >
            {isStable ? "STABLE" : "UNSTABLE"}
          </p>
          <p className="text-xs text-muted-foreground">
            {isStable
              ? "The model will stand on its own."
              : "The model will tip over. It needs a wider base or repositioning."}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-3">
        <StatCard
          icon={<Crosshair className="h-4 w-4" />}
          label="Center of Mass"
          value={`(${fmt(centerOfMass.x)}, ${fmt(centerOfMass.y)}, ${fmt(centerOfMass.z)})`}
        />
        <StatCard
          icon={<Box className="h-4 w-4" />}
          label="Volume"
          value={`${totalVolume.toFixed(2)} units\u00B3`}
        />
        <StatCard
          icon={<Triangle className="h-4 w-4" />}
          label="Base Vertices"
          value={`${supportBase.length} points in convex hull`}
        />
      </div>
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="flex items-start gap-3 rounded-md border border-border bg-secondary/30 px-4 py-3">
      <span className="mt-0.5 text-muted-foreground">{icon}</span>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <p className="mt-0.5 truncate font-mono text-sm text-foreground">
          {value}
        </p>
      </div>
    </div>
  )
}

function fmt(n: number): string {
  return n.toFixed(3)
}
