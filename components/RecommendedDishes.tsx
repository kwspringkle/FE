"use client"

import { DishCard } from "./DishCard"
import { ChevronLeft, ChevronRight } from "lucide-react"
import type { DishRestaurant } from "@/api/types"
import { useUserLocation } from "@/components/UserLocationProvider"
import { getRestaurantDistanceMetersWithCache, mapWithConcurrency, stableHashToInt32 } from "@/lib/vietmapDistance"
import { useEffect, useState } from "react"

interface RecommendedDishesProps {
  dishes: DishRestaurant[]
  availableImages: string[]
  loading?: boolean
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
}

export function RecommendedDishes({ 
  dishes, 
  availableImages, 
  loading,
  currentPage,
  totalPages,
  onPageChange
}: RecommendedDishesProps) {
  const { location } = useUserLocation()
  const [distanceOverrides, setDistanceOverrides] = useState<Record<number, number>>({})

  const formatDistance = (meters: number) => {
    const m = Math.round(meters)
    return m >= 1000 ? `${(m / 1000).toFixed(1)}km` : `${m}m`
  }

  useEffect(() => {
    const run = async () => {
      if (!location) {
        setDistanceOverrides({})
        return
      }
      if (!dishes || dishes.length === 0) {
        setDistanceOverrides({})
        return
      }

      try {
        const meters = await mapWithConcurrency(dishes, 3, async (dish) => {
          try {
            // We don't have restaurantId/address here; use restaurant name as destination.
            // Cache key derived from restaurant name.
            const cacheId = stableHashToInt32(dish.restaurantname)
            return await getRestaurantDistanceMetersWithCache({
              origin: { lat: location.lat, lng: location.lng },
              restaurantId: cacheId,
              restaurantName: dish.restaurantname,
              restaurantAddress: undefined,
              fallbackDistanceMeters: dish.distance,
            })
          } catch {
            return dish.distance
          }
        })

        const next: Record<number, number> = {}
        for (let i = 0; i < dishes.length; i++) {
          next[dishes[i].id] = meters[i]
        }
        setDistanceOverrides(next)
      } catch {
        // keep DB distances
      }
    }

    run()
  }, [location, dishes])

  return (
    <section className="mb-16">
      <h3 className="text-xl font-semibold text-foreground mb-8">おすすめの料理</h3>

      {loading ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">読み込み中...</p>
        </div>
      ) : dishes.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">おすすめの料理はありません</p>
        </div>
      ) : (
        <>
          <div className="grid md:grid-cols-4 grid-cols-1 gap-4">
            {dishes.map((dish) => (
              <div key={dish.id}>
                <DishCard
                  id={dish.id}
                  imageUrl={dish.imageUrl}
                  name={dish.dishesname}
                  rate={0}
                  availableImages={availableImages}
                  restaurant={`${dish.restaurantname} - ${formatDistance(distanceOverrides[dish.id] ?? dish.distance)}`}
                  variant="recommended"
                />
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-8">
              <button
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="p-2 rounded-lg border border-border hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Previous page"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <div className="flex gap-2">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => onPageChange(page)}
                    className={`px-4 py-2 rounded-lg border font-medium transition-colors ${
                      currentPage === page
                        ? "bg-yellow-400 text-black border-yellow-500 hover:bg-yellow-500"
                        : "border-border hover:bg-muted"
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>

              <button
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg border border-border hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Next page"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </>
      )}
    </section>
  )
}

