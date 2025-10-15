'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useUser } from '@clerk/nextjs'
import { 
  Search, 
  Filter, 
  Star, 
  Heart, 
  ShoppingCart, 
  Eye,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Grid3X3,
  List,
  SortAsc,
  SortDesc
} from 'lucide-react'
import Link from 'next/link'
import { useMarketplace } from '@/lib/hooks/useMarketplace'
import { MarketplaceSearchFilters } from '@/types/database'

const CATEGORIES = [
  'All',
  'Business',
  'Marketing',
  'Sales',
  'Productivity',
  'Education',
  'Technology',
  'Health',
  'Finance',
  'General'
]

const SORT_OPTIONS = [
  { value: 'relevance', label: 'Relevance' },
  { value: 'popular', label: 'Most Popular' },
  { value: 'rating', label: 'Highest Rated' },
  { value: 'newest', label: 'Newest' },
  { value: 'price_low', label: 'Price: Low to High' },
  { value: 'price_high', label: 'Price: High to Low' }
]

const ITEMS_PER_PAGE_OPTIONS = [12, 24, 50, 100]

export default function MarketplacePage() {
  const { user } = useUser()
  
  // Use marketplace hook
  const {
    playbooks,
    loading,
    error,
    searchQuery,
    setSearchQuery,
    filters,
    updateFilters,
    clearFilters,
    toggleFavorite,
    fetchPlaybooks,
    isAuthenticated
  } = useMarketplace()
  
  // Local state
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [priceFilter, setPriceFilter] = useState('All')
  const [sortBy, setSortBy] = useState('relevance')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(50)

  // Update filters when local state changes
  useEffect(() => {
    const newFilters: MarketplaceSearchFilters = {}
    
    if (selectedCategory !== 'All') {
      newFilters.category = selectedCategory.toLowerCase()
    }
    
    if (priceFilter === 'Free') {
      newFilters.maxPrice = 0
    } else if (priceFilter === 'Paid') {
      newFilters.minPrice = 1
    }
    
    switch (sortBy) {
      case 'popular':
        newFilters.sortBy = 'purchases'
        newFilters.sortOrder = 'desc'
        break
      case 'rating':
        newFilters.sortBy = 'rating'
        newFilters.sortOrder = 'desc'
        break
      case 'newest':
        newFilters.sortBy = 'created_at'
        newFilters.sortOrder = 'desc'
        break
      case 'price_low':
        newFilters.sortBy = 'price'
        newFilters.sortOrder = 'asc'
        break
      case 'price_high':
        newFilters.sortBy = 'price'
        newFilters.sortOrder = 'desc'
        break
      case 'relevance':
      default:
        newFilters.sortBy = 'purchases'
        newFilters.sortOrder = 'desc'
        break
    }
    
    updateFilters(newFilters)
  }, [selectedCategory, priceFilter, sortBy, updateFilters])

  // Pagination
  const totalPages = Math.ceil(playbooks.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedPlaybooks = playbooks.slice(startIndex, endIndex)

  // Handle favorite toggle
  const handleToggleFavorite = async (playbookId: string) => {
    if (!isAuthenticated) {
      window.location.href = '/sign-in'
      return
    }

    try {
      await toggleFavorite(playbookId)
    } catch (err) {
      console.error('Error toggling favorite:', err)
    }
  }

  // Format price
  const formatPrice = (price: number) => {
    if (price === 0) return 'Free'
    return `$${(price / 100).toFixed(2)}`
  }

  // Render star rating
  const renderStars = (rating: number) => {
    const stars = []
    const fullStars = Math.floor(rating)
    const hasHalfStar = rating % 1 >= 0.5

    for (let i = 0; i < fullStars; i++) {
      stars.push(<Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />)
    }

    if (hasHalfStar) {
      stars.push(<Star key="half" className="h-4 w-4 fill-yellow-400/50 text-yellow-400" />)
    }

    const emptyStars = 5 - Math.ceil(rating)
    for (let i = 0; i < emptyStars; i++) {
      stars.push(<Star key={`empty-${i}`} className="h-4 w-4 text-gray-300" />)
    }

    return stars
  }

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, selectedCategory, priceFilter, sortBy])

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Marketplace: Browse Winning Playbooks
          </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Discover proven playbooks created by experts. Find the perfect workflow to accelerate your success.
            </p>
          </div>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search Input */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search playbooks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3">
              {/* Category Filter */}
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              >
                {CATEGORIES.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>

              {/* Price Filter */}
              <select
                value={priceFilter}
                onChange={(e) => setPriceFilter(e.target.value)}
                className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              >
                <option value="All">All Prices</option>
                <option value="Free">Free</option>
                <option value="Paid">Paid</option>
              </select>

              {/* Sort */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              >
                {SORT_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>

              {/* View Mode Toggle */}
              <div className="flex border border-gray-300 rounded-lg overflow-hidden">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-3 ${viewMode === 'grid' ? 'bg-blue-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                >
                  <Grid3X3 className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-3 ${viewMode === 'list' ? 'bg-blue-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                >
                  <List className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Results Info */}
          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-gray-600">
              {loading ? 'Loading...' : `${playbooks.length} playbooks found`}
            </p>
            
            {/* Items per page */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Show:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                className="px-3 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {ITEMS_PER_PAGE_OPTIONS.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-3 bg-gray-200 rounded mb-4 w-2/3"></div>
                <div className="h-20 bg-gray-200 rounded mb-4"></div>
                <div className="flex justify-between items-center">
                  <div className="h-4 bg-gray-200 rounded w-16"></div>
                  <div className="h-8 bg-gray-200 rounded w-20"></div>
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <div className="text-red-500 text-lg mb-4">{error}</div>
            <button
              onClick={fetchPlaybooks}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : paginatedPlaybooks.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-500 text-lg mb-4">No playbooks found</div>
            <p className="text-gray-400 mb-6">Try adjusting your search or filters</p>
            <button
              onClick={() => {
                setSearchQuery('')
                setSelectedCategory('All')
                setPriceFilter('All')
                setSortBy('relevance')
                clearFilters()
              }}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <>
            {/* Playbook Grid */}
            <div className={`grid gap-6 ${
              viewMode === 'grid' 
                ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' 
                : 'grid-cols-1'
            }`}>
              {paginatedPlaybooks.map((playbook) => (
                <div
                  key={playbook.id}
                  className={`bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-200 ${
                    viewMode === 'list' ? 'flex' : ''
                  }`}
                >
                  {viewMode === 'grid' ? (
                    // Grid View
                    <>
                      <div className="p-6">
                        <div className="flex items-start justify-between mb-3">
                          <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">
                            {playbook.title}
                          </h3>
                          <button
                            onClick={() => handleToggleFavorite(playbook.id)}
                            className={`p-2 rounded-full transition-colors ${
                              playbook.is_favorited
                                ? 'text-red-500 hover:text-red-600'
                                : 'text-gray-400 hover:text-red-500'
                            }`}
                          >
                            <Heart className={`h-5 w-5 ${playbook.is_favorited ? 'fill-current' : ''}`} />
                          </button>
                        </div>

                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center">
                            {playbook.creator_avatar ? (
                              <img
                                src={playbook.creator_avatar}
                                alt={playbook.creator_name}
                                className="w-6 h-6 rounded-full"
                              />
                            ) : (
                              <span className="text-xs font-medium text-gray-600">
                                {playbook.creator_name?.[0] || 'A'}
                              </span>
                            )}
                          </div>
                          <span className="text-sm text-gray-600">{playbook.creator_name}</span>
                        </div>

                        <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                          {playbook.description || 'No description available'}
                        </p>

                        <div className="flex items-center gap-4 mb-4">
                          <div className="flex items-center gap-1">
                            {renderStars(playbook.average_rating)}
                            <span className="text-sm text-gray-600 ml-1">
                              ({playbook.total_purchases})
                            </span>
                          </div>
                          <span className="text-sm text-gray-500">
                            {playbook.total_purchases} purchases
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="text-lg font-bold text-gray-900">
                            {formatPrice(playbook.price)}
                          </div>
                          <div className="flex gap-2">
                            <Link
                              href={`/marketplace/${playbook.id}`}
                              className="px-4 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors flex items-center gap-2"
                            >
                              <Eye className="h-4 w-4" />
                              Preview
                            </Link>
                            {playbook.is_purchased ? (
                              <span className="px-4 py-2 bg-green-100 text-green-800 rounded-lg text-sm">
                                Owned
                              </span>
                            ) : (
                              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2">
                                <ShoppingCart className="h-4 w-4" />
                                {playbook.price === 0 ? 'Get Free' : 'Purchase'}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    // List View
                    <>
                      <div className="p-6 flex-1">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">
                              {playbook.title}
                            </h3>
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center">
                                {playbook.creator_avatar ? (
                                  <img
                                    src={playbook.creator_avatar}
                                    alt={playbook.creator_name}
                                    className="w-6 h-6 rounded-full"
                                  />
                                ) : (
                                  <span className="text-xs font-medium text-gray-600">
                                    {playbook.creator_name?.[0] || 'A'}
                                  </span>
                                )}
                              </div>
                              <span className="text-sm text-gray-600">{playbook.creator_name}</span>
                            </div>
                            <p className="text-gray-600 text-sm mb-3">
                              {playbook.description || 'No description available'}
                            </p>
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-1">
                                {renderStars(playbook.average_rating)}
                                <span className="text-sm text-gray-600 ml-1">
                                  ({playbook.total_purchases})
                                </span>
                              </div>
                              <span className="text-sm text-gray-500">
                                {playbook.total_purchases} purchases
                              </span>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-3">
                            <button
                              onClick={() => handleToggleFavorite(playbook.id)}
                              className={`p-2 rounded-full transition-colors ${
                                playbook.is_favorited
                                  ? 'text-red-500 hover:text-red-600'
                                  : 'text-gray-400 hover:text-red-500'
                              }`}
                            >
                              <Heart className={`h-5 w-5 ${playbook.is_favorited ? 'fill-current' : ''}`} />
                            </button>
                            <div className="text-lg font-bold text-gray-900">
                              {formatPrice(playbook.price)}
                            </div>
                            <div className="flex gap-2">
                              <Link
                                href={`/marketplace/${playbook.id}`}
                                className="px-4 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors flex items-center gap-2"
                              >
                                <Eye className="h-4 w-4" />
                                Preview
                              </Link>
                              {playbook.is_purchased ? (
                                <span className="px-4 py-2 bg-green-100 text-green-800 rounded-lg text-sm">
                                  Owned
                                </span>
                              ) : (
                                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2">
                                  <ShoppingCart className="h-4 w-4" />
                                  {playbook.price === 0 ? 'Get Free' : 'Purchase'}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-12 flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Showing {startIndex + 1} to {Math.min(endIndex, playbooks.length)} of {playbooks.length} results
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="p-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNum = i + 1
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`px-3 py-2 border rounded-lg ${
                          currentPage === pageNum
                            ? 'bg-blue-500 text-white border-blue-500'
                            : 'border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    )
                  })}
                  
                  {totalPages > 5 && (
                    <>
                      <span className="px-2">...</span>
                      <button
                        onClick={() => setCurrentPage(totalPages)}
                        className={`px-3 py-2 border rounded-lg ${
                          currentPage === totalPages
                            ? 'bg-blue-500 text-white border-blue-500'
                            : 'border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {totalPages}
                      </button>
                    </>
                  )}
                  
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}