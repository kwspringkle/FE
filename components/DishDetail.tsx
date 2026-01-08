"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Heart, Star, MessageCircle, ChevronLeft, Home, Send } from "lucide-react"
import { TopHeader } from "@/components/TopHeader"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AISupportModal } from "@/components/AISupportModal"
import { dishApi, restaurantApi, favoriteApi } from "@/api/api"
import type { DishRestaurantDetail, RestaurantByDish, RelatedDish, DishReview } from "@/api/types"
import { toast } from "sonner"
import { useUserLocation } from "@/components/UserLocationProvider"
import { getRestaurantDistanceMetersWithCache } from "@/lib/vietmapDistance"
import { emitFavoritesChanged, useFavoritesChanged } from "@/lib/favoritesSync"

interface DishDetailPageProps {
  dishRestaurantId: string
  restaurantId?: string  // Optional: when clicking from restaurant detail page
}

// Helper function to get image URL with fallback
const getImageUrl = (url: string | null | undefined): string => {
  if (!url || url.includes('example.com')) {
    const availableImages = [
      '/pho-noodle-soup-authentic-vietnamese.jpg',
      '/banh-mi-vietnamese-sandwich.jpg',
      '/spring-rolls-fresh-vietnamese.jpg',
      '/vietnamese-food-table-spread.jpg',
    ]
    return availableImages[Math.floor(Math.random() * availableImages.length)]
  }
  return url
}

// Helper function to format price
const formatPrice = (price: number): string => {
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'VND',
  }).format(price)
}

const normalizeNational = (value?: string | null): "日本" | "ベトナム" | null => {
  const v = (value ?? "").trim()
  if (!v) return null
  if (v === "日本" || v.includes("日本")) return "日本"
  const lower = v.toLowerCase()
  const lowerAscii = v
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
  if (
    v === "ベトナム" ||
    v.includes("ベトナム") ||
    lower.includes("vietnam") ||
    lowerAscii.includes("vietnam") ||
    lowerAscii.includes("viet nam") ||
    lowerAscii === "vn"
  ) {
    return "ベトナム"
  }
  return null
}

const getDisplayNational = (value?: string | null): string | null => {
  const raw = (value ?? "").trim()
  if (!raw) return null
  return normalizeNational(raw) ?? raw
}

