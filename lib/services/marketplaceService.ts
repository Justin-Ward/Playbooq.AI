import { supabase } from '@/lib/supabase'
import { MarketplacePlaybook, MarketplaceSearchFilters, PlaybookFavorite, MarketplaceRating } from '@/types/database'
import { ensureUUID } from '@/lib/utils/shortId'

export interface MarketplacePlaybookWithStatus extends MarketplacePlaybook {
  creator_name?: string
  creator_avatar?: string
  is_favorited?: boolean
  is_purchased?: boolean
  user_rating?: number
}

export interface MarketplaceStats {
  totalPlaybooks: number
  totalPurchases: number
  averageRating: number
  categories: { category: string; count: number }[]
}

class MarketplaceService {
  /**
   * Get all marketplace playbooks with creator information
   */
  async getMarketplacePlaybooks(): Promise<MarketplacePlaybookWithStatus[]> {
    try {
      const { data, error } = await supabase
        .from('playbooks')
        .select('*')
        .eq('is_marketplace', true)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching marketplace playbooks:', error)
        throw new Error(`Failed to fetch playbooks: ${error.message}`)
      }

      // Get creator information separately since foreign key relationship doesn't exist
      const playbooksWithCreator = await Promise.all(
        data.map(async (playbook) => {
          try {
            const { data: profileData } = await supabase
              .from('user_profiles')
              .select('display_name, avatar_url')
              .eq('id', playbook.user_id)
              .single()

            return {
              ...playbook,
              // Use preview_content for marketplace display, fallback to content if preview_content doesn't exist
              content: playbook.preview_content || playbook.content,
              creator_name: profileData?.display_name || 'Anonymous',
              creator_avatar: profileData?.avatar_url || null
            }
          } catch (err) {
            return {
              ...playbook,
              // Use preview_content for marketplace display, fallback to content if preview_content doesn't exist
              content: playbook.preview_content || playbook.content,
              creator_name: 'Anonymous',
              creator_avatar: null
            }
          }
        })
      )

      return playbooksWithCreator
    } catch (error) {
      console.error('MarketplaceService.getMarketplacePlaybooks error:', error)
      throw error
    }
  }

  /**
   * Search marketplace playbooks with filters
   */
  async searchMarketplacePlaybooks(filters: MarketplaceSearchFilters): Promise<MarketplacePlaybookWithStatus[]> {
    try {
      let query = supabase
        .from('playbooks')
        .select('*')
        .eq('is_marketplace', true)

      // Apply filters
      if (filters.category) {
        query = query.eq('category', filters.category.toLowerCase())
      }

      if (filters.minPrice !== undefined) {
        query = query.gte('price', filters.minPrice)
      }

      if (filters.maxPrice !== undefined) {
        query = query.lte('price', filters.maxPrice)
      }

      if (filters.minRating !== undefined) {
        query = query.gte('average_rating', filters.minRating)
      }

      if (filters.tags && filters.tags.length > 0) {
        query = query.overlaps('tags', filters.tags)
      }

      // Apply sorting
      const sortBy = filters.sortBy || 'created_at'
      const sortOrder = filters.sortOrder || 'desc'
      
      switch (sortBy) {
        case 'price':
          query = query.order('price', { ascending: sortOrder === 'asc' })
          break
        case 'rating':
          query = query.order('average_rating', { ascending: sortOrder === 'asc' })
          break
        case 'purchases':
          query = query.order('total_purchases', { ascending: sortOrder === 'asc' })
          break
        case 'created_at':
        default:
          query = query.order('created_at', { ascending: sortOrder === 'asc' })
          break
      }

      const { data, error } = await query

      if (error) {
        console.error('Error searching marketplace playbooks:', error)
        throw new Error(`Failed to search playbooks: ${error.message}`)
      }

      // Get creator information separately
      const playbooksWithCreator = await Promise.all(
        data.map(async (playbook) => {
          try {
            const { data: profileData } = await supabase
              .from('user_profiles')
              .select('display_name, avatar_url')
              .eq('id', playbook.user_id)
              .single()

            return {
              ...playbook,
              // Use preview_content for marketplace display, fallback to content if preview_content doesn't exist
              content: playbook.preview_content || playbook.content,
              creator_name: profileData?.display_name || 'Anonymous',
              creator_avatar: profileData?.avatar_url || null
            }
          } catch (err) {
            return {
              ...playbook,
              // Use preview_content for marketplace display, fallback to content if preview_content doesn't exist
              content: playbook.preview_content || playbook.content,
              creator_name: 'Anonymous',
              creator_avatar: null
            }
          }
        })
      )

      return playbooksWithCreator
    } catch (error) {
      console.error('MarketplaceService.searchMarketplacePlaybooks error:', error)
      throw error
    }
  }

  /**
   * Get user's favorite playbooks
   */
  async getUserFavorites(userId: string): Promise<Set<string>> {
    try {
      const { data, error } = await supabase
        .from('playbook_favorites')
        .select('playbook_id')
        .eq('user_id', userId)

      if (error) {
        console.error('Error fetching user favorites:', error)
        throw new Error(`Failed to fetch favorites: ${error.message}`)
      }

      return new Set(data.map(fav => fav.playbook_id))
    } catch (error) {
      console.error('MarketplaceService.getUserFavorites error:', error)
      throw error
    }
  }

  /**
   * Get user's purchased playbooks
   */
  async getUserPurchases(userId: string): Promise<Set<string>> {
    try {
      const { data, error } = await supabase
        .from('playbook_purchases')
        .select('playbook_id')
        .eq('user_id', userId)

      if (error) {
        console.error('Error fetching user purchases:', error)
        throw new Error(`Failed to fetch purchases: ${error.message}`)
      }

      return new Set(data.map(purchase => purchase.playbook_id))
    } catch (error) {
      console.error('MarketplaceService.getUserPurchases error:', error)
      throw error
    }
  }

  /**
   * Toggle favorite status for a playbook
   */
  async toggleFavorite(playbookId: string, userId: string, isFavorited: boolean): Promise<void> {
    try {
      if (isFavorited) {
        // Remove from favorites
        const { error } = await supabase
          .from('playbook_favorites')
          .delete()
          .eq('playbook_id', playbookId)
          .eq('user_id', userId)

        if (error) throw error
      } else {
        // Add to favorites
        const { error } = await supabase
          .from('playbook_favorites')
          .insert({
            playbook_id: playbookId,
            user_id: userId
          })

        if (error) throw error
      }
    } catch (error) {
      console.error('MarketplaceService.toggleFavorite error:', error)
      throw error
    }
  }

  /**
   * Get marketplace statistics
   */
  async getMarketplaceStats(): Promise<MarketplaceStats> {
    try {
      // Get total playbooks
      const { count: totalPlaybooks, error: countError } = await supabase
        .from('playbooks')
        .select('*', { count: 'exact', head: true })
        .eq('is_marketplace', true)

      if (countError) throw countError

      // Get total purchases
      const { data: purchasesData, error: purchasesError } = await supabase
        .from('playbook_purchases')
        .select('id')

      if (purchasesError) throw purchasesError

      // Get average rating
      const { data: ratingData, error: ratingError } = await supabase
        .from('playbooks')
        .select('average_rating')
        .eq('is_marketplace', true)
        .not('average_rating', 'is', null)

      if (ratingError) throw ratingError

      const averageRating = ratingData.length > 0 
        ? ratingData.reduce((sum, item) => sum + item.average_rating, 0) / ratingData.length
        : 0

      // Get categories
      const { data: categoryData, error: categoryError } = await supabase
        .from('playbooks')
        .select('category')
        .eq('is_marketplace', true)

      if (categoryError) throw categoryError

      const categoryCounts = categoryData.reduce((acc, item) => {
        const category = item.category || 'general'
        acc[category] = (acc[category] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      const categories = Object.entries(categoryCounts).map(([category, count]) => ({
        category: category.charAt(0).toUpperCase() + category.slice(1),
        count
      })).sort((a, b) => b.count - a.count)

      return {
        totalPlaybooks: totalPlaybooks || 0,
        totalPurchases: purchasesData.length,
        averageRating: Math.round(averageRating * 100) / 100,
        categories
      }
    } catch (error) {
      console.error('MarketplaceService.getMarketplaceStats error:', error)
      throw error
    }
  }

  /**
   * Get featured playbooks (highest rated, most popular)
   */
  async getFeaturedPlaybooks(limit: number = 6): Promise<MarketplacePlaybookWithStatus[]> {
    try {
      const { data, error } = await supabase
        .from('playbooks')
        .select('*')
        .eq('is_marketplace', true)
        .order('total_purchases', { ascending: false })
        .order('average_rating', { ascending: false })
        .limit(limit)

      if (error) {
        console.error('Error fetching featured playbooks:', error)
        throw new Error(`Failed to fetch featured playbooks: ${error.message}`)
      }

      // Get creator information separately
      const playbooksWithCreator = await Promise.all(
        data.map(async (playbook) => {
          try {
            const { data: profileData } = await supabase
              .from('user_profiles')
              .select('display_name, avatar_url')
              .eq('id', playbook.user_id)
              .single()

            return {
              ...playbook,
              // Use preview_content for marketplace display, fallback to content if preview_content doesn't exist
              content: playbook.preview_content || playbook.content,
              creator_name: profileData?.display_name || 'Anonymous',
              creator_avatar: profileData?.avatar_url || null
            }
          } catch (err) {
            return {
              ...playbook,
              // Use preview_content for marketplace display, fallback to content if preview_content doesn't exist
              content: playbook.preview_content || playbook.content,
              creator_name: 'Anonymous',
              creator_avatar: null
            }
          }
        })
      )

      return playbooksWithCreator
    } catch (error) {
      console.error('MarketplaceService.getFeaturedPlaybooks error:', error)
      throw error
    }
  }

  /**
   * Get playbook by ID with full details
   */
  async getPlaybookById(playbookId: string): Promise<MarketplacePlaybookWithStatus | null> {
    try {
      // Convert short ID to UUID if needed
      const uuid = ensureUUID(playbookId)
      
      const { data, error } = await supabase
        .from('playbooks')
        .select('*')
        .eq('id', uuid)
        .eq('is_marketplace', true)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return null // Not found
        }
        console.error('Error fetching playbook:', error)
        throw new Error(`Failed to fetch playbook: ${error.message}`)
      }

      // Get creator information separately
      try {
        const { data: profileData } = await supabase
          .from('user_profiles')
          .select('display_name, avatar_url')
          .eq('id', data.user_id)
          .single()

        return {
          ...data,
          // Use preview_content for marketplace display, fallback to content if preview_content doesn't exist
          content: data.preview_content || data.content,
          creator_name: profileData?.display_name || 'Anonymous',
          creator_avatar: profileData?.avatar_url || null
        }
      } catch (err) {
        return {
          ...data,
          // Use preview_content for marketplace display, fallback to content if preview_content doesn't exist
          content: data.preview_content || data.content,
          creator_name: 'Anonymous',
          creator_avatar: null
        }
      }
    } catch (error) {
      console.error('MarketplaceService.getPlaybookById error:', error)
      throw error
    }
  }

  /**
   * Get playbook ratings and reviews
   */
  async getPlaybookRatings(playbookId: string): Promise<MarketplaceRating[]> {
    try {
      const { data, error } = await supabase
        .from('marketplace_ratings')
        .select('*')
        .eq('playbook_id', playbookId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching playbook ratings:', error)
        throw new Error(`Failed to fetch ratings: ${error.message}`)
      }

      return data
    } catch (error) {
      console.error('MarketplaceService.getPlaybookRatings error:', error)
      throw error
    }
  }

  /**
   * Submit a rating and review for a playbook
   */
  async submitRating(playbookId: string, userId: string, rating: number, review?: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('marketplace_ratings')
        .upsert({
          playbook_id: playbookId,
          user_id: userId,
          rating,
          review: review || null
        }, {
          onConflict: 'playbook_id,user_id'
        })

      if (error) {
        console.error('Error submitting rating:', error)
        throw new Error(`Failed to submit rating: ${error.message}`)
      }
    } catch (error) {
      console.error('MarketplaceService.submitRating error:', error)
      throw error
    }
  }
}

export const marketplaceService = new MarketplaceService()
