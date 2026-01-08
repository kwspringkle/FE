import { NextResponse } from "next/server"

export const runtime = "nodejs"

function getRequiredEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing env var: ${name}`)
  return value
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)

    const originLat = url.searchParams.get("originLat")
    const originLng = url.searchParams.get("originLng")
    const destination = url.searchParams.get("destination")

    if (!originLat || !originLng || !destination) {
      return NextResponse.json(
        { error: "Missing required query params: originLat, originLng, destination" },
        { status: 400 }
      )
    }

    const lat = Number(originLat)
    const lng = Number(originLng)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return NextResponse.json({ error: "Invalid originLat/originLng" }, { status: 400 })
    }

    const apiKey = getRequiredEnv("GOOGLE_MAPS_API_KEY")

    const dmUrl = new URL("https://maps.googleapis.com/maps/api/distancematrix/json")
    dmUrl.searchParams.set("origins", `${lat},${lng}`)
    dmUrl.searchParams.set("destinations", destination)
    dmUrl.searchParams.set("key", apiKey)
    dmUrl.searchParams.set("language", "vi")
    dmUrl.searchParams.set("region", "VN")

    const response = await fetch(dmUrl.toString(), { method: "GET" })
    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json(
        { error: "Google Distance Matrix request failed", details: data },
        { status: 502 }
      )
    }

    if (data?.status !== "OK") {
      return NextResponse.json({ error: "Google API status not OK", details: data }, { status: 502 })
    }

    const element = data?.rows?.[0]?.elements?.[0]
    if (!element || element.status !== "OK") {
      return NextResponse.json(
        { error: "No route found", details: element || data },
        { status: 404 }
      )
    }

    return NextResponse.json({
      distanceMeters: element.distance?.value ?? null,
      distanceText: element.distance?.text ?? null,
      durationSeconds: element.duration?.value ?? null,
      durationText: element.duration?.text ?? null,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
