"use client"

import { useState, useEffect } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DishCard } from "./DishCard"

interface Restaurant {
  id: number
  name: string
  imageUrl: string
  distance: number
  minprice: number
  maxprice: number
  rate: number
  address?: string | null
  phone?: string | null
  openTime?: string | null
  closeTime?: string | null
  description?: string | null
}

interface NearbyRestaurantsProps {
  restaurants: Restaurant[]
  availableImages: string[]
  loading?: boolean
  currentPage?: number
  totalPages?: number
  onPageChange?: (page: number) => void
}

export function NearbyRestaurants({ 
  restaurants, 
  availableImages, 
  loading = false,
  currentPage = 1,
  totalPages = 1,
  onPageChange
}: NearbyRestaurantsProps) {
  const [isAnimating, setIsAnimating] = useState(false)
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('right')
  
  // Reset animation when restaurants change
  useEffect(() => {
    if (restaurants.length > 0) {
      setIsAnimating(true)
      const timer = setTimeout(() => setIsAnimating(false), 50)
      return () => clearTimeout(timer)
    }
  }, [restaurants])
  
  if (loading) {
    return (
      <section className="mb-16">
        <h3 className="text-xl font-semibold text-foreground mb-8">近くのレストラン</h3>
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </section>
    )
  }

  if (restaurants.length === 0) {
    return (
      <section className="mb-16">
        <h3 className="text-xl font-semibold text-foreground mb-8">近くのレストラン</h3>
        <div className="text-center py-20 text-muted-foreground">
          近くのレストランが見つかりませんでした
        </div>
      </section>
    )
  }

  const formatDistance = (distance: number) => {
    if (!Number.isFinite(distance) || distance < 0) return "-"
    const meters = Math.round(distance)
    return meters >= 1000 ? `${(meters / 1000).toFixed(1)}km` : `${meters}m`
  }

  // Format price display
  const formatPrice = (minprice: number, maxprice: number, distance: number) => {
    const distanceText = formatDistance(distance)
    if (minprice === 0 && maxprice === 0) {
      return distanceText
    }
    
    const formatVND = (price: number): string => {
      return new Intl.NumberFormat('ja-JP', {
        style: 'currency',
        currency: 'VND',
      }).format(price)
    }
    
    return `${distanceText} - (${formatVND(minprice)} - ${formatVND(maxprice)})`
  }

  const handlePrev = () => {
    if (onPageChange && currentPage > 1) {
      setSlideDirection('left')
      onPageChange(currentPage - 1)
    }
  }

  const handleNext = () => {
    if (onPageChange && currentPage < totalPages) {
      setSlideDirection('right')
      onPageChange(currentPage + 1)
    }
  }

  const canGoPrev = currentPage > 1
  const canGoNext = currentPage < totalPages

  return (
    <section className="mb-16">
      <h3 className="text-xl font-semibold text-foreground mb-8">近くのレストラン</h3>

      <div className="relative px-12">
        <div className="overflow-hidden">
          <div 
            className={`grid grid-cols-4 gap-4 transition-all duration-300 ease-in-out ${
              isAnimating 
                ? `opacity-0 ${slideDirection === 'right' ? 'translate-x-4' : '-translate-x-4'}` 
                : 'opacity-100 translate-x-0'
            }`}
          >
            {restaurants.map((restaurant) => (
              <div key={restaurant.id}>
                <DishCard
                  id={restaurant.id}
                  imageUrl={restaurant.imageUrl}
                  name={restaurant.name}
                  rate={restaurant.rate}
                  availableImages={availableImages}
                  price={formatPrice(restaurant.minprice, restaurant.maxprice, restaurant.distance)}
                  variant="restaurant"
                />
              </div>
            ))}
          </div>
        </div>

        <button 
          onClick={handlePrev}
          disabled={!canGoPrev}
          className={`absolute left-0 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-all ${
            canGoPrev 
              ? 'hover:bg-muted cursor-pointer' 
              : 'opacity-30 cursor-not-allowed'
          }`}
        >
          <ChevronLeft className="w-6 h-6 text-foreground" />
        </button>
        <button 
          onClick={handleNext}
          disabled={!canGoNext}
          className={`absolute right-0 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-all ${
            canGoNext 
              ? 'hover:bg-muted cursor-pointer' 
              : 'opacity-30 cursor-not-allowed'
          }`}
        >
          <ChevronRight className="w-6 h-6 text-foreground" />
        </button>
      </div>
    </section>
  )
}

