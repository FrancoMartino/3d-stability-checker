"use client"

import { useMemo, useRef, useEffect, useCallback } from "react"
import { Canvas, useThree } from "@react-three/fiber"
import { OrbitControls } from "@react-three/drei"
import * as THREE from "three"
import type { StabilityResult } from "@/lib/stability"

interface STLViewerProps {
  geometry: THREE.BufferGeometry
  stabilityResult: StabilityResult | null
}

/**
 * Helper: compute model scale from the bounding box of the geometry.
 */
function useModelScale(geometry: THREE.BufferGeometry): number {
  return useMemo(() => {
    const pos = geometry.getAttribute("position")
    const bbox = new THREE.Box3().setFromBufferAttribute(pos)
    const size = new THREE.Vector3()
    bbox.getSize(size)
    return Math.max(size.x, size.y, size.z)
  }, [geometry])
}

/**
 * Process geometry once: clone, normalise, and translate so lowest Z = 0.
 * Disposes the clone when the component unmounts or geometry changes.
 */
function useProcessedGeometry(geometry: THREE.BufferGeometry) {
  const geoRef = useRef<THREE.BufferGeometry | null>(null)

  return useMemo(() => {
    // Dispose previous clone
    if (geoRef.current) {
      geoRef.current.dispose()
    }

    const geo = geometry.clone()
    geo.computeVertexNormals()

    const pos = geo.getAttribute("position")
    let minZ = Infinity
    for (let i = 0; i < pos.count; i++) {
      if (pos.getZ(i) < minZ) minZ = pos.getZ(i)
    }
    for (let i = 0; i < pos.count; i++) {
      pos.setZ(i, pos.getZ(i) - minZ)
    }
    pos.needsUpdate = true
    geo.computeBoundingBox()

    geoRef.current = geo
    return geo
  }, [geometry])
}

/** Auto-fit camera to model (operates in scene Y-up space) */
function CameraController({ geometry }: { geometry: THREE.BufferGeometry }) {
  const { camera, controls } = useThree()

  useEffect(() => {
    // Work directly on the source geometry instead of cloning
    const pos = geometry.getAttribute("position")
    const bbox = new THREE.Box3().setFromBufferAttribute(pos)
    const size = new THREE.Vector3()
    bbox.getSize(size)
    const center = new THREE.Vector3()
    bbox.getCenter(center)

    // Find minZ to adjust center
    let minZ = Infinity
    for (let i = 0; i < pos.count; i++) {
      if (pos.getZ(i) < minZ) minZ = pos.getZ(i)
    }
    center.z -= minZ

    // Convert center to Y-up: (x, z, -y) for the scene
    const sceneCenter = new THREE.Vector3(center.x, center.z, -center.y)

    const maxDim = Math.max(size.x, size.y, size.z)
    const fov = (camera as THREE.PerspectiveCamera).fov * (Math.PI / 180)
    const dist = (maxDim / (2 * Math.tan(fov / 2))) * 2.2

    camera.position.set(
      sceneCenter.x + dist * 0.6,
      sceneCenter.y + dist * 0.5,
      sceneCenter.z + dist * 0.8
    )
    camera.lookAt(sceneCenter)
    camera.updateProjectionMatrix()

    // Update orbit controls target
    if (controls && "target" in controls) {
      const ctrl = controls as unknown as { target: THREE.Vector3; update: () => void }
      ctrl.target.copy(sceneCenter)
      ctrl.update()
    }
  }, [geometry, camera, controls])

  return null
}

