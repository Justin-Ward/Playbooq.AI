import { useState, useEffect, useCallback, useMemo } from 'react'
import { useUser } from '@clerk/nextjs'
import { marketplaceService, MarketplacePlaybookWithStatus } from '@/lib/services/marketplaceService'
import { MarketplaceSearchFilters } from '@/types/database'

export interface UseMarketplaceOptions {
  initialFilters?: MarketplaceSearchFilters
  autoFetch?: boolean
}

export function useMarketplace(options: UseMarketplaceOptions = {}) {
  const { user } = useUser()
  const { initialFilters = {}, autoFetch = true } = options

  // State
  const [playbooks, setPlaybooks] = useState<MarketplacePlaybookWithStatus[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [favorites, setFavorites] = useState<Set<string>>(new Set())
  const [purchases, setPurchases] = useState<Set<string>>(new Set())
  
  // Filters
  const [filters, setFilters] = useState<MarketplaceSearchFilters>(initialFilters)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('')

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery)
    }, 500)
    
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Fetch playbooks
  const fetchPlaybooks = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const data = await marketplaceService.getMarketplacePlaybooks()
      setPlaybooks(data)
    } catch (err) {
      console.error('Error fetching playbooks:', err)
      setError(err instanceof Error ? err.message : 'Failed to load playbooks')
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch user favorites
  const fetchFavorites = useCallback(async () => {
    if (!user?.id) return

    try {
      const favoriteIds = await marketplaceService.getUserFavorites(user.id)
      setFavorites(favoriteIds)
    } catch (err) {
      console.error('Error fetching favorites:', err)
    }
  }, [user?.id])

  // Fetch user purchases
  const fetchPurchases = useCallback(async () => {
    if (!user?.id) return

    try {
      const purchaseIds = await marketplaceService.getUserPurchases(user.id)
      setPurchases(purchaseIds)
    } catch (err) {
      console.error('Error fetching purchases:', err)
    }
  }, [user?.id])

  // Toggle favorite
  const toggleFavorite = useCallback(async (playbookId: string) => {
    if (!user?.id) {
      throw new Error('User must be signed in to favorite playbooks')
    }

    try {
      const isFavorited = favorites.has(playbookId)
      await marketplaceService.toggleFavorite(playbookId, user.id, isFavorited)
      
      setFavorites(prev => {
        const newSet = new Set(prev)
        if (isFavorited) {
          newSet.delete(playbookId)
        } else {
          newSet.add(playbookId)
        }
        return newSet
      })
    } catch (err) {
      console.error('Error toggling favorite:', err)
      throw err
    }
  }, [user?.id, favorites])

  // Update filters
  const updateFilters = useCallback((newFilters: Partial<MarketplaceSearchFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }))
  }, [])

  // Clear filters
  const clearFilters = useCallback(() => {
    setFilters({})
    setSearchQuery('')
  }, [])

  // Filtered and sorted playbooks
  const filteredPlaybooks = useMemo(() => {
    let filtered = playbooks.filter(playbook => {
      // Search filter
      if (debouncedSearchQuery) {
        const query = debouncedSearchQuery.toLowerCase()
        const matchesTitle = playbook.title.toLowerCase().includes(query)
        const matchesDescription = playbook.description?.toLowerCase().includes(query) || false
        if (!matchesTitle && !matchesDescription) return false
      }

      // Category filter
      if (filters.category && playbook.category !== filters.category.toLowerCase()) {
        return false
      }

      // Price filters
      if (filters.minPrice !== undefined && playbook.price < filters.minPrice) {
        return false
      }
      if (filters.maxPrice !== undefined && playbook.price > filters.maxPrice) {
        return false
      }

      // Rating filter
      if (filters.minRating !== undefined && playbook.average_rating < filters.minRating) {
        return false
      }

      // Tags filter
      if (filters.tags && filters.tags.length > 0) {
        const hasMatchingTag = filters.tags.some(tag => 
          playbook.tags?.some(playbookTag => 
            playbookTag.toLowerCase().includes(tag.toLowerCase())
          )
        )
        if (!hasMatchingTag) return false
      }

      return true
    })

    // Add user status
    filtered = filtered.map(playbook => ({
      ...playbook,
      is_favorited: favorites.has(playbook.id),
      is_purchased: purchases.has(playbook.id)
    }))

    // Sort
    filtered.sort((a, b) => {
      const sortBy = filters.sortBy || 'created_at'
      const sortOrder = filters.sortOrder || 'desc'

      let comparison = 0
      switch (sortBy) {
        case 'price':
          comparison = a.price - b.price
          break
        case 'rating':
          comparison = a.average_rating - b.average_rating
          break
        case 'purchases':
          comparison = a.total_purchases - b.total_purchases
          break
        case 'created_at':
        default:
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          break
      }

      return sortOrder === 'asc' ? comparison : -comparison
    })

    return filtered
  }, [playbooks, debouncedSearchQuery, filters, favorites, purchases])

  // Load data on mount
  useEffect(() => {
    if (autoFetch) {
      fetchPlaybooks()
      fetchFavorites()
      fetchPurchases()
    }
  }, [autoFetch, fetchPlaybooks, fetchFavorites, fetchPurchases])

  return {
    // Data
    playbooks: filteredPlaybooks,
    loading,
    error,
    favorites,
    purchases,
    
    // Search
    searchQuery,
    setSearchQuery,
    debouncedSearchQuery,
    
    // Filters
    filters,
    updateFilters,
    clearFilters,
    
    // Actions
    fetchPlaybooks,
    fetchFavorites,
    fetchPurchases,
    toggleFavorite,
    
    // Computed
    isAuthenticated: !!user?.id,
    user
  }
}

// Hook for marketplace statistics
export function useMarketplaceStats() {
  const [stats, setStats] = useState({
    totalPlaybooks: 0,
    totalPurchases: 0,
    averageRating: 0,
    categories: [] as { category: string; count: number }[]
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const data = await marketplaceService.getMarketplaceStats()
      setStats(data)
    } catch (err) {
      console.error('Error fetching marketplace stats:', err)
      setError(err instanceof Error ? err.message : 'Failed to load statistics')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  return {
    stats,
    loading,
    error,
    refetch: fetchStats
  }
}

// Hook for featured playbooks
export function useFeaturedPlaybooks(limit: number = 6) {
  const [playbooks, setPlaybooks] = useState<MarketplacePlaybookWithStatus[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchFeatured = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const data = await marketplaceService.getFeaturedPlaybooks(limit)
      setPlaybooks(data)
    } catch (err) {
      console.error('Error fetching featured playbooks:', err)
      setError(err instanceof Error ? err.message : 'Failed to load featured playbooks')
    } finally {
      setLoading(false)
    }
  }, [limit])

  useEffect(() => {
    fetchFeatured()
  }, [fetchFeatured])

  return {
    playbooks,
    loading,
    error,
    refetch: fetchFeatured
  }
}
