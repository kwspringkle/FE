export type LatLng = { lat: number; lng: number }

import { getCachedDistanceMeters, setCachedDistanceMeters } from "@/lib/locationCache"

export async function fetchVietmapDistanceMeters(origin: LatLng, destination: string): Promise<number> {
  const url = new URL("/api/vietmap/distance", window.location.origin)
  url.searchParams.set("originLat", String(origin.lat))
  url.searchParams.set("originLng", String(origin.lng))
  url.searchParams.set("destination", destination)

  const res = await fetch(url.toString(), { method: "GET" })
  const data = await res.json()

  if (!res.ok) {
    throw new Error(data?.error || "Distance request failed")
  }

  if (typeof data?.distanceMeters !== "number") {
    throw new Error("Invalid distance response")
  }

  return data.distanceMeters
}

export function makeRestaurantSignature(origin: LatLng, name: string, address?: string | null) {
  // Round to reduce churn while user slightly moves.
  const oLat = origin.lat.toFixed(5)
  const oLng = origin.lng.toFixed(5)
  return `${oLat},${oLng}|${name}|${address ?? ""}`
}

export function stableHashToInt32(input: string) {
  // Simple deterministic hash for cache keys (not for security).
  let hash = 0
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i)
    hash |= 0
  }
  return hash
}

export async function getRestaurantDistanceMetersWithCache(params: {
  origin: LatLng
  restaurantId: number
  restaurantName: string
  restaurantAddress?: string | null
  fallbackDistanceMeters?: number
}) {
  const signature = makeRestaurantSignature(params.origin, params.restaurantName, params.restaurantAddress)
  const cached = getCachedDistanceMeters(params.restaurantId, signature)
  if (typeof cached === "number") return cached

  const destination = params.restaurantAddress
    ? `${params.restaurantName}, ${params.restaurantAddress}`
    : params.restaurantName

  const meters = await fetchVietmapDistanceMeters(params.origin, destination)

  // If DB says this is "nearby" but Vietmap returns something huge,
  // it's often a geocoding mismatch -> fall back to DB distance.
  const fb = params.fallbackDistanceMeters
  const canSanityCheck = typeof fb === "number" && Number.isFinite(fb) && fb > 0 && fb <= 10_000
  const isSuspiciousHuge = canSanityCheck && meters > Math.max(50_000, fb * 10)
  if (isSuspiciousHuge) {
    return fb
  }

  setCachedDistanceMeters(params.restaurantId, signature, meters)
  return meters
}

export async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  mapper: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let index = 0

  const workers = Array.from({ length: Math.max(1, limit) }, async () => {
    while (true) {
      const current = index
      index += 1
      if (current >= items.length) return
      results[current] = await mapper(items[current])
    }
  })

  await Promise.all(workers)
  return results
}
