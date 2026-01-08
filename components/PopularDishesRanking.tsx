"use client"

import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { DishCard } from "./DishCard"

interface Dish {
  id: number
  imageUrl: string
  name: string
  likes: number
  description: string
}

interface PopularDishesRankingProps {
  dishes: Dish[]
  availableImages: string[]
  loading?: boolean
}

export function PopularDishesRanking({ dishes, availableImages, loading = false }: PopularDishesRankingProps) {
  if (loading) {
    return (
      <section className="mb-16">
        <div className="flex justify-between items-center mb-20">
          <h3 className="text-xl font-semibold text-foreground">人気料理ランキング</h3>
          <Link href="/ranking" className="text-primary text-sm font-medium flex items-center gap-1 hover:text-primary/80 transition-colors">
            詳細 <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </section>
    )
  }

  if (dishes.length === 0) {
    return (
      <section className="mb-16">
        <div className="flex justify-between items-center mb-20">
          <h3 className="text-xl font-semibold text-foreground">人気料理ランキング</h3>
          <Link href="/ranking" className="text-primary text-sm font-medium flex items-center gap-1 hover:text-primary/80 transition-colors">
            詳細 <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="text-center py-20 text-muted-foreground">
          人気料理が見つかりませんでした
        </div>
      </section>
    )
  }

  return (
    <section className="mb-16">
      <div className="flex justify-between items-center mb-20">
        <h3 className="text-xl font-semibold text-foreground">人気料理ランキング</h3>
        <Link href="/ranking" className="text-primary text-sm font-medium flex items-center gap-1 hover:text-primary/80 transition-colors">
          詳細 <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="relative">
        <div className="flex flex-row items-end justify-center gap-6 mb-8 px-4">
          {dishes.length >= 3 ? (
            // Reorder: #2 on left, #1 in middle (taller), #3 on right
            <>
              <div className="w-[200px]">
                <DishCard
                  key={dishes[1].id}
                  id={dishes[1].id}
                  imageUrl={dishes[1].imageUrl}
                  name={dishes[1].name}
                  likes={dishes[1].likes}
                  rank={2}
                  availableImages={availableImages}
                  isFirstPlace={false}
                  variant="ranking"
                />
              </div>
              <div className="w-[240px] -mt-8">
                <DishCard
                  key={dishes[0].id}
                  id={dishes[0].id}
                  imageUrl={dishes[0].imageUrl}
                  name={dishes[0].name}
                  likes={dishes[0].likes}
                  rank={1}
                  availableImages={availableImages}
                  isFirstPlace={true}
                  variant="ranking"
                />
              </div>
              <div className="w-[200px]">
                <DishCard
                  key={dishes[2].id}
                  id={dishes[2].id}
                  imageUrl={dishes[2].imageUrl}
                  name={dishes[2].name}
                  likes={dishes[2].likes}
                  rank={3}
                  availableImages={availableImages}
                  isFirstPlace={false}
                  variant="ranking"
                />
              </div>
            </>
          ) : (
            // If less than 3 dishes, show in order
            dishes.map((dish, idx) => (
              <DishCard
                key={dish.id}
                id={dish.id}
                imageUrl={dish.imageUrl}
                name={dish.name}
                likes={dish.likes}
                rank={idx + 1}
                availableImages={availableImages}
                isFirstPlace={idx === 0}
                variant="ranking"
              />
            ))
          )}
        </div>
      </div>
    </section>
  )
}

