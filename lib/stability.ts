import * as THREE from "three"

export interface StabilityResult {
  centerOfMass: THREE.Vector3
  supportBase: THREE.Vector2[] // convex hull vertices (x,y)
  projectedPoint: THREE.Vector2 // CoM projected onto Z=0 plane
  isStable: boolean
  totalVolume: number
}

/**
 * Compute the Center of Mass of a closed triangulated mesh
 * using the divergence theorem (signed tetrahedra method).
 *
 * For each triangle face with vertices (a, b, c):
 *   signed volume = a . (b x c) / 6
 *   centroid contribution = signedVolume * (a + b + c) / 4
 *
 * Total CoM = sum(centroid contributions) / totalVolume
 */
function computeCenterOfMass(geometry: THREE.BufferGeometry): {
  centerOfMass: THREE.Vector3
  totalVolume: number
} {
  const pos = geometry.getAttribute("position")
  const index = geometry.getIndex()

  let totalVolume = 0
  const com = new THREE.Vector3(0, 0, 0)

  const a = new THREE.Vector3()
  const b = new THREE.Vector3()
  const c = new THREE.Vector3()
  const cross = new THREE.Vector3()

  const triCount = index ? index.count / 3 : pos.count / 3

  for (let i = 0; i < triCount; i++) {
    let ia: number, ib: number, ic: number
    if (index) {
      ia = index.getX(i * 3)
      ib = index.getX(i * 3 + 1)
      ic = index.getX(i * 3 + 2)
    } else {
      ia = i * 3
      ib = i * 3 + 1
      ic = i * 3 + 2
    }

    a.set(pos.getX(ia), pos.getY(ia), pos.getZ(ia))
    b.set(pos.getX(ib), pos.getY(ib), pos.getZ(ib))
    c.set(pos.getX(ic), pos.getY(ic), pos.getZ(ic))

    // Signed volume of tetrahedron formed by triangle and origin
    cross.crossVectors(b, c)
    const signedVol = a.dot(cross) / 6.0

    totalVolume += signedVol

    // Centroid of tetrahedron = (0 + a + b + c) / 4
    com.x += signedVol * (a.x + b.x + c.x) / 4.0
    com.y += signedVol * (a.y + b.y + c.y) / 4.0
    com.z += signedVol * (a.z + b.z + c.z) / 4.0
  }

  if (Math.abs(totalVolume) > 1e-10) {
    com.divideScalar(totalVolume)
  }

  return { centerOfMass: com, totalVolume: Math.abs(totalVolume) }
}

/**
 * Find all vertices at the lowest Z level (within epsilon tolerance)
 * and return their XY positions.
 */
function findBaseVertices(
  geometry: THREE.BufferGeometry,
  epsilon = 0.01
): THREE.Vector2[] {
  const pos = geometry.getAttribute("position")
  let minZ = Infinity

  // First pass: find minimum Z
  for (let i = 0; i < pos.count; i++) {
    const z = pos.getZ(i)
    if (z < minZ) minZ = z
  }

  // Second pass: collect vertices near the floor
  const baseVerts: THREE.Vector2[] = []
  for (let i = 0; i < pos.count; i++) {
    const z = pos.getZ(i)
    if (z <= minZ + epsilon) {
      baseVerts.push(new THREE.Vector2(pos.getX(i), pos.getY(i)))
    }
  }

  return baseVerts
}

/**
 * 2D Convex Hull using Andrew's monotone chain algorithm.
 * Returns vertices in counter-clockwise order.
 */
function convexHull2D(points: THREE.Vector2[]): THREE.Vector2[] {
  if (points.length <= 1) return points.slice()

  // Remove duplicates
  const unique: THREE.Vector2[] = []
  const seen = new Set<string>()
  for (const p of points) {
    const key = `${p.x.toFixed(6)},${p.y.toFixed(6)}`
    if (!seen.has(key)) {
      seen.add(key)
      unique.push(p)
    }
  }

  if (unique.length <= 1) return unique
  if (unique.length === 2) return unique

  // Sort by x, then by y
  unique.sort((a, b) => (a.x !== b.x ? a.x - b.x : a.y - b.y))

  const n = unique.length

  // Cross product of OA x OB
  const cross2D = (O: THREE.Vector2, A: THREE.Vector2, B: THREE.Vector2) =>
    (A.x - O.x) * (B.y - O.y) - (A.y - O.y) * (B.x - O.x)

  // Build lower hull
  const lower: THREE.Vector2[] = []
  for (let i = 0; i < n; i++) {
    while (
      lower.length >= 2 &&
      cross2D(lower[lower.length - 2], lower[lower.length - 1], unique[i]) <= 0
    ) {
      lower.pop()
    }
    lower.push(unique[i])
  }

  // Build upper hull
  const upper: THREE.Vector2[] = []
  for (let i = n - 1; i >= 0; i--) {
    while (
      upper.length >= 2 &&
      cross2D(upper[upper.length - 2], upper[upper.length - 1], unique[i]) <= 0
    ) {
      upper.pop()
    }
    upper.push(unique[i])
  }

  // Remove last point of each half because it's repeated
  lower.pop()
  upper.pop()

  return lower.concat(upper)
}

