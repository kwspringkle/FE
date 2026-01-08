"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import { getLocationStorageKey, clearUserLocationAndCaches } from "@/lib/locationCache"

export type UserLocation = {
  lat: number
  lng: number
  timestamp: number
}

type LocationStatus =
  | "idle"
  | "loading"
  | "granted"
  | "denied"
  | "unavailable"
  | "error"

type UserLocationContextValue = {
  location: UserLocation | null
  status: LocationStatus
  requestLocation: () => Promise<UserLocation | null>
  clearLocation: () => void
}

const STORAGE_KEY = "userLocation.v1"

const UserLocationContext = createContext<UserLocationContextValue | null>(null)

function readStoredLocation(): UserLocation | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(getLocationStorageKey())
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<UserLocation>
    if (
      typeof parsed.lat === "number" &&
      typeof parsed.lng === "number" &&
      typeof parsed.timestamp === "number"
    ) {
      return { lat: parsed.lat, lng: parsed.lng, timestamp: parsed.timestamp }
    }
    return null
  } catch {
    return null
  }
}

function writeStoredLocation(location: UserLocation) {
  localStorage.setItem(getLocationStorageKey(), JSON.stringify(location))
}

function removeStoredLocation() {
  localStorage.removeItem(getLocationStorageKey())
}

export function clearCurrentUserLocationAndCaches() {
  clearUserLocationAndCaches()
}

export function UserLocationProvider({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useState<UserLocation | null>(null)
  const [status, setStatus] = useState<LocationStatus>("idle")

  useEffect(() => {
    const stored = readStoredLocation()
    if (stored) {
      setLocation(stored)
      setStatus("granted")
    }
  }, [])

  const clearLocation = useCallback(() => {
    removeStoredLocation()
    setLocation(null)
    setStatus("idle")
  }, [])

  const requestLocation = useCallback(async (): Promise<UserLocation | null> => {
    if (typeof window !== "undefined" && !window.isSecureContext) {
      setStatus("unavailable")
      return null
    }

    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setStatus("unavailable")
      return null
    }

    setStatus("loading")

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 30000,
        })
      })

      const next: UserLocation = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        timestamp: Date.now(),
      }

      setLocation(next)
      writeStoredLocation(next)
      setStatus("granted")
      return next
    } catch (err) {
      // Permission denied is common; keep fallback behaviour.
      const anyErr = err as { code?: number }
      if (anyErr?.code === 1) {
        setStatus("denied")
      } else {
        setStatus("error")
      }
      return null
    }
  }, [])

  const value = useMemo<UserLocationContextValue>(
    () => ({ location, status, requestLocation, clearLocation }),
    [location, status, requestLocation, clearLocation]
  )

  return <UserLocationContext.Provider value={value}>{children}</UserLocationContext.Provider>
}

export function useUserLocation() {
  const ctx = useContext(UserLocationContext)
  if (!ctx) throw new Error("useUserLocation must be used within UserLocationProvider")
  return ctx
}
