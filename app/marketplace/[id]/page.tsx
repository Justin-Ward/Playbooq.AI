'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { 
  Star, 
  Heart, 
  ShoppingCart, 
  ArrowLeft,
  User,
  Calendar,
  Tag,
  Eye,
  Download
} from 'lucide-react'
import Link from 'next/link'
import { marketplaceService } from '@/lib/services/marketplaceService'
import { MarketplacePlaybookWithStatus } from '@/lib/services/marketplaceService'
import { MarketplaceRating } from '@/types/database'

export default function MarketplaceDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useUser()
  const playbookId = params.id as string

  const [playbook, setPlaybook] = useState<MarketplacePlaybookWithStatus | null>(null)
  const [ratings, setRatings] = useState<MarketplaceRating[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isFavorited, setIsFavorited] = useState(false)
  const [isPurchased, setIsPurchased] = useState(false)

  useEffect(() => {
    const fetchPlaybook = async () => {
      try {
        setLoading(true)
        setError(null)

        const [playbookData, ratingsData] = await Promise.all([
          marketplaceService.getPlaybookById(playbookId),
          marketplaceService.getPlaybookRatings(playbookId).catch(() => []) // Handle ratings error gracefully
        ])

        if (!playbookData) {
          setError('Playbook not found')
          return
        }

        setPlaybook(playbookData)
        setRatings(ratingsData)

        // Check if user has favorited or purchased this playbook
        if (user?.id) {
          const [favorites, purchases] = await Promise.all([
            marketplaceService.getUserFavorites(user.id),
            marketplaceService.getUserPurchases(user.id)
          ])

          setIsFavorited(favorites.has(playbookId))
          setIsPurchased(purchases.has(playbookId))
        }
      } catch (err) {
        console.error('Error fetching playbook:', err)
        setError('Failed to load playbook')
      } finally {
        setLoading(false)
      }
    }

    if (playbookId) {
      fetchPlaybook()
    }
  }, [playbookId, user?.id])

  const handleToggleFavorite = async () => {
    if (!user?.id) {
      router.push('/sign-in')
      return
    }

    try {
      await marketplaceService.toggleFavorite(playbookId, user.id, isFavorited)
      setIsFavorited(!isFavorited)
    } catch (err) {
      console.error('Error toggling favorite:', err)
    }
  }

  const handlePurchase = () => {
    if (!user?.id) {
      router.push('/sign-in')
      return
    }

    // TODO: Implement purchase flow
    console.log('Purchase playbook:', playbookId)
  }

  const formatPrice = (price: number) => {
    if (price === 0) return 'Free'
    return `$${(price / 100).toFixed(2)}`
  }

  const renderStars = (rating: number) => {
    const stars = []
    const fullStars = Math.floor(rating)
    const hasHalfStar = rating % 1 >= 0.5

    for (let i = 0; i < fullStars; i++) {
      stars.push(<Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />)
    }

    if (hasHalfStar) {
      stars.push(<Star key="half" className="h-5 w-5 fill-yellow-400/50 text-yellow-400" />)
    }

    const emptyStars = 5 - Math.ceil(rating)
    for (let i = 0; i < emptyStars; i++) {
      stars.push(<Star key={`empty-${i}`} className="h-5 w-5 text-gray-300" />)
    }

    return stars
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading playbook...</p>
        </div>
      </div>
    )
  }

  if (error || !playbook) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Playbook Not Found</h1>
          <p className="text-gray-600 mb-6">{error || 'The playbook you are looking for does not exist.'}</p>
          <Link
            href="/marketplace"
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Back to Marketplace
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-4 mb-6">
            <Link
              href="/marketplace"
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
              Back to Marketplace
            </Link>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2">
              <h1 className="text-3xl font-bold text-gray-900 mb-4">{playbook.title}</h1>
              
              <div className="flex items-center gap-4 mb-6">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                    {playbook.creator_avatar ? (
                      <img
                        src={playbook.creator_avatar}
                        alt={playbook.creator_name}
                        className="w-8 h-8 rounded-full"
                      />
                    ) : (
                      <span className="text-sm font-medium text-gray-600">
                        {playbook.creator_name?.[0] || 'A'}
                      </span>
                    )}
                  </div>
                  <span className="text-gray-600">by {playbook.creator_name}</span>
                </div>
                
                <div className="flex items-center gap-1">
                  {renderStars(playbook.average_rating)}
                  <span className="text-sm text-gray-600 ml-1">
                    ({playbook.total_purchases} reviews)
                  </span>
                </div>
              </div>

              <div className="prose max-w-none mb-8">
                <p className="text-lg text-gray-700 leading-relaxed">
                  {playbook.description || 'No description available.'}
                </p>
              </div>

              {/* Tags */}
              {playbook.tags && playbook.tags.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-sm font-medium text-gray-900 mb-3">Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {playbook.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Reviews Section */}
              {ratings.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Reviews ({ratings.length})
                  </h3>
                  <div className="space-y-4">
                    {ratings.slice(0, 5).map((rating) => (
                      <div key={rating.id} className="bg-white p-4 rounded-lg border border-gray-200">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="flex items-center gap-1">
                            {renderStars(rating.rating)}
                          </div>
                          <span className="text-sm text-gray-600">
                            {new Date(rating.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        {rating.review && (
                          <p className="text-gray-700">{rating.review}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg border border-gray-200 p-6 sticky top-6">
                <div className="text-center mb-6">
                  <div className="text-3xl font-bold text-gray-900 mb-2">
                    {formatPrice(playbook.price)}
                  </div>
                  {playbook.price > 0 && (
                    <p className="text-sm text-gray-600">
                      One-time purchase • Lifetime access
                    </p>
                  )}
                </div>

                <div className="space-y-4 mb-6">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Category</span>
                    <span className="font-medium capitalize">{playbook.category}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Purchases</span>
                    <span className="font-medium">{playbook.total_purchases}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Rating</span>
                    <div className="flex items-center gap-1">
                      <span className="font-medium">{playbook.average_rating.toFixed(1)}</span>
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Created</span>
                    <span className="font-medium">
                      {new Date(playbook.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  <button
                    onClick={handleToggleFavorite}
                    className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg border transition-colors ${
                      isFavorited
                        ? 'border-red-500 text-red-500 hover:bg-red-50'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Heart className={`h-5 w-5 ${isFavorited ? 'fill-current' : ''}`} />
                    {isFavorited ? 'Favorited' : 'Add to Favorites'}
                  </button>

                  {isPurchased ? (
                    <div className="w-full py-3 px-4 bg-green-100 text-green-800 rounded-lg text-center font-medium">
                      ✓ Owned
                    </div>
                  ) : (
                    <button
                      onClick={handlePurchase}
                      className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                    >
                      <ShoppingCart className="h-5 w-5" />
                      {playbook.price === 0 ? 'Get Free' : 'Purchase'}
                    </button>
                  )}
                </div>

                <div className="mt-6 pt-6 border-t border-gray-200">
                  <p className="text-xs text-gray-500 text-center">
                    Secure payment powered by Stripe
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