/**
 * Check if a 2D point is inside a convex polygon.
 * Uses cross product sign consistency.
 */
function pointInConvexPolygon(
  point: THREE.Vector2,
  polygon: THREE.Vector2[]
): boolean {
  const n = polygon.length
  if (n === 0) return false
  if (n === 1) {
    // Point case: check if same position (with tolerance)
    return point.distanceTo(polygon[0]) < 0.01
  }
  if (n === 2) {
    // Line segment case: check if point is near the segment
    const d = distanceToSegment(point, polygon[0], polygon[1])
    return d < 0.01
  }

  // Polygon case: check cross product signs
  let positive = 0
  let negative = 0

  for (let i = 0; i < n; i++) {
    const a = polygon[i]
    const b = polygon[(i + 1) % n]
    const cross =
      (b.x - a.x) * (point.y - a.y) - (b.y - a.y) * (point.x - a.x)

    if (cross > 0) positive++
    else if (cross < 0) negative++

    // If both positive and negative found, point is outside
    if (positive > 0 && negative > 0) return false
  }

  return true
}

function distanceToSegment(
  p: THREE.Vector2,
  a: THREE.Vector2,
  b: THREE.Vector2
): number {
  const ab = new THREE.Vector2().subVectors(b, a)
  const ap = new THREE.Vector2().subVectors(p, a)
  const t = Math.max(0, Math.min(1, ap.dot(ab) / ab.dot(ab)))
  const proj = new THREE.Vector2().copy(a).addScaledVector(ab, t)
  return p.distanceTo(proj)
}

/**
 * Main stability analysis function.
 * Assumes the model's lowest point is the "ground" (floor).
 *
 * Steps:
 * 1. Translate geometry so the lowest Z = 0
 * 2. Compute volume-based Center of Mass
 * 3. Find support base vertices and compute convex hull
 * 4. Project CoM onto Z=0 plane and check if inside the hull
 */
export function analyzeStability(
  geometry: THREE.BufferGeometry
): StabilityResult {
  // Clone geometry so we don't mutate the original
  const geo = geometry.clone()

  // Ensure normals
  geo.computeVertexNormals()

  // Find the lowest Z to translate to ground
  const pos = geo.getAttribute("position")
  let minZ = Infinity
  for (let i = 0; i < pos.count; i++) {
    const z = pos.getZ(i)
    if (z < minZ) minZ = z
  }

  // Translate so floor is at Z=0
  for (let i = 0; i < pos.count; i++) {
    pos.setZ(i, pos.getZ(i) - minZ)
  }
  pos.needsUpdate = true

  // Compute the volumetric center of mass
  const { centerOfMass, totalVolume } = computeCenterOfMass(geo)

  // Find base vertices (at Z ~= 0) and compute their convex hull
  // Use a relative epsilon based on model size
  const bbox = new THREE.Box3().setFromBufferAttribute(pos)
  const size = new THREE.Vector3()
  bbox.getSize(size)
  const modelScale = Math.max(size.x, size.y, size.z)
  const epsilon = Math.max(0.01, modelScale * 0.002)

  const baseVerts = findBaseVertices(geo, epsilon)
  const supportBase = convexHull2D(baseVerts)

  // Project CoM onto the XY plane (Z=0)
  const projectedPoint = new THREE.Vector2(centerOfMass.x, centerOfMass.y)

  // Check stability
  const isStable = pointInConvexPolygon(projectedPoint, supportBase)

  return {
    centerOfMass,
    supportBase,
    projectedPoint,
    isStable,
    totalVolume,
  }
}
