"use client"

import Link from "next/link"
import { Star } from "lucide-react"

interface DishCardProps {
  id: number
  imageUrl: string
  name: string
  rate?: number
  likes?: number
  rank?: number
  availableImages?: string[]
  isFirstPlace?: boolean
  restaurant?: string
  distance?: number
  price?: string | number
  variant?: "ranking" | "favorite" | "restaurant" | "recommended" | "search" | "default"
}

export function DishCard({ id, imageUrl, name, rate, likes, rank, availableImages = [], isFirstPlace = false, restaurant, distance, price, variant = "default" }: DishCardProps) {
  // Default placeholder image
  const placeholderImage = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'%3E%3Crect fill='%23e2e8f0' width='200' height='200'/%3E%3Cpath d='M80 90 L120 90 L120 70 L130 70 L100 40 L70 70 L80 70 Z' fill='%2394a3b8'/%3E%3Crect x='60' y='100' width='80' height='60' fill='%2394a3b8' rx='5'/%3E%3Ctext fill='%2364748b' font-family='sans-serif' font-size='12' x='100' y='180' text-anchor='middle'%3E料理%3C/text%3E%3C/svg%3E"
  
  // Format price
  const formatPrice = (price: number): string => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price)
  }

  // Check if image URL is valid (not example.com placeholder)
  const isValidImageUrl = (url: string) => {
    if (!url) return false;
    if (url.includes('example.com')) return false;
    return true;
  }
  
  const defaultImage = availableImages[0] || placeholderImage
  const displayImage = isValidImageUrl(imageUrl) ? imageUrl : defaultImage

  const formatDistance = (meters: number) => {
    const m = Math.round(meters)
    return m >= 1000 ? `${(m / 1000).toFixed(1)}km` : `${m}m`
  }

  const isFavoriteVariant = variant === "favorite"
  const isRestaurantVariant = variant === "restaurant"
  const isRecommendedVariant = variant === "recommended"
  const isRankingVariant = variant === "ranking"
  const isSearchVariant = variant === "search"
  const cardSize = isFavoriteVariant 
    ? "max-w-[350px] w-full" 
    : (isRestaurantVariant || isRecommendedVariant || isSearchVariant)
    ? "w-full"
    : "max-w-[200px]"
  
  // Fixed height for grid consistency
  const cardFixedHeight = (isRestaurantVariant || isRecommendedVariant)
    ? "h-[340px]"
    : isSearchVariant
    ? "h-auto"
    : ""
  
  // Điều hướng đến dish detail hoặc restaurant detail tùy variant
  const CardWrapper = isRestaurantVariant 
    ? ({ children }: { children: React.ReactNode }) => (
        <Link href={`/restaurant/${id}`} className="block">
          {children}
        </Link>
      )
    : isRankingVariant
    ? ({ children }: { children: React.ReactNode }) => (
        <div className="block">
          {children}
        </div>
      )
    : ({ children }: { children: React.ReactNode }) => (
        <Link href={`/dish/${id}`} className="block">
          {children}
        </Link>
      )
  
  return (
    <div className={`flex flex-col items-center transition-all ${rank ? 'pt-6' : ''}`}>
      <CardWrapper>
        <div className={`relative w-full ${cardSize} ${cardFixedHeight} bg-white rounded-lg shadow-md hover:shadow-xl hover:shadow-yellow-500/50 transition-all border border-slate-200 ${!isRankingVariant ? 'cursor-pointer' : ''} flex flex-col ${isFirstPlace ? 'scale-110' : ''}`}>
        {/* Rank Badge - Above card */}
        {rank && (
          <div className="absolute -top-5 left-1/2 -translate-x-1/2 z-20">
            <div className={`flex items-center justify-center font-bold shadow-lg ${
              isFirstPlace
                ? "w-12 h-12 bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600 text-white text-xl rounded-full border-2 border-white"
                : "w-10 h-10 bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600 text-white text-lg rounded-full border-2 border-white"
            }`}>
              {rank}
            </div>
          </div>
        )}
        {/* Image Container */}
        <div className="relative w-full p-3 flex-shrink-0">
          <div className="relative">
            <img
              src={displayImage}
              alt={name}
              className="w-full aspect-square rounded-lg object-cover bg-muted shadow-md"
              onError={(e) => {
                if (!e.currentTarget.src.startsWith("data:")) {
                  e.currentTarget.src = placeholderImage
                }
              }}
            />
          </div>
        </div>

        {/* Content */}
        <div className={`${isFavoriteVariant ? "px-4 pb-4" : "px-3 pb-3"} text-center flex-grow flex flex-col justify-center`}>
          <p className="font-medium text-foreground mb-1 text-sm line-clamp-2">{name}</p>
          {isFavoriteVariant && restaurant && (
            <p className="text-xs text-muted-foreground mb-1 break-words">{restaurant}</p>
          )}
          {isFavoriteVariant && distance !== undefined && (
            <p className="text-xs text-muted-foreground">
              {formatDistance(distance)}
            </p>
          )}
          {isRestaurantVariant && price && (
            <p className="text-sm font-semibold text-green-600 line-clamp-1">
              {typeof price === 'number' ? formatPrice(price) : price}
            </p>
          )}
          {isRecommendedVariant && restaurant && (
            <p className="text-xs text-muted-foreground line-clamp-1">{restaurant}</p>
          )}
          {isSearchVariant && (
            <div className="space-y-1">
              {restaurant && (
                <p className="text-sm text-muted-foreground">{restaurant}</p>
              )}
              <div className="flex items-center justify-center gap-3">
                {rate !== undefined && (
                  <div className="flex items-center gap-1 text-yellow-500">
                    <Star className="w-4 h-4 fill-yellow-400" />
                    <span className="font-semibold text-sm">{rate.toFixed(1)}</span>
                  </div>
                )}
                {price !== undefined && (
                  <span className="text-sm font-semibold text-green-600">
                    {typeof price === 'number' ? formatPrice(price) : price}
                  </span>
                )}
              </div>
            </div>
          )}
          {!isFavoriteVariant && !isRestaurantVariant && !isRecommendedVariant && !isSearchVariant && (
            <div className="flex items-center justify-center gap-1 text-yellow-500">
              <img 
                width="16" 
                height="16" 
                src="https://img.icons8.com/windows/32/filled-heart.png" 
                alt="filled-heart"
                className="w-4 h-4"
                style={{ filter: 'invert(77%) sepia(97%) saturate(381%) hue-rotate(358deg) brightness(102%) contrast(101%)' }}
              />
              <span className="font-semibold text-sm">
                {rate !== undefined ? rate.toFixed(1) : likes !== undefined ? likes : '0'}
              </span>
            </div>
          )}
        </div>
        </div>
      </CardWrapper>
    </div>
  )
}

