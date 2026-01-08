"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Search, Filter, MessageCircle, ChevronDown, ChevronUp } from "lucide-react";
import { DishCard } from "@/components/DishCard";
import { TopHeader } from "@/components/TopHeader";
import { CustomInput } from "@/components/ui/custom-input";
import { AISupportModal } from "@/components/AISupportModal";
import { searchApi } from "@/api/api";
import type { CategorizedSearchData, SearchDishResult, RestaurantSearchResult } from "@/api/types";
import { useUserLocation } from "@/components/UserLocationProvider";
import { getRestaurantDistanceMetersWithCache, mapWithConcurrency } from "@/lib/vietmapDistance";

export default function SearchPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialQuery = searchParams.get("q") || "";

  const { location } = useUserLocation();

  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [appliedSearchQuery, setAppliedSearchQuery] = useState(initialQuery);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAISupport, setShowAISupport] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Categorized results
  const [categorizedResults, setCategorizedResults] = useState<CategorizedSearchData | null>(null);
  
  // Dropdown suggestions
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionResults, setSuggestionResults] = useState<CategorizedSearchData | null>(null);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  // Restaurant filters
  const [restaurantSortBy, setRestaurantSortBy] = useState<"nearest" | "farthest">("nearest");
  const [showRestaurantFilter, setShowRestaurantFilter] = useState(false);

  const [restaurantDistanceOverrides, setRestaurantDistanceOverrides] = useState<Record<number, number>>({});
  const [suggestionRestaurantDistanceOverrides, setSuggestionRestaurantDistanceOverrides] = useState<Record<number, number>>({});

  // Dish filters (for both dishesByName and dishesByIngredients)
  const [dishNameFilters, setDishNameFilters] = useState({
    ratings: [] as number[],
    priceLevels: [] as string[],
    sortBy: "rating-desc" as "rating-desc" | "rating-asc" | "price-desc" | "price-asc"
  });
  const [dishIngredientFilters, setDishIngredientFilters] = useState({
    ratings: [] as number[],
    priceLevels: [] as string[],
    sortBy: "rating-desc" as "rating-desc" | "rating-asc" | "price-desc" | "price-asc"
  });
  const [showDishNameFilter, setShowDishNameFilter] = useState(false);
  const [showDishIngredientFilter, setShowDishIngredientFilter] = useState(false);

  // Pagination state
  const [restaurantPage, setRestaurantPage] = useState(1);
  const [dishNamePage, setDishNamePage] = useState(1);
  const [dishIngredientPage, setDishIngredientPage] = useState(1);
  const itemsPerPage = 6;

  // Auto search if initial query exists
  useEffect(() => {
    if (initialQuery) {
      performSearch(initialQuery);
    }
  }, [initialQuery]);

  // Fetch search suggestions with debounce
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!searchQuery.trim() || searchQuery === appliedSearchQuery) {
        setSuggestionResults(null);
        return;
      }

      setLoadingSuggestions(true);
      try {
        const result = await searchApi.searchCategorized(searchQuery.trim());
        if (result.status === 'success' && result.data) {
          setSuggestionResults(result.data);
        } else {
          setSuggestionResults(null);
        }
      } catch (error) {
        console.error('Error fetching suggestions:', error);
        setSuggestionResults(null);
      } finally {
        setLoadingSuggestions(false);
      }
    };

    // Debounce search - wait 300ms after user stops typing
    const timeoutId = setTimeout(() => {
      fetchSuggestions();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, appliedSearchQuery]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    if (showSuggestions) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showSuggestions]);

  // Convert price to price level
  const getPriceLevel = (price: number): string => {
    if (price < 30000) return "$";
    if (price < 60000) return "$$";
    return "$$$";
  };

  // Format price
  const formatPrice = (price: number): string => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const formatDistance = (meters: number) => {
    return meters >= 1000 ? `${(meters / 1000).toFixed(1)}km` : `${meters}m`;
  };

  // Perform search using API
  const performSearch = async (keyword: string) => {
    if (!keyword.trim()) {
      setCategorizedResults(null);
      return;
    }

    setLoading(true);
    setError(null);
    
    // Reset all pagination when performing new search
    setRestaurantPage(1);
    setDishNamePage(1);
    setDishIngredientPage(1);

    try {
      const response = await searchApi.searchCategorized(keyword);

      if (response.status === "success" && response.data) {
        setCategorizedResults(response.data);
      } else {
        setError(response.message || "検索結果が見つかりませんでした");
        setCategorizedResults(null);
      }
    } catch (err: any) {
      console.error("Search error:", err);
      setError(err.message || "検索中にエラーが発生しました");
      setCategorizedResults(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setAppliedSearchQuery(searchQuery);
    setShowSuggestions(false);
    performSearch(searchQuery);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    setShowSuggestions(value.trim().length > 0);
  };

  // Filter and sort restaurants
  const filteredRestaurants = categorizedResults?.restaurants
    ? [...categorizedResults.restaurants].sort((a, b) => {
        const da = restaurantDistanceOverrides[a.restaurantId] ?? a.distance;
        const db = restaurantDistanceOverrides[b.restaurantId] ?? b.distance;
        if (restaurantSortBy === "nearest") {
          return da - db;
        } else {
          return db - da;
        }
      })
    : [];

  useEffect(() => {
    const run = async () => {
      if (!location) return;
      if (!categorizedResults?.restaurants || categorizedResults.restaurants.length === 0) return;

      try {
        const list = categorizedResults.restaurants;
        const meters = await mapWithConcurrency(list, 3, async (r) => {
          try {
            return await getRestaurantDistanceMetersWithCache({
              origin: { lat: location.lat, lng: location.lng },
              restaurantId: r.restaurantId,
              restaurantName: r.restaurantName,
              restaurantAddress: r.address,
              fallbackDistanceMeters: r.distance,
            });
          } catch {
            return r.distance;
          }
        });

        const next: Record<number, number> = {};
        for (let i = 0; i < list.length; i++) {
          next[list[i].restaurantId] = meters[i];
        }
        setRestaurantDistanceOverrides(next);
      } catch {
        // keep backend distances
      }
    };

    run();
  }, [location, categorizedResults]);

  useEffect(() => {
    const run = async () => {
      if (!location) {
        setSuggestionRestaurantDistanceOverrides({});
        return;
      }
      if (!suggestionResults?.restaurants || suggestionResults.restaurants.length === 0) {
        setSuggestionRestaurantDistanceOverrides({});
        return;
      }

      try {
        const list = suggestionResults.restaurants.slice(0, 6);
        const meters = await mapWithConcurrency(list, 3, async (r) => {
          try {
            return await getRestaurantDistanceMetersWithCache({
              origin: { lat: location.lat, lng: location.lng },
              restaurantId: r.restaurantId,
              restaurantName: r.restaurantName,
              restaurantAddress: r.address,
              fallbackDistanceMeters: r.distance,
            });
          } catch {
            return r.distance;
          }
        });

        const next: Record<number, number> = {};
        for (let i = 0; i < list.length; i++) {
          next[list[i].restaurantId] = meters[i];
        }
        setSuggestionRestaurantDistanceOverrides(next);
      } catch {
        // keep backend distances
      }
    };

    run();
  }, [location, suggestionResults]);

  // Filter and sort dishes by name
  const filteredDishesByName = categorizedResults?.dishesByName
    ? [...categorizedResults.dishesByName]
        .filter((dish) => {
          // Filter by rating
          if (dishNameFilters.ratings.length > 0) {
            const dishRating = Math.floor(dish.rating);
            const matchesRating = dishNameFilters.ratings.some((rating) => {
              if (rating === 4) return dishRating >= 4;
              if (rating === 3) return dishRating >= 3 && dishRating < 4;
              if (rating === 2) return dishRating >= 2 && dishRating < 3;
              if (rating === 1) return dishRating >= 1 && dishRating < 2;
              return false;
            });
            if (!matchesRating) return false;
          }

          // Filter by price level
          if (dishNameFilters.priceLevels.length > 0) {
            const priceLevel = getPriceLevel(dish.price);
            if (!dishNameFilters.priceLevels.includes(priceLevel)) return false;
          }

          return true;
        })
        .sort((a, b) => {
          if (dishNameFilters.sortBy === "rating-desc") return b.rating - a.rating;
          if (dishNameFilters.sortBy === "rating-asc") return a.rating - b.rating;
          if (dishNameFilters.sortBy === "price-desc") return b.price - a.price;
          if (dishNameFilters.sortBy === "price-asc") return a.price - b.price;
          return 0;
        })
    : [];

  // Filter and sort dishes by ingredients
  const filteredDishesByIngredients = categorizedResults?.dishesByIngredients
    ? [...categorizedResults.dishesByIngredients]
        .filter((dish) => {
          // Filter by rating
          if (dishIngredientFilters.ratings.length > 0) {
            const dishRating = Math.floor(dish.rating);
            const matchesRating = dishIngredientFilters.ratings.some((rating) => {
              if (rating === 4) return dishRating >= 4;
              if (rating === 3) return dishRating >= 3 && dishRating < 4;
              if (rating === 2) return dishRating >= 2 && dishRating < 3;
              if (rating === 1) return dishRating >= 1 && dishRating < 2;
              return false;
            });
            if (!matchesRating) return false;
          }

          // Filter by price level
          if (dishIngredientFilters.priceLevels.length > 0) {
            const priceLevel = getPriceLevel(dish.price);
            if (!dishIngredientFilters.priceLevels.includes(priceLevel)) return false;
          }

          return true;
        })
        .sort((a, b) => {
          if (dishIngredientFilters.sortBy === "rating-desc") return b.rating - a.rating;
          if (dishIngredientFilters.sortBy === "rating-asc") return a.rating - b.rating;
          if (dishIngredientFilters.sortBy === "price-desc") return b.price - a.price;
          if (dishIngredientFilters.sortBy === "price-asc") return a.price - b.price;
          return 0;
        })
    : [];

  const toggleDishNameRating = (rating: number) => {
    setDishNameFilters((prev) => ({
      ...prev,
      ratings: prev.ratings.includes(rating)
        ? prev.ratings.filter((r) => r !== rating)
        : [...prev.ratings, rating],
    }));
  };

  const toggleDishNamePriceLevel = (level: string) => {
    setDishNameFilters((prev) => ({
      ...prev,
      priceLevels: prev.priceLevels.includes(level)
        ? prev.priceLevels.filter((l) => l !== level)
        : [...prev.priceLevels, level],
    }));
  };

  const toggleDishIngredientRating = (rating: number) => {
    setDishIngredientFilters((prev) => ({
      ...prev,
      ratings: prev.ratings.includes(rating)
        ? prev.ratings.filter((r) => r !== rating)
        : [...prev.ratings, rating],
    }));
  };

  const toggleDishIngredientPriceLevel = (level: string) => {
    setDishIngredientFilters((prev) => ({
      ...prev,
      priceLevels: prev.priceLevels.includes(level)
        ? prev.priceLevels.filter((l) => l !== level)
        : [...prev.priceLevels, level],
    }));
  };

  // Reset pagination when filters change
  const toggleDishNameRatingWithReset = (rating: number) => {
    toggleDishNameRating(rating);
    setDishNamePage(1);
  };

  const toggleDishNamePriceLevelWithReset = (level: string) => {
    toggleDishNamePriceLevel(level);
    setDishNamePage(1);
  };

  const toggleDishIngredientRatingWithReset = (rating: number) => {
    toggleDishIngredientRating(rating);
    setDishIngredientPage(1);
  };

  const toggleDishIngredientPriceLevelWithReset = (level: string) => {
    toggleDishIngredientPriceLevel(level);
    setDishIngredientPage(1);
  };

  // Pagination helper
  const getPaginatedItems = <T,>(items: T[], page: number): T[] => {
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return items.slice(startIndex, endIndex);
  };

  const getTotalPages = (totalItems: number): number => {
    return Math.ceil(totalItems / itemsPerPage);
  };

  // Pagination component
  const Pagination = ({ 
    currentPage, 
    totalPages, 
    onPageChange 
  }: { 
    currentPage: number; 
    totalPages: number; 
    onPageChange: (page: number) => void;
  }) => {
    if (totalPages <= 1) return null;

    const getPageNumbers = () => {
      const pages: (number | string)[] = [];
      const maxVisible = 5;

      if (totalPages <= maxVisible) {
        for (let i = 1; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        if (currentPage <= 3) {
          for (let i = 1; i <= 4; i++) pages.push(i);
          pages.push('...');
          pages.push(totalPages);
        } else if (currentPage >= totalPages - 2) {
          pages.push(1);
          pages.push('...');
          for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
        } else {
          pages.push(1);
          pages.push('...');
          pages.push(currentPage - 1);
          pages.push(currentPage);
          pages.push(currentPage + 1);
          pages.push('...');
          pages.push(totalPages);
        }
      }

      return pages;
    };

    return (
      <div className="flex items-center justify-center gap-2 mt-6">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-3 py-1 rounded-md border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          前へ
        </button>
        
        {getPageNumbers().map((page, index) => (
          page === '...' ? (
            <span key={`ellipsis-${index}`} className="px-2 text-gray-500">...</span>
          ) : (
            <button
              key={page}
              onClick={() => onPageChange(page as number)}
              className={`px-3 py-1 rounded-md text-sm font-medium ${
                currentPage === page
                  ? 'bg-yellow-500 text-white'
                  : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              {page}
            </button>
          )
        ))}
        
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="px-3 py-1 rounded-md border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          次へ
        </button>
      </div>
    );
  };

  const renderStars = (count: number) => {
    return (
      <div className="flex items-center gap-1">
        {[...Array(count)].map((_, i) => (
          <span key={i} className="text-yellow-500 text-xl">
            ★
          </span>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <TopHeader />

      <div className="container mx-auto px-4 py-6">
        {/* Search Bar */}
        <div className="mb-6">
          <div className="flex gap-2" ref={searchRef}>
            <div className="relative flex-1">
              <CustomInput
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
                onKeyPress={handleKeyPress}
                onFocus={() => setShowSuggestions(searchQuery.trim().length > 0)}
                placeholder="食べたい料理や行きたい場所を入力..."
                className="pl-12 pr-4"
                disabled={loading}
              />
              <button
                onClick={handleSearch}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Search"
                disabled={loading}
              >
                <Search className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Dropdown Suggestions */}
          {showSuggestions && searchQuery !== appliedSearchQuery && (
            <div className="mt-2 bg-white border rounded-lg shadow-lg p-6 max-h-[32rem] overflow-y-auto relative z-50">
              <h3 className="text-lg font-semibold text-foreground mb-4">検索結果</h3>
              
              {loadingSuggestions && (
                <div className="text-center py-4">
                  <p className="text-muted-foreground">検索中...</p>
        </div>
              )}

              {!loadingSuggestions && suggestionResults && (
                <>
                  {/* Restaurants Section */}
                  {suggestionResults.restaurants.length > 0 && (
                    <div className="mb-6">
                      <h4 className="text-base font-semibold text-foreground mb-3 pb-2 border-b">
                        レストラン ({suggestionResults.restaurants.length})
                      </h4>
                      <div className="grid grid-cols-3 gap-4">
                        {suggestionResults.restaurants.slice(0, 6).map((restaurant) => (
                          <div 
                            key={restaurant.restaurantId}
                            className="flex flex-col cursor-pointer hover:bg-muted/50 p-2 rounded-lg transition-colors"
                            onClick={() => {
                              router.push(`/restaurant/${restaurant.restaurantId}`);
                              setShowSuggestions(false);
                            }}
                          >
                            <img
                              src={restaurant.imageUrl || "/pho-noodle-soup-authentic-vietnamese.jpg"}
                              alt={restaurant.restaurantName}
                              className="w-full h-24 rounded-lg object-cover bg-muted mb-2"
                            />
                            <p className="text-sm font-medium text-foreground truncate">{restaurant.restaurantName}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatDistance(
                                suggestionRestaurantDistanceOverrides[restaurant.restaurantId] ?? restaurant.distance
                              )}
                            </p>
                          </div>
                        ))}
                      </div>
                      {suggestionResults.restaurants.length > 6 && (
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
                  {suggestionResults.dishesByName.length > 0 && (
            <div className="mb-6">
                      <h4 className="text-base font-semibold text-foreground mb-3 pb-2 border-b">
                        料理 ({suggestionResults.dishesByName.length})
                      </h4>
                      <div className="grid grid-cols-3 gap-4">
                        {suggestionResults.dishesByName.slice(0, 6).map((dish) => (
                          <div 
                            key={dish.dishRestaurantId}
                            className="flex flex-col cursor-pointer hover:bg-muted/50 p-2 rounded-lg transition-colors"
                            onClick={() => {
                              router.push(`/dish/${dish.dishRestaurantId}`);
                              setShowSuggestions(false);
                            }}
                          >
                            <img
                              src={dish.imageUrl || "/pho-noodle-soup-authentic-vietnamese.jpg"}
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
                      {suggestionResults.dishesByName.length > 6 && (
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
                  {suggestionResults.dishesByIngredients.length > 0 && (
                    <div className="mb-6">
                      <h4 className="text-base font-semibold text-foreground mb-3 pb-2 border-b">
                        材料が含まれる料理 ({suggestionResults.dishesByIngredients.length})
                      </h4>
                      <div className="grid grid-cols-3 gap-4">
                        {suggestionResults.dishesByIngredients.slice(0, 6).map((dish) => (
                          <div 
                            key={dish.dishRestaurantId}
                            className="flex flex-col cursor-pointer hover:bg-muted/50 p-2 rounded-lg transition-colors"
                            onClick={() => {
                              router.push(`/dish/${dish.dishRestaurantId}`);
                              setShowSuggestions(false);
                            }}
                          >
                            <img
                              src={dish.imageUrl || "/pho-noodle-soup-authentic-vietnamese.jpg"}
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
                      {suggestionResults.dishesByIngredients.length > 6 && (
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
                  {suggestionResults.restaurants.length === 0 && 
                   suggestionResults.dishesByName.length === 0 && 
                   suggestionResults.dishesByIngredients.length === 0 && (
                    <div className="text-center py-4">
                      <p className="text-muted-foreground">検索結果が見つかりませんでした</p>
                    </div>
                  )}
                </>
              )}

              {!loadingSuggestions && !suggestionResults && searchQuery.trim().length > 0 && (
                <div className="text-center py-4">
                  <p className="text-muted-foreground">検索結果が見つかりませんでした</p>
                </div>
              )}
            </div>
          )}
          </div>

        <div className="space-y-8">
            {loading && (
              <div className="text-center py-12">
                <p className="text-gray-500 text-lg">検索中...</p>
              </div>
            )}

            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800">{error}</p>
              </div>
            )}

            {!loading && appliedSearchQuery && (
              <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-yellow-800">
                  「<span className="font-semibold">{appliedSearchQuery}</span>
                  」の検索結果
                </p>
              </div>
            )}

          {/* Restaurants Section */}
          {!loading && categorizedResults?.restaurants && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-yellow-600">
                  レストラン ({filteredRestaurants.length}件)
                </h2>
                <button
                  onClick={() => setShowRestaurantFilter(!showRestaurantFilter)}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  <Filter className="w-4 h-4" />
                  <span className="text-sm">フィルター</span>
                  {showRestaurantFilter ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </div>

              {/* Restaurant Filter Panel */}
              {showRestaurantFilter && (
                <div className="mb-4 p-4 bg-gray-50 rounded-lg border">
                  <h3 className="text-sm font-semibold mb-3 text-gray-800">並び替え</h3>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={restaurantSortBy === "nearest"}
                        onChange={() => {
                          setRestaurantSortBy("nearest");
                          setRestaurantPage(1);
                        }}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">近い順</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={restaurantSortBy === "farthest"}
                        onChange={() => {
                          setRestaurantSortBy("farthest");
                          setRestaurantPage(1);
                        }}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">遠い順</span>
                    </label>
                  </div>
                </div>
              )}

              {filteredRestaurants.length > 0 ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {getPaginatedItems(filteredRestaurants, restaurantPage).map((restaurant) => (
                      <a
                        key={restaurant.restaurantId}
                        href={`/restaurant/${restaurant.restaurantId}`}
                        className="group cursor-pointer"
                      >
                        <div className="bg-white rounded-lg overflow-hidden shadow hover:shadow-lg transition-shadow">
                          <img
                            src={restaurant.imageUrl || "/pho-noodle-soup-authentic-vietnamese.jpg"}
                            alt={restaurant.restaurantName}
                            className="w-full h-48 object-cover"
                          />
                          <div className="p-4">
                            <h3 className="font-semibold text-gray-800 mb-2 group-hover:text-yellow-600 transition-colors">
                              {restaurant.restaurantName}
                            </h3>
                            <p className="text-sm text-gray-500 mb-2 line-clamp-1">{restaurant.address}</p>
                            <p className="text-sm text-gray-600">
                              📍 {formatDistance(restaurantDistanceOverrides[restaurant.restaurantId] ?? restaurant.distance)}
                            </p>
                          </div>
                        </div>
                      </a>
                    ))}
                  </div>
                  <Pagination
                    currentPage={restaurantPage}
                    totalPages={getTotalPages(filteredRestaurants.length)}
                    onPageChange={setRestaurantPage}
                  />
                </>
              ) : (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <p className="text-gray-500">フィルター条件に一致するレストランが見つかりませんでした</p>
                </div>
              )}
            </div>
          )}

          {/* Dishes By Name Section */}
          {!loading && categorizedResults?.dishesByName && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-yellow-600">
                  料理 ({filteredDishesByName.length}件)
                </h2>
                <button
                  onClick={() => setShowDishNameFilter(!showDishNameFilter)}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  <Filter className="w-4 h-4" />
                  <span className="text-sm">フィルター</span>
                  {showDishNameFilter ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </div>

              {/* Dish Name Filter Panel */}
              {showDishNameFilter && (
                <div className="mb-4 p-4 bg-gray-50 rounded-lg border space-y-4">
                  {/* Rating Filter */}
                  <div>
                    <h3 className="text-sm font-semibold mb-3 text-gray-800">評価</h3>
                    <div className="space-y-2">
                      {[5, 4, 3, 2, 1].map((rating) => (
                        <label key={rating} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={dishNameFilters.ratings.includes(rating)}
                            onChange={() => toggleDishNameRatingWithReset(rating)}
                            className="w-4 h-4"
                          />
                          {renderStars(rating)}
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Price Filter */}
                  <div>
                    <h3 className="text-sm font-semibold mb-3 text-gray-800">価格</h3>
                    <div className="space-y-2">
                      {[
                        { level: "$", label: "30,000ドン未満" },
                        { level: "$$", label: "30,000ドン - 60,000ドン" },
                        { level: "$$$", label: "60,000ドン以上" },
                      ].map(({ level, label }) => (
                        <label key={level} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={dishNameFilters.priceLevels.includes(level)}
                            onChange={() => toggleDishNamePriceLevelWithReset(level)}
                            className="w-4 h-4"
                          />
                          <span className="text-sm">{label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Sort By */}
                  <div>
                    <h3 className="text-sm font-semibold mb-3 text-gray-800">並び替え</h3>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          checked={dishNameFilters.sortBy === "rating-desc"}
                          onChange={() => {
                            setDishNameFilters((prev) => ({ ...prev, sortBy: "rating-desc" }));
                            setDishNamePage(1);
                          }}
                          className="w-4 h-4"
                        />
                        <span className="text-sm">評価が高い順</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          checked={dishNameFilters.sortBy === "rating-asc"}
                          onChange={() => {
                            setDishNameFilters((prev) => ({ ...prev, sortBy: "rating-asc" }));
                            setDishNamePage(1);
                          }}
                          className="w-4 h-4"
                        />
                        <span className="text-sm">評価が低い順</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          checked={dishNameFilters.sortBy === "price-desc"}
                          onChange={() => {
                            setDishNameFilters((prev) => ({ ...prev, sortBy: "price-desc" }));
                            setDishNamePage(1);
                          }}
                          className="w-4 h-4"
                        />
                        <span className="text-sm">価格が高い順</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          checked={dishNameFilters.sortBy === "price-asc"}
                          onChange={() => {
                            setDishNameFilters((prev) => ({ ...prev, sortBy: "price-asc" }));
                            setDishNamePage(1);
                          }}
                          className="w-4 h-4"
                        />
                        <span className="text-sm">価格が安い順</span>
                      </label>
                    </div>
                  </div>
              </div>
            )}

              {filteredDishesByName.length > 0 ? (
                <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {getPaginatedItems(filteredDishesByName, dishNamePage).map((dish) => (
                  <DishCard
                        key={dish.dishRestaurantId}
                        id={dish.dishRestaurantId}
                    imageUrl={dish.imageUrl}
                        name={dish.dishName}
                        rate={dish.rating}
                    price={dish.price}
                        restaurant={dish.restaurantName}
                    variant="search"
                      />
                    ))}
                  </div>
                  <Pagination
                    currentPage={dishNamePage}
                    totalPages={getTotalPages(filteredDishesByName.length)}
                    onPageChange={setDishNamePage}
                  />
                </>
              ) : (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <p className="text-gray-500">フィルター条件に一致する料理が見つかりませんでした</p>
                </div>
              )}
            </div>
          )}

          {/* Dishes By Ingredients Section */}
          {!loading && categorizedResults?.dishesByIngredients && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-yellow-600">
                  材料が含まれる料理 ({filteredDishesByIngredients.length}件)
                </h2>
                <button
                  onClick={() => setShowDishIngredientFilter(!showDishIngredientFilter)}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  <Filter className="w-4 h-4" />
                  <span className="text-sm">フィルター</span>
                  {showDishIngredientFilter ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </div>

              {/* Dish Ingredient Filter Panel */}
              {showDishIngredientFilter && (
                <div className="mb-4 p-4 bg-gray-50 rounded-lg border space-y-4">
                  {/* Rating Filter */}
                  <div>
                    <h3 className="text-sm font-semibold mb-3 text-gray-800">評価</h3>
                    <div className="space-y-2">
                      {[5, 4, 3, 2, 1].map((rating) => (
                        <label key={rating} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={dishIngredientFilters.ratings.includes(rating)}
                            onChange={() => toggleDishIngredientRatingWithReset(rating)}
                            className="w-4 h-4"
                          />
                          {renderStars(rating)}
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Price Filter */}
                  <div>
                    <h3 className="text-sm font-semibold mb-3 text-gray-800">価格</h3>
                    <div className="space-y-2">
                      {[
                        { level: "$", label: "30,000ドン未満" },
                        { level: "$$", label: "30,000ドン - 60,000ドン" },
                        { level: "$$$", label: "60,000ドン以上" },
                      ].map(({ level, label }) => (
                        <label key={level} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={dishIngredientFilters.priceLevels.includes(level)}
                            onChange={() => toggleDishIngredientPriceLevelWithReset(level)}
                            className="w-4 h-4"
                          />
                          <span className="text-sm">{label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Sort By */}
                  <div>
                    <h3 className="text-sm font-semibold mb-3 text-gray-800">並び替え</h3>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          checked={dishIngredientFilters.sortBy === "rating-desc"}
                          onChange={() => {
                            setDishIngredientFilters((prev) => ({ ...prev, sortBy: "rating-desc" }));
                            setDishIngredientPage(1);
                          }}
                          className="w-4 h-4"
                        />
                        <span className="text-sm">評価が高い順</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          checked={dishIngredientFilters.sortBy === "rating-asc"}
                          onChange={() => {
                            setDishIngredientFilters((prev) => ({ ...prev, sortBy: "rating-asc" }));
                            setDishIngredientPage(1);
                          }}
                          className="w-4 h-4"
                        />
                        <span className="text-sm">評価が低い順</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          checked={dishIngredientFilters.sortBy === "price-desc"}
                          onChange={() => {
                            setDishIngredientFilters((prev) => ({ ...prev, sortBy: "price-desc" }));
                            setDishIngredientPage(1);
                          }}
                          className="w-4 h-4"
                        />
                        <span className="text-sm">価格が高い順</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          checked={dishIngredientFilters.sortBy === "price-asc"}
                          onChange={() => {
                            setDishIngredientFilters((prev) => ({ ...prev, sortBy: "price-asc" }));
                            setDishIngredientPage(1);
                          }}
                          className="w-4 h-4"
                        />
                        <span className="text-sm">価格が安い順</span>
                      </label>
                    </div>
                  </div>
              </div>
            )}

              {filteredDishesByIngredients.length > 0 ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {getPaginatedItems(filteredDishesByIngredients, dishIngredientPage).map((dish) => (
                      <DishCard
                        key={dish.dishRestaurantId}
                        id={dish.dishRestaurantId}
                        imageUrl={dish.imageUrl}
                        name={dish.dishName}
                        rate={dish.rating}
                        price={dish.price}
                        restaurant={dish.restaurantName}
                        variant="search"
                      />
                    ))}
                  </div>
                  <Pagination
                    currentPage={dishIngredientPage}
                    totalPages={getTotalPages(filteredDishesByIngredients.length)}
                    onPageChange={setDishIngredientPage}
                  />
                </>
              ) : (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <p className="text-gray-500">フィルター条件に一致する料理が見つかりませんでした</p>
                </div>
              )}
            </div>
          )}

          {/* No Results */}
            {!loading &&
              !error &&
            filteredRestaurants.length === 0 &&
            filteredDishesByName.length === 0 &&
            filteredDishesByIngredients.length === 0 &&
              appliedSearchQuery && (
                <div className="text-center py-12">
                  <p className="text-gray-500 text-lg">
                  検索条件に一致する結果が見つかりませんでした
                  </p>
                </div>
              )}

            {!loading && !appliedSearchQuery && (
              <div className="text-center py-12">
                <p className="text-gray-500 text-lg">
                料理名やレストラン名、材料を入力して検索してください
                </p>
              </div>
            )}
        </div>
      </div>

      {/* AI Support Chat Bubble */}
      <button
        onClick={() => setShowAISupport(!showAISupport)}
        className="fixed bottom-8 right-8 w-16 h-16 bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600 rounded-full shadow-lg hover:shadow-xl flex items-center justify-center transition-all hover:scale-110 z-30"
        aria-label="AI food recommendation support"
      >
        <MessageCircle className="w-8 h-8 text-white" />
      </button>

      {/* AI Support Modal */}
      <AISupportModal
        isOpen={showAISupport}
        onClose={() => setShowAISupport(false)}
      />
    </div>
  );
}
