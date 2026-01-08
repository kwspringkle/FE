

import { DishReviewsPage } from "@/components/DishReviews"

interface ReviewsPageProps {
  params: Promise<{ id: string }>
}

export default async function ReviewsPage({ params }: ReviewsPageProps) {
  const { id } = await params

  return <DishReviewsPage dishId={id} />
}
