"use client";

import { ChevronRight, Link } from "lucide-react";
import { DishCard } from "./DishCard";
import type { Favorite } from "@/api/types";

interface FavoriteListProps {
  dishes: Favorite[];
  availableImages: string[];
  loading?: boolean;
}

export function FavoriteList({
  dishes,
  availableImages,
  loading,
}: FavoriteListProps) {
  return (
    <section className="mb-16">
      <div className="flex justify-between items-center mb-8">
        <h3 className="text-xl font-semibold text-foreground">
          お気に入り一覧
        </h3>
        <a
          href="/favorites"
          className="text-primary text-sm font-medium flex items-center gap-1"
        >
          詳細 <ChevronRight className="w-4 h-4" />
        </a>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">読み込み中...</p>
        </div>
      ) : dishes.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">お気に入りはまだありません</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {dishes.map((dish) => (
            <DishCard
              key={dish.id}
              id={dish.dishId || dish.id}
              imageUrl={dish.imageUrl}
              name={dish.dishesname}
              rate={dish.rate || 0}
              availableImages={availableImages}
              restaurant={dish.restaurantName || undefined}
              variant="favorite"
            />
          ))}
        </div>
      )}
    </section>
  );
}