export function DishDetailPage({ dishRestaurantId, restaurantId }: DishDetailPageProps) {
  const router = useRouter()
  const { location } = useUserLocation()
  const [dish, setDish] = useState<DishRestaurantDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [restaurants, setRestaurants] = useState<RestaurantByDish[]>([])
  const [loadingRestaurants, setLoadingRestaurants] = useState(true)
  const [relatedDishes, setRelatedDishes] = useState<RelatedDish[]>([])
  const [loadingRelatedDishes, setLoadingRelatedDishes] = useState(true)
  const [reviews, setReviews] = useState<DishReview[]>([])
  const [loadingReviews, setLoadingReviews] = useState(true)
  const [liked, setLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [isLiking, setIsLiking] = useState(false)
  const [showSupportModal, setShowSupportModal] = useState(false)

  const [userDistanceMeters, setUserDistanceMeters] = useState<number | null>(null)

  const formatDistance = (meters: number) => {
    const m = Math.round(meters)
    return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${m} m`
  }

  // Review form state
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [isSubmittingReview, setIsSubmittingReview] = useState(false)

  // Fetch dish detail
  useEffect(() => {
    const fetchDishDetail = async () => {
      try {
        setLoading(true)
        
        let result;
        // If restaurantId is provided, use the API that takes dishId + restaurantId
        // This is used when navigating from restaurant detail page
        if (restaurantId) {
          result = await dishApi.getDishRestaurantDetailByDishAndRestaurant(
            Number(dishRestaurantId), // dishId
            Number(restaurantId)
          )
        } else {
          // Otherwise use the original API that takes dishRestaurantId
          result = await dishApi.getDishRestaurantDetail(Number(dishRestaurantId))
        }
        
        if (result.status === 'success' && result.data) {
          setDish(result.data)
          setLikeCount(result.data.countLike)
          
          // Check if dish is already in favorites
          try {
            const favoritesResult = await favoriteApi.getAllFavorites()
            if (favoritesResult.status === 'success' && favoritesResult.data) {
              const isAlreadyLiked = favoritesResult.data.some(
                fav => fav.dishId === result.data.dishId
              )
              setLiked(isAlreadyLiked)
            }
          } catch (favError) {
            // Silently handle - user might not be logged in
            console.log('Could not check favorites status')
          }
        } else {
          toast.error(result.message || '料理情報の取得に失敗しました')
        }
      } catch (error) {
        console.error('Failed to fetch dish detail:', error)
        toast.error('料理情報の取得に失敗しました')
      } finally {
        setLoading(false)
      }
    }

    fetchDishDetail()
  }, [dishRestaurantId, restaurantId])

  const refreshLikedFromFavorites = async (dishId: number) => {
    try {
      const favoritesResult = await favoriteApi.getAllFavorites()
      if (favoritesResult.status === 'success' && favoritesResult.data) {
        const isAlreadyLiked = favoritesResult.data.some(
          fav => fav.dishId === dishId
        )
        setLiked(isAlreadyLiked)
      }
    } catch {
      // ignore
    }
  }

  const resolveFavoriteIdForDish = async (dishId: number, restaurantId?: number) => {
    try {
      const favoritesResult = await favoriteApi.getAllFavorites()
      if (favoritesResult.status !== 'success' || !favoritesResult.data) return null

      const exact = favoritesResult.data.find((fav: any) => {
        if (fav?.dishId !== dishId) return false
        // If backend includes restaurantId, prefer exact match; otherwise allow null/undefined
        if (typeof restaurantId === 'number') {
          if (fav?.restaurantId === restaurantId) return true
          if (fav?.restaurantId == null) return true
        }
        return true
      })

      return typeof exact?.id === 'number' ? exact.id : null
    } catch {
      return null
    }
  }

  useFavoritesChanged(() => {
    if (!dish) return
    refreshLikedFromFavorites(dish.dishId)
  })

  // Fetch restaurants serving the same dish
  useEffect(() => {
    const fetchRestaurants = async () => {
      if (!dish) return
      
      try {
        setLoadingRestaurants(true)
        // Use dish.id (dishRestaurantId from API response) instead of URL param
        // because when coming from restaurant page, dishRestaurantId in URL is actually dishId
        console.log('Fetching restaurants for dishId:', dish.dishId, 'dishRestaurantId:', dish.id)
        const result = await restaurantApi.getRestaurantsByDish(dish.dishId, dish.id)
        console.log('Restaurants API response:', result)
        if (result.status === 'success' && result.data) {
          // Filter out null values from the response
          const filteredRestaurants = result.data.filter((restaurant): restaurant is RestaurantByDish => restaurant !== null)
          console.log('Filtered restaurants data:', filteredRestaurants)
          setRestaurants(filteredRestaurants)
        }
      } catch (error) {
        console.error('Failed to fetch restaurants:', error)
      } finally {
        setLoadingRestaurants(false)
      }
    }

    fetchRestaurants()
  }, [dish])

  // Fetch related dishes with same ingredients
  useEffect(() => {
    const fetchRelatedDishes = async () => {
      if (!dish) return
      
      try {
        setLoadingRelatedDishes(true)
        const result = await dishApi.getDishesWithSameIngredients(dish.dishId, dish.restaurantId)
        if (result.status === 'success' && result.data) {
          // Filter out null values and current dish
          const filteredDishes = result.data
            .filter((d): d is RelatedDish => d !== null && d.id !== dish.dishId)
          setRelatedDishes(filteredDishes)
        }
      } catch (error) {
        console.error('Failed to fetch related dishes:', error)
      } finally {
        setLoadingRelatedDishes(false)
      }
    }

    fetchRelatedDishes()
  }, [dish])

  // Fetch dish reviews
  useEffect(() => {
    const fetchReviews = async () => {
      if (!dish) return
      
      try {
        setLoadingReviews(true)
        console.log('Fetching reviews for dishId:', dish.dishId)
        const result = await dishApi.getDishReviews(dish.dishId)
        console.log('Reviews API response:', result)
        if (result.status === 'success' && result.data) {
          console.log('Reviews data:', result.data)
          setReviews(result.data)
        }
      } catch (error) {
        // Silently handle error - reviews are optional
        console.log('Reviews not available for this dish')
        setReviews([])
      } finally {
        setLoadingReviews(false)
      }
    }

    fetchReviews()
  }, [dish])

  // If we have user location, compute a better distance to the restaurant.
  useEffect(() => {
    const run = async () => {
      if (!location) return
      if (!dish) return
      if (userDistanceMeters !== null) return

      try {
        const r = await restaurantApi.getRestaurantDetail(dish.restaurantId)
        const addr = r.status === "success" ? r.data?.address : null

        const meters = await getRestaurantDistanceMetersWithCache({
          origin: { lat: location.lat, lng: location.lng },
          restaurantId: dish.restaurantId,
          restaurantName: dish.restaurantname,
          restaurantAddress: addr ?? undefined,
          fallbackDistanceMeters: dish.distance,
        })
        setUserDistanceMeters(meters)
      } catch {
        // fallback to dish.distance
      }
    }

    run()
  }, [location, dish, userDistanceMeters])

  const handleRestaurantClick = () => {
    if (dish) {
      router.push(`/restaurant/${dish.restaurantId}`)
    }
  }

  // Handle like/unlike dish
  const handleToggleLike = async () => {
    if (!dish || isLiking) return

    try {
      setIsLiking(true)
      
      if (liked) {
        // Unlike - Robust delete:
        // 1) delete by favoriteId (works even if restaurantId is null)
        // 2) fallback: delete by dishId+restaurantId
        // 3) fallback: delete by dishId only
        let removed = false

        const favoriteId = await resolveFavoriteIdForDish(dish.dishId, dish.restaurantId)
        if (favoriteId != null) {
          try {
            const r = await favoriteApi.removeFavorite({ favoriteId })
            removed = r.status === 'success'
          } catch {
            // continue
          }
        }

        if (!removed) {
          try {
            const r = await favoriteApi.removeFavorite({
              dishId: dish.dishId,
              restaurantId: dish.restaurantId,
            })
            removed = r.status === 'success'
          } catch {
            // continue
          }
        }

        if (!removed) {
          try {
            const r = await favoriteApi.removeFavorite({ dishId: dish.dishId })
            removed = r.status === 'success'
          } catch {
            // continue
          }
        }

        if (removed) {
          setLiked(false)
          setLikeCount(prev => Math.max(0, prev - 1))
          toast.success('いいねを取り消しました')
          emitFavoritesChanged()
        } else {
          toast.error('いいねの取り消しに失敗しました')
        }
      } else {
        // Like - Call API to add favorite
        const result = await favoriteApi.addFavorite({
          dishId: dish.dishId,
          restaurantId: dish.restaurantId
        })

        if (result.status === 'success' || result.status === 'info') {
          setLiked(true)
          setLikeCount(prev => prev + 1)
          if (result.status === 'info') {
            toast.info('すでにお気に入りに追加されています')
          } else {
            toast.success('お気に入りに追加しました')
          }
          emitFavoritesChanged()
        } else {
          toast.error(result.message || 'お気に入りの追加に失敗しました')
        }
      }
    } catch (error) {
      console.error('Failed to toggle like:', error)
      toast.error('操作に失敗しました')
    } finally {
      setIsLiking(false)
    }
  }

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!comment.trim()) {
      toast.error('コメントを入力してください')
      return
    }

    if (!dish) {
      toast.error('料理情報が見つかりません')
      return
    }

    try {
      setIsSubmittingReview(true)
      const result = await dishApi.addDishReview({
        dishId: dish.dishId,
        rating: rating,
        comment: comment.trim()
      })

      if (result.status === 'success') {
        toast.success('レビューが送信されました')
        setComment('')
        setRating(5)
        // Refresh reviews
        const updatedResult = await dishApi.getDishReviews(dish.dishId)
        if (updatedResult.status === 'success' && updatedResult.data) {
          setReviews(updatedResult.data)
        }
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

  const handleDishClick = (dishId: string) => {
    router.push(`/dish/${dishId}`)
  }

  const handleSeeMoreReviews = () => {
    if (dish) {
      router.push(`/dish/${dish.dishId}/reviews`)
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <TopHeader />
        <main className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex justify-center items-center py-32">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary"></div>
          </div>
        </main>
      </div>
    )
  }

  // Error state
  if (!dish) {
    return (
      <div className="min-h-screen bg-background">
        <TopHeader />
        <main className="max-w-7xl mx-auto px-6 py-8">
          <div className="text-center py-32">
            <p className="text-xl text-muted-foreground">料理情報が見つかりません</p>
            <Link href="/homepage">
              <Button className="mt-6">ホームに戻る</Button>
            </Link>
          </div>
        </main>
      </div>
    )
  }

  // Parse ingredients string to array - split by both Japanese comma and regular comma
  const ingredients = dish.ingredients 
    ? dish.ingredients.split(/[、,]/).map(item => item.trim()).filter(item => item.length > 0)
    : []

  return (
    <div className="min-h-screen bg-background">
      <TopHeader />

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Back to Home Button */}
        <section className="mb-6">
          <Link href="/homepage">
            <Button
              variant="ghost"
              size="sm"
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft size={18} />
              <Home size={18} />
              <span>ホームに戻る</span>
            </Button>
          </Link>
        </section>

        {/* Section 1: 料理の基本情報 - Dish Basic Info */}
        <section className="mb-8">
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-8">
                {/* Dish Image */}
                <div className="flex items-center justify-center">
                  <div className="w-full aspect-square bg-secondary rounded-lg overflow-hidden shadow-md">
                    <img
                      src={getImageUrl(dish.imageUrlDish)}
                      alt={dish.dishesname}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.src = '/pho-noodle-soup-authentic-vietnamese.jpg'
                      }}
                    />
                  </div>
                </div>

                {/* Dish Info */}
                <div className="flex flex-col justify-center space-y-6">
                  {/* Dish Name */}
                  <h1 className="text-3xl font-bold text-foreground">{dish.dishesname}</h1>

                  {/* Like Count */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleToggleLike}
                      disabled={isLiking}
                      className={`p-2 hover:bg-muted rounded-lg transition-colors ${isLiking ? 'opacity-50 cursor-not-allowed' : ''}`}
                      aria-label={liked ? "Unlike dish" : "Like dish"}
                    >
                      <Heart
                        size={24}
                        className={`transition-all ${liked ? "fill-red-500 text-red-500 scale-110" : "text-red-500"} ${isLiking ? 'animate-pulse' : ''}`}
                      />
                    </button>
                    <span className="text-xl font-semibold text-foreground">
                      {likeCount.toLocaleString()}
                    </span>
                  </div>

                  {/* Description */}
                  {dish.description && (
                    <div>
                      <p className="text-base text-muted-foreground leading-relaxed">
                        {dish.description}
                      </p>
                    </div>
                  )}

                  {/* Ingredients */}
                  {ingredients.length > 0 && (
                    <div className="bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-950/20 dark:to-amber-950/20 rounded-xl p-5 border border-yellow-200 dark:border-yellow-800">
                      <h3 className="text-lg font-bold text-yellow-700 dark:text-yellow-500 mb-4 flex items-center gap-2">
                        <span className="text-2xl">🥘</span>
                        原料
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {ingredients.map((ingredient, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-4 py-2 bg-white dark:bg-gray-800 rounded-full text-sm font-medium text-gray-700 dark:text-gray-300 shadow-sm border border-yellow-100 dark:border-yellow-900 hover:shadow-md transition-shadow"
                          >
                            <span className="mr-1.5 text-yellow-500">•</span>
                            {ingredient.trim()}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Price */}
                  <div className="pt-4 border-t border-border">
                    <div className="text-right">
                      <span className="text-3xl font-bold text-foreground">
                        {formatPrice(dish.price)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Section 2: 店の情報 - Restaurant Info */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-6">店の情報</h2>
          <Card 
            className="hover:shadow-lg transition-shadow cursor-pointer"
            onClick={handleRestaurantClick}
          >
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="relative w-24 h-24 rounded-lg overflow-hidden flex-shrink-0 bg-secondary">
                  <img
                    src={getImageUrl(dish.imageUrlRestaurant)}
                    alt={dish.restaurantname}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.src = '/pho-noodle-soup-authentic-vietnamese.jpg'
                    }}
                  />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-foreground hover:text-yellow-500 transition-colors">
                    {dish.restaurantname}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    距離: {formatDistance(userDistanceMeters ?? dish.distance)}
                  </p>
                  <p className="text-sm text-primary mt-2 font-medium">店舗詳細を見る →</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Section 3: 関連料理 - Related Dishes with Same Ingredients */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-6">関連料理</h2>
          {loadingRelatedDishes ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : relatedDishes.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">関連料理が見つかりません</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {relatedDishes.map((relatedDish) => (
                <Card
                  key={relatedDish.id}
                  className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group"
                  onClick={() => router.push(`/dish/${relatedDish.id}`)}
                >
                  <div className="relative w-full aspect-square overflow-hidden bg-secondary">
                    <img
                      src={getImageUrl(relatedDish.imageUrl)}
                      alt={relatedDish.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.src = '/pho-noodle-soup-authentic-vietnamese.jpg'
                      }}
                    />
                  </div>
                  <CardContent className="p-4 text-center">
                    <p className="text-sm font-medium text-foreground line-clamp-2">
                      {relatedDish.name}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* Section 4: 同じ料理を提供するレストラン - Restaurants Serving Same Dish */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-6">同じ料理を提供するレストラン</h2>
          {loadingRestaurants ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : restaurants.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">同じ料理を提供するレストランが見つかりません</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {restaurants.map((restaurant) => (
                <Card
                  key={restaurant.restaurantId}
                  className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group"
                  onClick={() => router.push(`/restaurant/${restaurant.restaurantId}`)}
                >
                  <div className="relative w-full aspect-square overflow-hidden bg-secondary">
                    <img
                      src={getImageUrl(restaurant.imageUrl)}
                      alt={restaurant.restaurantName}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.src = '/pho-noodle-soup-authentic-vietnamese.jpg'
                      }}
                    />
                  </div>
                  <CardContent className="p-4 text-center">
                    <p className="text-sm font-medium text-foreground line-clamp-2">
                      {restaurant.restaurantName}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* Section 4.5: レビューを追加 - Add Review Form */}
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

        {/* Section 5: 料理レビュー - Dish Reviews */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-6">料理レビュー</h2>
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
                {reviews
                  .slice()
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .slice(0, 3)
                  .map((review) => (
                  <Card key={review.dishReviewId} className="border-l-4 border-l-primary">
                    <CardContent className="p-6">
                      <div className="flex gap-4">
                        <div className="flex-shrink-0">
                          {review.avatar ? (
                            <img
                              src={review.avatar}
                              alt={review.fullName}
                              className="w-12 h-12 rounded-full object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement
                                target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="48" height="48"%3E%3Ccircle fill="%23ddd" cx="24" cy="24" r="24"/%3E%3Ctext fill="%23999" font-family="sans-serif" font-size="20" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3E{review.fullName.charAt(0)}%3C/text%3E%3C/svg%3E'
                              }}
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-500 flex items-center justify-center text-white font-semibold">
                              {review.fullName.charAt(0)}
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-foreground">{review.fullName}</p>
                                {(() => {
                                  const displayNational = getDisplayNational(review.national)
                                  return displayNational ? (
                                    <span className="text-xs text-muted-foreground">({displayNational})</span>
                                  ) : null
                                })()}
                              </div>
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
                                    i < Math.floor(review.rate)
                                      ? "fill-amber-400 text-amber-400"
                                      : "text-muted-foreground"
                                  }
                                />
                              ))}
                              <span className="text-sm font-medium text-foreground ml-2">
                                {review.rate.toFixed(1)}
                              </span>
                            </div>
                          </div>
                          <p className="text-sm text-foreground leading-relaxed mt-2">{review.comment}</p>
                        </div>
                      </div>
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

        {/* AI Support Chat Bubble */}
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
      </main>
    </div>
  )
}
