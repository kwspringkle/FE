"use client"

import { use } from "react"
import { RestaurantReviewsPage } from "@/components/RestaurantReviews"

interface RestaurantReviewsPageProps {
  params: Promise<{
    id: string
  }>
}

export default function RestaurantReviewsRoute({ params }: RestaurantReviewsPageProps) {
  const resolvedParams = use(params)
  const restaurantId = Number(resolvedParams.id)

  return <RestaurantReviewsPage restaurantId={restaurantId} />
}
