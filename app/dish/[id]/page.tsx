import { DishDetailPage } from "@/components/DishDetail"

interface PageProps {
  params: Promise<{
    id: string
  }>
  searchParams: Promise<{
    restaurantId?: string
  }>
}

export default async function Page({ params, searchParams }: PageProps) {
  const { id } = await params
  const { restaurantId } = await searchParams
  return <DishDetailPage dishRestaurantId={id} restaurantId={restaurantId} />
}
