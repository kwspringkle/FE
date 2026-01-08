"use client"

import { MessageCircle, Search } from "lucide-react"
import { useState, useEffect, useRef, useMemo, useCallback } from "react"
import { useRouter } from "next/navigation"
import { CustomInput } from "@/components/ui/custom-input"
import { TopHeader } from "@/components/TopHeader"
import { PopularDishesRanking } from "@/components/PopularDishesRanking"
import { FavoriteList } from "@/components/FavoriteList"
import { NearbyRestaurants } from "@/components/NearbyRestaurants"
import { RecommendedDishes } from "@/components/RecommendedDishes"
import { AISupportModal } from "@/components/AISupportModal"
import { authApi, dishApi, restaurantApi, favoriteApi, searchApi } from "@/api/api"
import { getAuthToken, removeAuthToken } from "@/api/config"
import type { Dish, Restaurant, Favorite, DishRestaurant, CategorizedSearchData } from "@/api/types"
import { useUserLocation } from "@/components/UserLocationProvider"
import { getRestaurantDistanceMetersWithCache, mapWithConcurrency } from "@/lib/vietmapDistance"
import { getPromptDismissedKey } from "@/lib/locationCache"

// Helper function to decode JWT and get username (without @gmail.com)
const getUsernameFromToken = (): string | null => {
  if (typeof window === 'undefined') return null
  const token = getAuthToken()
  if (!token) return null
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    const username = payload.sub || payload.username || null
    if (username) {
      // Remove @gmail.com or any email domain
      return username.split('@')[0]
    }
    return null
  } catch (error) {
    console.error("Error decoding token:", error)
    return null
  }
}

