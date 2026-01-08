"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ChevronLeft, Star, MessageCircle, MapPin, Clock, Phone, Send } from "lucide-react"
import { TopHeader } from "@/components/TopHeader"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AISupportModal } from "@/components/AISupportModal"
import { restaurantApi } from "@/api/api"
import type { Restaurant, DishByRestaurant, RestaurantReview } from "@/api/types"
import { toast } from "sonner"
import { useUserLocation } from "@/components/UserLocationProvider"
import { getRestaurantDistanceMetersWithCache } from "@/lib/vietmapDistance"

interface RestaurantDetailPageProps {
  restaurantId: string
}

export function RestaurantDetailPage({ restaurantId }: RestaurantDetailPageProps) {
  const router = useRouter()
  const { location, requestLocation } = useUserLocation()
  const [showSupportModal, setShowSupportModal] = useState(false)
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [dishes, setDishes] = useState<DishByRestaurant[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingDishes, setLoadingDishes] = useState(true)
  const [loadingReviews, setLoadingReviews] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Optional: compute distance from user's current location via Google Distance Matrix
  const [userDistanceMeters, setUserDistanceMeters] = useState<number | null>(null)
  const [isGeoSupported, setIsGeoSupported] = useState(true)
  const [isDistanceLoading, setIsDistanceLoading] = useState(false)

  // Review form state
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [isSubmittingReview, setIsSubmittingReview] = useState(false)

  // Reviews list state
  const [reviews, setReviews] = useState<RestaurantReview[]>([])

  const availableImages = [
    "/pho-noodle-soup-authentic-vietnamese.jpg",
    "/banh-mi-vietnamese-sandwich.jpg",
    "/spring-rolls-fresh-vietnamese.jpg",
    "/vietnamese-food-table-spread.jpg",
    "/authentic-vietnamese-pho-restaurant-with-vibrant-c.jpg"
  ]

  useEffect(() => {
    const fetchRestaurantDetail = async () => {
      try {
        setLoading(true)
        setError(null)
        const result = await restaurantApi.getRestaurantDetail(Number(restaurantId))
        if (result.status === 'success' && result.data) {
          setRestaurant(result.data)
        } else {
          setError('レストラン情報が見つかりませんでした')
        }
      } catch (err) {
        console.error('Error fetching restaurant detail:', err)
        setError('レストラン情報の取得に失敗しました')
      } finally {
        setLoading(false)
      }
    }

    const fetchRestaurantDishes = async () => {
      try {
        setLoadingDishes(true)
        const result = await restaurantApi.getDishesByRestaurant(Number(restaurantId))
        if (result.status === 'success' && result.data) {
          // Filter out null values and only keep valid dishes
          const validDishes = result.data.filter((dish): dish is DishByRestaurant => dish !== null)
          setDishes(validDishes)
        }
      } catch (err) {
        console.error('Error fetching restaurant dishes:', err)
      } finally {
        setLoadingDishes(false)
      }
    }

    if (restaurantId) {
      fetchRestaurantDetail()
      fetchRestaurantDishes()
    }
  }, [restaurantId])

  useEffect(() => {
    setIsGeoSupported(typeof navigator !== 'undefined' && !!navigator.geolocation)
  }, [])

  // Auto-calculate distance from stored location (no prompting here).
  useEffect(() => {
    const run = async () => {
      if (!location) return
      if (!restaurant) return
      if (userDistanceMeters !== null) return

      try {
        const meters = await getRestaurantDistanceMetersWithCache({
          origin: { lat: location.lat, lng: location.lng },
          restaurantId: restaurant.id,
          restaurantName: restaurant.name,
          restaurantAddress: restaurant.address,
          fallbackDistanceMeters: restaurant.distance,
        })
        setUserDistanceMeters(meters)
      } catch {
        // keep DB distance
      }
    }

    run()
  }, [location, restaurant, userDistanceMeters])

  // Fetch restaurant reviews
  useEffect(() => {
    const fetchReviews = async () => {
      if (!restaurant) return

      try {
        setLoadingReviews(true)
        const result = await restaurantApi.getRestaurantReviews(restaurant.id)
        if (result.status === 'success' && result.data) {
          setReviews(result.data)
        }
      } catch (error) {
        console.error('Failed to fetch reviews:', error)
      } finally {
        setLoadingReviews(false)
      }
    }

    fetchReviews()
  }, [restaurant])

  const handleSeeMoreReviews = () => {
    if (restaurant) {
      router.push(`/restaurant/${restaurant.id}/reviews`)
    }
  }

  const handleMapClick = () => {
    if (restaurant?.address) {
      const query = encodeURIComponent(restaurant.address)
      const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${query}`
      window.open(googleMapsUrl, "_blank")
    }
  }

  const formatDistance = (distanceMeters: number) => {
    if (distanceMeters >= 1000) return `${(distanceMeters / 1000).toFixed(1)}km`
    return `${distanceMeters}m`
  }

  const handleUseMyLocation = async () => {
    if (!restaurant?.address) {
      toast.error('住所情報がないため距離を計算できません')
      return
    }

    // Geolocation requires a secure context (HTTPS), except for localhost.
    if (typeof window !== 'undefined' && !window.isSecureContext) {
      toast.error('位置情報を使うにはHTTPSでアクセスしてください（localhostは除く）')
      return
    }

    try {
      setIsDistanceLoading(true)

      // Request location via the shared provider (stores it for other pages too).
      const loc = location ?? (await requestLocation())
      if (!loc) {
        toast.error('位置情報が取得できませんでした')
        return
      }

      const meters = await getRestaurantDistanceMetersWithCache({
        origin: { lat: loc.lat, lng: loc.lng },
        restaurantId: restaurant.id,
        restaurantName: restaurant.name,
        restaurantAddress: restaurant.address,
        fallbackDistanceMeters: restaurant.distance,
      })
      setUserDistanceMeters(meters)
    } catch (err) {
      const message = err instanceof Error ? err.message : '位置情報の取得に失敗しました'
      console.error('Failed to compute distance from user location:', err)
      toast.error(message)
    } finally {
      setIsDistanceLoading(false)
    }
  }

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!comment.trim()) {
      toast.error('コメントを入力してください')
      return
    }

    if (!restaurant) {
      toast.error('レストラン情報が見つかりません')
      return
    }

    try {
      setIsSubmittingReview(true)
      const result = await restaurantApi.addRestaurantReview({
        restaurantId: restaurant.id,
        rating: rating,
        comment: comment.trim()
      })

      if (result.status === 'success') {
        toast.success('レビューが送信されました')
        setComment('')
        setRating(5)
      } else {
        toast.error(result.message || 'レビューの送信に失敗しました')
      }
    } catch (error) {
      console.error('Failed to submit review:', error)
      toast.error('レビューの送信に失敗しました')
    } finally {
      setIsSubmittingReview(false)
    }
  }

  const formatPrice = (minPrice: number, maxPrice: number) => {
    const formatVND = (price: number): string => {
      return new Intl.NumberFormat('ja-JP', {
        style: 'currency',
        currency: 'VND',
      }).format(price)
    }
    return `${formatVND(minPrice)} - ${formatVND(maxPrice)}`
  }

  const getImageUrl = (imageUrl: string | null) => {
    if (!imageUrl || imageUrl.includes('example.com')) {
      return availableImages[Math.floor(Math.random() * availableImages.length)]
    }
    return imageUrl
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <TopHeader />
        <main className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex justify-center items-center h-96">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        </main>
      </div>
    )
  }

  if (error || !restaurant) {
    return (
      <div className="min-h-screen bg-background">
        <TopHeader />
        <main className="max-w-7xl mx-auto px-6 py-8">
          <div className="text-center py-12">
            <p className="text-muted-foreground">{error || 'レストラン情報が見つかりませんでした'}</p>
            <Button onClick={() => router.back()} className="mt-4">戻る</Button>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <TopHeader />

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Section 1: 戻るボタン - Back Button */}
        <section className="mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft size={18} />
            <span>戻る</span>
          </Button>
        </section>

        {/* Section 2: レストラン詳細タイトル - Page Title */}
        <section className="mb-8">
          <h1 className="text-4xl font-bold text-foreground text-center">レストラン詳細</h1>
        </section>

        {/* Section 3 & 4: Restaurant Image and Basic Info */}
        <section className="mb-8">
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-8">
                {/* Section 3: レストラン画像 - Restaurant Image */}
                <div className="flex items-center justify-center">
                  <div className="w-full aspect-square bg-secondary rounded-lg overflow-hidden shadow-md">
                    <img
                      src={getImageUrl(restaurant.imageUrl)}
                      alt={restaurant.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.src = availableImages[0]
                      }}
                    />
                  </div>
                </div>

                {/* Section 4: レストランの基本情報 - Restaurant Basic Info */}
                <div className="flex flex-col justify-center space-y-6">
                  {/* Restaurant Name */}
                  <div>
                    <h2 className="text-3xl font-bold text-foreground mb-4">{restaurant.name}</h2>
                  </div>

                  {/* Rating */}
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <Star className="w-6 h-6 fill-amber-400 text-amber-400" />
                      <span className="text-xl font-semibold text-foreground">{restaurant.rate.toFixed(1)}</span>
                    </div>
                  </div>

                  {/* Price Range */}
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                      価格帯
                    </h3>
                    <p className="text-base text-foreground">{formatPrice(restaurant.minprice, restaurant.maxprice)}</p>
                  </div>

                  {/* Description */}
                  {restaurant.description && (
                    <div>
                      <h3 className="text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                        紹介
                      </h3>
                      <p className="text-base text-foreground leading-relaxed">{restaurant.description}</p>
                    </div>
                  )}

                  {/* Review */}
                  {restaurant.review && (
                    <div>
                      <h3 className="text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                        レビュー
                      </h3>
                      <p className="text-base text-foreground leading-relaxed">{restaurant.review}</p>
                    </div>
                  )}

                  {/* Location */}
                  {restaurant.address && (
                    <div>
                      <h3 className="text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wide flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        場所
                      </h3>
                      <p className="text-base text-foreground">{restaurant.address}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        距離: {formatDistance(userDistanceMeters ?? restaurant.distance)}
                      </p>

                      {isGeoSupported && (
                        <div className="mt-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleUseMyLocation}
                            disabled={isDistanceLoading}
                          >
                            {isDistanceLoading ? '計算中…' : '現在地からの距離を計算'}
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Business Hours */}
                  {restaurant.openTime && restaurant.closeTime && (
                    <div>
                      <h3 className="text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wide flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        営業時間
                      </h3>
                      <p className="text-base text-foreground">
                        {restaurant.openTime} - {restaurant.closeTime}
                      </p>
                    </div>
                  )}

                  {/* Contact Information */}
                  {restaurant.phone && (
                    <div>
                      <h3 className="text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                        連絡先情報
                      </h3>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-muted-foreground" />
                          <a href={`tel:${restaurant.phone}`} className="text-base text-foreground hover:text-primary">
                            {restaurant.phone}
                          </a>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* レストランの人気料理 - Restaurant Popular Dishes */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-6">レストランの人気料理</h2>
          {loadingDishes ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : dishes.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">料理情報がありません</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
              {dishes.map((dish, index) => (
                <div 
                  key={`${dish.id}-${index}`} 
                  onClick={() => router.push(`/dish/${dish.id}?restaurantId=${restaurantId}`)}
                  className="cursor-pointer"
                >
                  <div className="bg-white rounded-lg shadow-md hover:shadow-xl hover:shadow-yellow-500/50 transition-all border border-slate-200 p-4">
                    {/* Dish Image */}
                    <div className="w-full aspect-square rounded-lg overflow-hidden bg-secondary shadow-md mb-4">
                      <img
                        src={getImageUrl(dish.imageUrl)}
                        alt={dish.name}
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          target.src = availableImages[Math.floor(Math.random() * availableImages.length)]
                        }}
                      />
                    </div>
                    {/* Dish Info */}
                    <div className="text-center">
                      <p className="font-medium text-foreground mb-2">{dish.name}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Section 7: レストランの住所 - Restaurant Address with Map */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-6">レストランの住所</h2>
          <Card className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow" onClick={handleMapClick}>
            <CardContent className="p-0">
              <div className="relative w-full h-96 bg-muted">
                {/* Map Placeholder */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <MapPin className="w-16 h-16 text-primary mx-auto mb-4" />
                    <p className="text-lg font-semibold text-foreground mb-2">{restaurant.address}</p>
                    <p className="text-sm text-muted-foreground">クリックしてGoogleマップで開く</p>
                  </div>
                </div>
                {/* Map Image Placeholder */}
                <div className="absolute inset-0 opacity-20">
                  <img
                    src="/vietnamese-food-table-spread.jpg"
                    alt="Map"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Section 8: レビューを追加 - Add Review Form */}
        <section className="mb-8">
          <Card className="border-2 border-primary/20">
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold text-foreground mb-4">レビューを追加</h2>
              <form onSubmit={handleSubmitReview} className="space-y-4">
                {/* Rating Section */}
                <div>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        className="focus:outline-none transition-transform hover:scale-110"
                      >
                        <Star
                          size={32}
                          className={
                            star <= rating
                              ? "fill-amber-400 text-amber-400"
                              : "text-muted-foreground"
                          }
                        />
                      </button>
                    ))}
                    <span className="ml-2 text-lg font-semibold text-foreground">{rating}.0</span>
                  </div>
                </div>

                {/* Comment Section */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">コメント</label>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="レビューコメントを入力してください..."
                    className="w-full p-3 border border-input rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    rows={4}
                    disabled={isSubmittingReview}
                  />
                </div>

                {/* Submit Button */}
                <div className="flex justify-end">
                  <Button
                    type="submit"
                    disabled={isSubmittingReview || !comment.trim()}
                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-6 py-2 flex items-center gap-2"
                  >
                    <Send size={18} />
                    {isSubmittingReview ? '送信中...' : '送信'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </section>

        {/* Section 9: レストランレビュー - Restaurant Reviews List */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-6">レストランレビュー</h2>
          {loadingReviews ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : reviews.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">レビューがありません</p>
            </div>
          ) : (
            <>
              <div className="space-y-6">
                {reviews.slice(0, 3).map((review) => (
                  <Card key={review.restaurantReviewId} className="border-l-4 border-l-primary hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      {/* Review Header */}
                      <div className="flex items-start gap-4 mb-4">
                        <div className="flex-shrink-0">
                          {review.avatar ? (
                            <img
                              src={review.avatar}
                              alt={review.fullName}
                              className="w-14 h-14 rounded-full object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement
                                target.style.display = 'none'
                                target.nextElementSibling?.classList.remove('hidden')
                              }}
                            />
                          ) : null}
                          <div className={`w-14 h-14 rounded-full bg-gradient-to-br from-blue-400 to-blue-500 flex items-center justify-center text-white font-semibold text-lg ${review.avatar ? 'hidden' : ''}`}>
                            {review.fullName.charAt(0)}
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <div>
                              <p className="font-semibold text-foreground">{review.fullName}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {new Date(review.date).toLocaleDateString('ja-JP', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric'
                                })}
                              </p>
                            </div>
                            <div className="flex items-center gap-1">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  size={18}
                                  className={
                                    i < Math.floor(review.rating)
                                      ? "fill-amber-400 text-amber-400"
                                      : "text-muted-foreground"
                                  }
                                />
                              ))}
                              <span className="text-sm font-medium text-foreground ml-2">
                                {review.rating.toFixed(1)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Review Comment */}
                      <p className="text-sm text-foreground mb-4 text-pretty leading-relaxed pl-18">
                        {review.comment}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* See More Reviews Button */}
              {reviews.length > 3 && (
                <div className="flex justify-center mt-8">
                  <Button
                    onClick={handleSeeMoreReviews}
                    size="lg"
                    className="rounded-full px-8 py-6 text-base font-medium bg-yellow-500 hover:bg-yellow-600 text-white transition-colors duration-200"
                  >
                    もっと見る
                  </Button>
                </div>
              )}
            </>
          )}
        </section>
      </main>

      {/* Section 10: 料理紹介サポート - AI Support Chat Bubble */}
      <button
        onClick={() => setShowSupportModal(!showSupportModal)}
        className="fixed bottom-8 right-8 w-16 h-16 bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600 rounded-full shadow-lg hover:shadow-xl flex items-center justify-center transition-all hover:scale-110 z-30"
        aria-label="AI food recommendation support"
      >
        <MessageCircle className="w-8 h-8 text-white" />
      </button>

      {/* AI Support Modal */}
      <AISupportModal
        isOpen={showSupportModal}
        onClose={() => setShowSupportModal(!showSupportModal)}
      />
    </div>
  )
}

