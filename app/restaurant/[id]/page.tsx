import { RestaurantDetailPage } from "@/components/RestaurantDetail"

interface PageProps {
  params: Promise<{
    id: string
  }>
}

export default async function Page({ params }: PageProps) {
  const { id } = await params
  return <RestaurantDetailPage restaurantId={id} />
}