export default function HomePage() {
  const router = useRouter()
  const { location, requestLocation } = useUserLocation()
  const [showAISupport, setShowAISupport] = useState(false)
  const [userName, setUserName] = useState("はる")
  const [userAvatar, setUserAvatar] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [showSearchResults, setShowSearchResults] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const [categorizedResults, setCategorizedResults] = useState<CategorizedSearchData | null>(null)
  const [loadingSearch, setLoadingSearch] = useState(false)
  const [popularDishes, setPopularDishes] = useState<Dish[]>([])
  const [loadingDishes, setLoadingDishes] = useState(true)
  const [nearbyRestaurants, setNearbyRestaurants] = useState<Restaurant[]>([])
  const [nearbyRestaurantsUserSorted, setNearbyRestaurantsUserSorted] = useState<Restaurant[] | null>(null)
  const [loadingRestaurants, setLoadingRestaurants] = useState(true)
  const [nearbyCurrentPage, setNearbyCurrentPage] = useState(1)
  const [nearbyTotalPages, setNearbyTotalPages] = useState(1)
  const [favoriteDishes, setFavoriteDishes] = useState<Favorite[]>([])
  const [loadingFavorites, setLoadingFavorites] = useState(true)
  const [recommendedDishes, setRecommendedDishes] = useState<DishRestaurant[]>([])
  const [loadingRecommended, setLoadingRecommended] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const recommendedRef = useRef<HTMLDivElement>(null)

  const [dismissedLocationPrompt, setDismissedLocationPrompt] = useState(false)

  const [searchRestaurantDistanceOverrides, setSearchRestaurantDistanceOverrides] = useState<Record<number, number>>({})

  useEffect(() => {
    if (typeof window === 'undefined') return
    setDismissedLocationPrompt(localStorage.getItem(getPromptDismissedKey()) === '1')
  }, [])

  const safeCategorizedResults = useMemo(() => {
    return {
      restaurants: categorizedResults?.restaurants ?? [],
      dishesByName: categorizedResults?.dishesByName ?? [],
      dishesByIngredients: categorizedResults?.dishesByIngredients ?? [],
    }
  }, [categorizedResults])

  // If we have user's location, compute distances for dropdown restaurant results too.
  useEffect(() => {
    const run = async () => {
      if (!location) {
        setSearchRestaurantDistanceOverrides({})
        return
      }

      const list = safeCategorizedResults.restaurants.slice(0, 6)
      if (!list || list.length === 0) {
        setSearchRestaurantDistanceOverrides({})
        return
      }

      try {
        const meters = await mapWithConcurrency(list, 3, async (r) => {
          try {
            return await getRestaurantDistanceMetersWithCache({
              origin: { lat: location.lat, lng: location.lng },
              restaurantId: r.restaurantId,
              restaurantName: r.restaurantName,
              restaurantAddress: r.address,
              fallbackDistanceMeters: r.distance,
            })
          } catch {
            return r.distance
          }
        })

        const next: Record<number, number> = {}
        for (let i = 0; i < list.length; i++) {
          next[list[i].restaurantId] = meters[i]
        }
        setSearchRestaurantDistanceOverrides(next)
      } catch {
        // keep backend distances
      }
    }

    run()
  }, [location, safeCategorizedResults.restaurants])

  // Check authentication and redirect if not logged in
  useEffect(() => {
    const checkAuth = async () => {
      const token = getAuthToken()
      
      // Nếu không có token, redirect về login
      if (!token) {
        router.push('/login')
        return
      }

      // Kiểm tra token có hợp lệ không bằng cách gọi API
      try {
        const userInfo = await authApi.getCurrentUser()
        setIsAuthenticated(true)
        
        // Get user name from API response
        if (userInfo.data && userInfo.data.name) {
          setUserName(userInfo.data.name)
        } else {
          // Fallback: Get username from JWT token if API doesn't return name
          const username = getUsernameFromToken()
          if (username) {
            setUserName(username)
          }
        }
        
        // Set avatar if available from API
        if (userInfo.data && userInfo.data.avatar) {
          setUserAvatar(userInfo.data.avatar)
        }
      } catch (error) {
        console.error("Failed to fetch user info:", error)
        // Token không hợp lệ hoặc đã hết hạn, xóa token và redirect về login
        removeAuthToken()
        setIsAuthenticated(false)
        router.push('/login')
      }
    }
    
    checkAuth()
  }, [router])

  const handleEnableLocation = async () => {
    await requestLocation()
  }

  const handleSkipLocation = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(getPromptDismissedKey(), '1')
    }
    setDismissedLocationPrompt(true)
  }

  // Fetch popular dishes
  useEffect(() => {
    const fetchPopularDishes = async () => {
      try {
        const result = await dishApi.getFamousDishes()
        if (result.status === 'success' && result.data) {
          setPopularDishes(result.data)
        }
      } catch (error) {
        console.error('Error fetching popular dishes:', error)
      } finally {
        setLoadingDishes(false)
      }
    }

    fetchPopularDishes()
  }, [])

  // Fetch nearby restaurants
  const fetchNearbyRestaurants = useCallback(async (page: number = 1, showLoading: boolean = false) => {
    if (showLoading) setLoadingRestaurants(true)
    try {
      const result = await restaurantApi.getNearbyRestaurants(page)
      if (result.status === 'success' && result.data) {
        setNearbyRestaurants(result.data)
        setNearbyCurrentPage(result.currentPage || 1)
        setNearbyTotalPages(result.totalPages || 1)
        // Reset user-sorted list until we recompute with current location.
        setNearbyRestaurantsUserSorted(null)
      }
    } catch (error) {
      console.error('Error fetching nearby restaurants:', error)
    } finally {
      if (showLoading) setLoadingRestaurants(false)
    }
  }, [])

  // If we have user's location, compute per-restaurant distances and sort accordingly.
  useEffect(() => {
    const computeAndSort = async () => {
      if (!location) return
      if (!nearbyRestaurants || nearbyRestaurants.length === 0) return

      try {
        const distances = await mapWithConcurrency(nearbyRestaurants, 3, async (r) => {
          try {
            return await getRestaurantDistanceMetersWithCache({
              origin: { lat: location.lat, lng: location.lng },
              restaurantId: r.id,
              restaurantName: r.name,
              restaurantAddress: r.address,
              fallbackDistanceMeters: r.distance,
            })
          } catch {
            return r.distance
          }
        })

        const next = nearbyRestaurants
          .map((r, idx) => ({ ...r, distance: distances[idx] }))
          .sort((a, b) => a.distance - b.distance)

        setNearbyRestaurantsUserSorted(next)
      } catch (e) {
        // If anything fails, keep DB order/distance.
        setNearbyRestaurantsUserSorted(null)
      }
    }

    computeAndSort()
  }, [location, nearbyRestaurants])

  // Fetch search suggestions with debounce
  useEffect(() => {
    const fetchSearchSuggestions = async () => {
      if (!searchQuery.trim()) {
        setCategorizedResults(null)
        return
      }

      setLoadingSearch(true)
      try {
        const result = await searchApi.searchCategorized(searchQuery.trim())
        if (result.status === 'success' && result.data && typeof result.data === 'object') {
          const data = result.data as Partial<CategorizedSearchData>
          setCategorizedResults({
            restaurants: data.restaurants ?? [],
            dishesByName: data.dishesByName ?? [],
            dishesByIngredients: data.dishesByIngredients ?? [],
          })
        } else {
          setCategorizedResults(null)
        }
      } catch (error) {
        console.error('Error fetching search suggestions:', error)
        setCategorizedResults(null)
      } finally {
        setLoadingSearch(false)
      }
    }

    // Debounce search - wait 300ms after user stops typing
    const timeoutId = setTimeout(() => {
      fetchSearchSuggestions()
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [searchQuery])

  // Fetch nearby restaurants and favorite dishes
  useEffect(() => {

    const fetchFavorites = async () => {
      // Check if user is logged in before fetching favorites
      const token = getAuthToken()
      if (!token) {
        setLoadingFavorites(false)
        return
      }
      
      try {
        const result = await favoriteApi.getTop3Favorites()
        if (result.status === 'success' && result.data) {
          setFavoriteDishes(result.data)
        }
      } catch (error) {
        // Silently handle error - user might not be logged in
        console.log('Could not fetch favorites - user may not be logged in')
      } finally {
        setLoadingFavorites(false)
      }
    }

    fetchNearbyRestaurants(1, true)
    fetchFavorites()
  }, [fetchNearbyRestaurants])

  // Fetch recommended dishes with pagination
  useEffect(() => {
    const fetchRecommendedDishes = async () => {
      setLoadingRecommended(true)
      try {
        // Backend uses 0-based page index, so subtract 1 from currentPage
        const result = await dishApi.getAllDishRestaurants(currentPage - 1, 8)
        if (result.status === 'success' && result.data) {
          setRecommendedDishes(result.data)
          setTotalPages(result.totalPages)
          setTotalItems(result.totalItems)
        }
      } catch (error) {
        console.error('Error fetching recommended dishes:', error)
      } finally {
        setLoadingRecommended(false)
      }
    }

    fetchRecommendedDishes()
  }, [currentPage])

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    // Scroll to recommended section only
    if (recommendedRef.current) {
      recommendedRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }


  // Get all available images from public folder
  const availableImages = [
    "/pho-noodle-soup-authentic-vietnamese.jpg",
    "/pho-noodle-soup-authentic-vietnamese.png",
    "/banh-mi-vietnamese-sandwich.jpg",
    "/spring-rolls-fresh-vietnamese.png",
    "/vietnamese-food-table-spread.jpg",
    "/vietnamese-food-table-spread.png",
    "/authentic-vietnamese-pho-restaurant-with-vibrant-c.jpg",
  ]

  // Helper function to get price level
  const getPriceLevel = (price: number): string => {
    if (price < 30000) return "$"
    if (price < 60000) return "$$"
    return "$$$"
  }

  // Helper function to format price
  const formatPrice = (price: number): string => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price)
  }

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearchQuery(value)
    setShowSearchResults(value.trim().length > 0)
  }

  const handleSearch = () => {
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
    } else {
      router.push('/search')
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch()
    }
  }

  // Close search results when clicking outside
  const searchRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        if (searchQuery.trim().length === 0) {
          setShowSearchResults(false)
        }
      }
    }
    if (showSearchResults) {
      document.addEventListener("mousedown", handleClickOutside)
      return () => document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [showSearchResults, searchQuery])

  // Hiển thị loading hoặc không hiển thị gì khi đang kiểm tra authentication
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">読み込み中...</p>
        </div>
      </div>
    )
  }

  // Nếu chưa authenticated, không hiển thị gì (đang redirect)
  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen bg-background">
      <TopHeader userAvatar={userAvatar} />

      <main className="max-w-7xl mx-auto px-6 py-8">
        {!showSearchResults && isAuthenticated && !location && !dismissedLocationPrompt && (
          <section className="mb-8">
            <div className="border rounded-lg bg-background p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-foreground">現在地を使って近い順に並び替えますか？</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleEnableLocation}
                  className="px-3 py-2 text-sm rounded-md border hover:bg-muted"
                >
                  許可する
                </button>
                <button
                  onClick={handleSkipLocation}
                  className="px-3 py-2 text-sm rounded-md border hover:bg-muted"
                >
                  今はしない
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Greeting Section */}
        <section className="mb-12" ref={searchRef}>
          <h2 className="text-2xl font-semibold text-foreground mb-4">
            こんにちは、{userName}さん！
          </h2>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <CustomInput
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
                onKeyPress={handleKeyPress}
                onFocus={() => setShowSearchResults(searchQuery.trim().length > 0)}
                placeholder="食べたい料理や行きたい場所を入力..."
                className="pl-12 pr-4"
              />
              <button
                onClick={handleSearch}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Search"
              >
                <Search className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Search Results */}
          {showSearchResults && (
            <div className="mt-4 bg-background border rounded-lg shadow-lg p-6 max-h-[32rem] overflow-y-auto">
              <h3 className="text-lg font-semibold text-foreground mb-4">検索結果</h3>
              
              {loadingSearch && (
                <div className="text-center py-4">
                  <p className="text-muted-foreground">検索中...</p>
                </div>
              )}

              {!loadingSearch && categorizedResults && (
                <>
                  {/* Restaurants Section */}
                  {safeCategorizedResults.restaurants.length > 0 && (
                    <div className="mb-6">
                      <h4 className="text-base font-semibold text-foreground mb-3 pb-2 border-b">
                        レストラン ({safeCategorizedResults.restaurants.length})
                      </h4>
                      <div className="grid grid-cols-3 gap-4">
                        {safeCategorizedResults.restaurants.slice(0, 6).map((restaurant) => (
                          <div 
                            key={restaurant.restaurantId}
                            className="flex flex-col cursor-pointer hover:bg-muted/50 p-2 rounded-lg transition-colors"
                            onClick={() => router.push(`/restaurant/${restaurant.restaurantId}`)}
                          >
                            <img
                              src={restaurant.imageUrl || availableImages[0]}
                              alt={restaurant.restaurantName}
                              className="w-full h-24 rounded-lg object-cover bg-muted mb-2"
                            />
                            <p className="text-sm font-medium text-foreground truncate">{restaurant.restaurantName}</p>
                            <p className="text-xs text-muted-foreground">
                              {(() => {
                                const d = searchRestaurantDistanceOverrides[restaurant.restaurantId] ?? restaurant.distance
                                return d >= 1000 ? `${(d / 1000).toFixed(1)}km` : `${d}m`
                              })()}
                            </p>
                          </div>
                        ))}
                      </div>
                      {safeCategorizedResults.restaurants.length > 6 && (
                        <div className="text-center mt-3">
                          <button
                            onClick={handleSearch}
                            className="text-sm text-yellow-600 hover:text-yellow-700 font-medium"
                          >
                            もっと見る →
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Dishes By Name Section */}
                  {safeCategorizedResults.dishesByName.length > 0 && (
                    <div className="mb-6">
                      <h4 className="text-base font-semibold text-foreground mb-3 pb-2 border-b">
                        料理 ({safeCategorizedResults.dishesByName.length})
                      </h4>
                      <div className="grid grid-cols-3 gap-4">
                        {safeCategorizedResults.dishesByName.slice(0, 6).map((dish) => (
                          <div 
                            key={dish.dishRestaurantId}
                            className="flex flex-col cursor-pointer hover:bg-muted/50 p-2 rounded-lg transition-colors"
                            onClick={() => router.push(`/dish/${dish.dishRestaurantId}`)}
                          >
                            <img
                              src={dish.imageUrl || availableImages[0]}
                              alt={dish.dishName}
                              className="w-full h-24 rounded-lg object-cover bg-muted mb-2"
                            />
                            <p className="text-sm font-medium text-foreground truncate">{dish.dishName}</p>
                            <p className="text-xs text-muted-foreground truncate">{dish.restaurantName}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-yellow-500">★ {dish.rating.toFixed(1)}</span>
                              <span className="text-xs text-green-600 font-semibold">{formatPrice(dish.price)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                      {safeCategorizedResults.dishesByName.length > 6 && (
                        <div className="text-center mt-3">
                          <button
                            onClick={handleSearch}
                            className="text-sm text-yellow-600 hover:text-yellow-700 font-medium"
                          >
                            もっと見る →
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Dishes By Ingredients Section */}
                  {safeCategorizedResults.dishesByIngredients.length > 0 && (
                    <div className="mb-6">
                      <h4 className="text-base font-semibold text-foreground mb-3 pb-2 border-b">
                        材料が含まれる料理 ({safeCategorizedResults.dishesByIngredients.length})
                      </h4>
                      <div className="grid grid-cols-3 gap-4">
                        {safeCategorizedResults.dishesByIngredients.slice(0, 6).map((dish) => (
                          <div 
                            key={dish.dishRestaurantId}
                            className="flex flex-col cursor-pointer hover:bg-muted/50 p-2 rounded-lg transition-colors"
                            onClick={() => router.push(`/dish/${dish.dishRestaurantId}`)}
                          >
                            <img
                              src={dish.imageUrl || availableImages[0]}
                              alt={dish.dishName}
                              className="w-full h-24 rounded-lg object-cover bg-muted mb-2"
                            />
                            <p className="text-sm font-medium text-foreground truncate">{dish.dishName}</p>
                            <p className="text-xs text-muted-foreground truncate">{dish.restaurantName}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-yellow-500">★ {dish.rating.toFixed(1)}</span>
                              <span className="text-xs text-green-600 font-semibold">{formatPrice(dish.price)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                      {safeCategorizedResults.dishesByIngredients.length > 6 && (
                        <div className="text-center mt-3">
                          <button
                            onClick={handleSearch}
                            className="text-sm text-yellow-600 hover:text-yellow-700 font-medium"
                          >
                            もっと見る →
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* No results message */}
                  {safeCategorizedResults.restaurants.length === 0 && 
                   safeCategorizedResults.dishesByName.length === 0 && 
                   safeCategorizedResults.dishesByIngredients.length === 0 && (
                    <div className="text-center py-4">
                      <p className="text-muted-foreground">検索結果が見つかりませんでした</p>
                    </div>
                  )}
                </>
              )}

              {!loadingSearch && !categorizedResults && searchQuery.trim().length > 0 && (
                <div className="text-center py-4">
                  <p className="text-muted-foreground">検索結果が見つかりませんでした</p>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Popular Dishes Ranking */}
        {!showSearchResults && (
          <PopularDishesRanking dishes={popularDishes} availableImages={availableImages} loading={loadingDishes} />
        )}

        {/* Favorites List */}
        {!showSearchResults && (
          <FavoriteList dishes={favoriteDishes} availableImages={availableImages} loading={loadingFavorites} />
        )}

        {/* Nearby Restaurants */}
        {!showSearchResults && (
          <NearbyRestaurants 
            restaurants={nearbyRestaurantsUserSorted ?? nearbyRestaurants}
            availableImages={availableImages} 
            loading={loadingRestaurants}
            currentPage={nearbyCurrentPage}
            totalPages={nearbyTotalPages}
            onPageChange={(page) => fetchNearbyRestaurants(page, false)}
          />
        )}

        {/* Recommended Dishes */}
        {!showSearchResults && (
          <div ref={recommendedRef}>
            <RecommendedDishes 
              dishes={recommendedDishes} 
              availableImages={availableImages} 
              loading={loadingRecommended}
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-muted py-8 px-6 text-center text-sm text-muted-foreground">
        <p>© 2025 ベトめしガイド. All rights reserved.</p>
      </footer>

      {/* Floating Chat Bubble */}
      <button
        onClick={() => setShowAISupport(!showAISupport)}
        className="fixed bottom-8 right-8 w-16 h-16 bg-yellow-400 hover:bg-yellow-500 rounded-full shadow-lg hover:shadow-xl flex items-center justify-center transition-all hover:scale-110 z-30"
        aria-label="AI food recommendation support"
      >
        <MessageCircle className="w-8 h-8 text-white" />
      </button>

      {/* AI Support Modal */}
      <AISupportModal 
        isOpen={showAISupport} 
        onClose={() => setShowAISupport(!showAISupport)} 
      />
    </div>
  )
}
