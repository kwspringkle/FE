import { getCurrentUserScope } from "@/lib/userScope"

const LOCATION_KEY_PREFIX = "userLocation.v1"
const DISTANCE_CACHE_PREFIX = "distanceCache.v1"
const LOCATION_PROMPT_DISMISSED_PREFIX = "locationPromptDismissed.v1"

export function getScopedKey(prefix: string, scope: string | null) {
  return scope ? `${prefix}.${scope}` : prefix
}

export type CachedDistanceEntry = {
  meters: number
  signature: string
  updatedAt: number
}

type DistanceCache = Record<string, CachedDistanceEntry>

const DEFAULT_TTL_MS = 7 * 24 * 60 * 60 * 1000

export function getLocationStorageKey(scope?: string | null) {
  return getScopedKey(LOCATION_KEY_PREFIX, scope ?? getCurrentUserScope())
}

export function getDistanceCacheKey(scope?: string | null) {
  return getScopedKey(DISTANCE_CACHE_PREFIX, scope ?? getCurrentUserScope())
}

export function getPromptDismissedKey(scope?: string | null) {
  return getScopedKey(LOCATION_PROMPT_DISMISSED_PREFIX, scope ?? getCurrentUserScope())
}

export function readDistanceCache(scope?: string | null): DistanceCache {
  if (typeof window === "undefined") return {}
  try {
    const raw = localStorage.getItem(getDistanceCacheKey(scope))
    if (!raw) return {}
    const parsed = JSON.parse(raw) as DistanceCache
    if (!parsed || typeof parsed !== "object") return {}
    return parsed
  } catch {
    return {}
  }
}

export function writeDistanceCache(cache: DistanceCache, scope?: string | null) {
  if (typeof window === "undefined") return
  localStorage.setItem(getDistanceCacheKey(scope), JSON.stringify(cache))
}

export function getCachedDistanceMeters(
  restaurantId: number,
  signature: string,
  scope?: string | null,
  ttlMs: number = DEFAULT_TTL_MS
): number | null {
  const cache = readDistanceCache(scope)
  const entry = cache[String(restaurantId)]
  if (!entry) return null
  if (entry.signature !== signature) return null
  if (Date.now() - entry.updatedAt > ttlMs) return null
  return entry.meters
}

export function setCachedDistanceMeters(
  restaurantId: number,
  signature: string,
  meters: number,
  scope?: string | null
) {
  const cache = readDistanceCache(scope)
  cache[String(restaurantId)] = { meters, signature, updatedAt: Date.now() }
  writeDistanceCache(cache, scope)
}

export function clearUserLocationAndCaches(scope?: string | null) {
  if (typeof window === "undefined") return
  const effectiveScope = scope ?? getCurrentUserScope()

  localStorage.removeItem(getScopedKey(LOCATION_KEY_PREFIX, effectiveScope))
  localStorage.removeItem(getScopedKey(DISTANCE_CACHE_PREFIX, effectiveScope))
  localStorage.removeItem(getScopedKey(LOCATION_PROMPT_DISMISSED_PREFIX, effectiveScope))

  // Also clear unscoped legacy keys if they exist
  localStorage.removeItem(LOCATION_KEY_PREFIX)
  localStorage.removeItem(DISTANCE_CACHE_PREFIX)
  localStorage.removeItem(LOCATION_PROMPT_DISMISSED_PREFIX)
}

export function clearDistanceCache(scope?: string | null) {
  if (typeof window === "undefined") return
  const effectiveScope = scope ?? getCurrentUserScope()
  localStorage.removeItem(getScopedKey(DISTANCE_CACHE_PREFIX, effectiveScope))
  localStorage.removeItem(DISTANCE_CACHE_PREFIX)
}