/** The STL model mesh */
function ModelMesh({ geometry }: { geometry: THREE.BufferGeometry }) {
  const meshRef = useRef<THREE.Mesh>(null)
  const processedGeometry = useProcessedGeometry(geometry)

  return (
    <mesh ref={meshRef} geometry={processedGeometry}>
      <meshStandardMaterial
        color="#a0b4c8"
        metalness={0.15}
        roughness={0.6}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}

/** Visual indicators: CoM sphere + projection line + base polygon */
function StabilityIndicators({
  result,
  modelScale,
}: {
  result: StabilityResult
  modelScale: number
}) {
  const { centerOfMass, supportBase, projectedPoint, isStable } = result

  const indicatorSize = modelScale * 0.018

  const baseShape = useMemo(() => {
    if (supportBase.length < 3) return null
    const shape = new THREE.Shape()
    shape.moveTo(supportBase[0].x, supportBase[0].y)
    for (let i = 1; i < supportBase.length; i++) {
      shape.lineTo(supportBase[i].x, supportBase[i].y)
    }
    shape.closePath()
    return shape
  }, [supportBase])

  const lineGeometry = useMemo(() => {
    const pts = [
      new THREE.Vector3(centerOfMass.x, centerOfMass.y, centerOfMass.z),
      new THREE.Vector3(projectedPoint.x, projectedPoint.y, 0),
    ]
    return new THREE.BufferGeometry().setFromPoints(pts)
  }, [centerOfMass, projectedPoint])

  const color = isStable ? "#22c55e" : "#ef4444"

  return (
    <group>
      {/* Center of Mass sphere */}
      <mesh position={[centerOfMass.x, centerOfMass.y, centerOfMass.z]}>
        <sphereGeometry args={[indicatorSize, 12, 12]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.8}
        />
      </mesh>

      {/* Projection line */}
      <lineSegments geometry={lineGeometry}>
        <lineBasicMaterial color={color} transparent opacity={0.7} />
      </lineSegments>

      {/* Projected point on floor */}
      <mesh position={[projectedPoint.x, projectedPoint.y, 0.001]}>
        <circleGeometry args={[indicatorSize * 0.7, 16]} />
        <meshBasicMaterial color={color} />
      </mesh>

      {/* Base polygon on the floor */}
      {baseShape && (
        <mesh position={[0, 0, 0.0005]}>
          <shapeGeometry args={[baseShape]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.18}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
    </group>
  )
}

/** Floor grid */
function FloorGrid({ size }: { size: number }) {
  const gridSize = Math.max(size * 3, 20)
  return (
    <gridHelper
      args={[gridSize, 30, "#2a3a4a", "#1a2434"]}
      rotation={[Math.PI / 2, 0, 0]}
      position={[0, 0, 0]}
    />
  )
}

export function STLViewer({ geometry, stabilityResult }: STLViewerProps) {
  const modelScale = useModelScale(geometry)

  const handleCreated = useCallback((state: { gl: THREE.WebGLRenderer }) => {
    const canvas = state.gl.domElement

    // Handle WebGL context loss gracefully
    canvas.addEventListener("webglcontextlost", (e) => {
      e.preventDefault()
      console.log("WebGL context lost - prevented default")
    })

    canvas.addEventListener("webglcontextrestored", () => {
      console.log("WebGL context restored")
    })
  }, [])

  return (
    <div className="h-full w-full rounded-lg border border-border bg-card overflow-hidden">
      <Canvas
        camera={{ fov: 50, near: 0.01, far: 5000 }}
        dpr={[1, 1.5]}
        gl={{
          antialias: true,
          powerPreference: "default",
          failIfMajorPerformanceCaveat: false,
        }}
        style={{ background: "#0d1117" }}
        onCreated={handleCreated}
      >
        <CameraController geometry={geometry} />

        {/* Lighting - no Environment/HDR to save GPU memory */}
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 8, 5]} intensity={1.0} />
        <directionalLight position={[-4, 6, -2]} intensity={0.4} />
        <hemisphereLight args={["#c0d8f0", "#1a1a2e", 0.4]} />

        {/* Z-up to Y-up rotation group */}
        <group rotation={[-Math.PI / 2, 0, 0]}>
          <ModelMesh geometry={geometry} />

          {stabilityResult && (
            <StabilityIndicators result={stabilityResult} modelScale={modelScale} />
          )}

          <FloorGrid size={modelScale} />
        </group>

        <OrbitControls
          makeDefault
          enableDamping
          dampingFactor={0.1}
          minDistance={modelScale * 0.1}
          maxDistance={modelScale * 20}
        />
      </Canvas>
    </div>
  )
}
