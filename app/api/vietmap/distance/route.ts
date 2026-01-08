import { NextResponse } from "next/server"

export const runtime = "nodejs"

function getRequiredEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing env var: ${name}`)
  return value
}

type VietmapSearchItem = {
  ref_id?: string
  distance?: number
}

type VietmapPlaceResponse = {
  lat?: number
  lng?: number
}

type VietmapMatrixResponse = {
  code?: string
  messages?: unknown
  distances?: number[][]
  durations?: number[][]
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)

    const originLat = url.searchParams.get("originLat")
    const originLng = url.searchParams.get("originLng")
    const destination = url.searchParams.get("destination")
    const destinationLat = url.searchParams.get("destinationLat")
    const destinationLng = url.searchParams.get("destinationLng")

    if (!originLat || !originLng) {
      return NextResponse.json(
        { error: "Missing required query params: originLat, originLng" },
        { status: 400 }
      )
    }

    const lat = Number(originLat)
    const lng = Number(originLng)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return NextResponse.json({ error: "Invalid originLat/originLng" }, { status: 400 })
    }

    const apiKey = getRequiredEnv("VIETMAP_API_KEY")

    let destLat: number | null = null
    let destLng: number | null = null

    // Prefer explicit destination coordinates if provided (most accurate)
    if (destinationLat && destinationLng) {
      const parsedLat = Number(destinationLat)
      const parsedLng = Number(destinationLng)
      if (Number.isFinite(parsedLat) && Number.isFinite(parsedLng)) {
        destLat = parsedLat
        destLng = parsedLng
      }
    }

    // Otherwise, geocode the destination text into coordinates
    if (destLat === null || destLng === null) {
      if (!destination) {
        return NextResponse.json(
          { error: "Missing required query param: destination (or destinationLat/destinationLng)" },
          { status: 400 }
        )
      }

      const runSearch = async (layers?: string) => {
        const searchUrl = new URL("https://maps.vietmap.vn/api/search/v4")
        searchUrl.searchParams.set("apikey", apiKey)
        searchUrl.searchParams.set("text", destination)
        searchUrl.searchParams.set("display_type", "1")
        // Bias results near the user
        searchUrl.searchParams.set("focus", `${lat},${lng}`)
        if (layers) searchUrl.searchParams.set("layers", layers)

        const searchRes = await fetch(searchUrl.toString(), { method: "GET" })
        const searchData = (await searchRes.json()) as VietmapSearchItem[]
        return { searchRes, searchData }
      }

      // Try with ADDRESS layer first to reduce POI noise
      let { searchRes, searchData } = await runSearch("ADDRESS")
      if (!searchRes.ok || !Array.isArray(searchData) || searchData.length === 0) {
        ;({ searchRes, searchData } = await runSearch())
      }

      if (!searchRes.ok || !Array.isArray(searchData) || searchData.length === 0) {
        return NextResponse.json(
          { error: "Vietmap search failed", details: searchData },
          { status: 502 }
        )
      }

      const best = [...searchData]
        .filter((item) => !!item?.ref_id)
        .sort((a, b) => (a.distance ?? Number.POSITIVE_INFINITY) - (b.distance ?? Number.POSITIVE_INFINITY))[0]

      const refid = best?.ref_id
      if (!refid) {
        return NextResponse.json(
          { error: "Vietmap search returned no ref_id", details: best || searchData[0] },
          { status: 502 }
        )
      }

      const placeUrl = new URL("https://maps.vietmap.vn/api/place/v4")
      placeUrl.searchParams.set("apikey", apiKey)
      placeUrl.searchParams.set("refid", refid)

      const placeRes = await fetch(placeUrl.toString(), { method: "GET" })
      const placeData = (await placeRes.json()) as VietmapPlaceResponse

      if (!placeRes.ok) {
        return NextResponse.json(
          { error: "Vietmap place lookup failed", details: placeData },
          { status: 502 }
        )
      }

      const parsedDestLat = Number(placeData?.lat)
      const parsedDestLng = Number(placeData?.lng)
      if (!Number.isFinite(parsedDestLat) || !Number.isFinite(parsedDestLng)) {
        return NextResponse.json(
          { error: "Vietmap place returned invalid lat/lng", details: placeData },
          { status: 502 }
        )
      }

      destLat = parsedDestLat
      destLng = parsedDestLng
    }

    // 3) Matrix -> distance/duration
    const matrixUrl = new URL("https://maps.vietmap.vn/api/matrix")
    matrixUrl.searchParams.set("api-version", "1.1")
    matrixUrl.searchParams.set("apikey", apiKey)
    matrixUrl.searchParams.append("point", `${lat},${lng}`)
    matrixUrl.searchParams.append("point", `${destLat},${destLng}`)
    matrixUrl.searchParams.set("sources", "0")
    matrixUrl.searchParams.set("destinations", "1")

    const matrixRes = await fetch(matrixUrl.toString(), { method: "GET" })
    const matrixData = (await matrixRes.json()) as VietmapMatrixResponse

    if (!matrixRes.ok) {
      return NextResponse.json(
        { error: "Vietmap matrix request failed", details: matrixData },
        { status: 502 }
      )
    }

    if (matrixData?.code !== "OK") {
      return NextResponse.json(
        { error: "Vietmap matrix code not OK", details: matrixData },
        { status: 502 }
      )
    }

    const distanceMeters = matrixData?.distances?.[0]?.[0]
    const durationSeconds = matrixData?.durations?.[0]?.[0]

    if (typeof distanceMeters !== "number") {
      return NextResponse.json(
        { error: "Vietmap matrix returned no distance", details: matrixData },
        { status: 502 }
      )
    }

    return NextResponse.json({
      distanceMeters,
      durationSeconds: typeof durationSeconds === "number" ? durationSeconds : null,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
