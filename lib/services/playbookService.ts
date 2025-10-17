import { createSupabaseClient } from '@/lib/supabase'
import { Database } from '@/types/database'

type Playbook = Database['public']['Tables']['playbooks']['Row']
type PlaybookInsert = Database['public']['Tables']['playbooks']['Insert']
type PlaybookUpdate = Database['public']['Tables']['playbooks']['Update']

export interface PlaybookData {
  id?: string
  title: string
  content: any // Tiptap JSON content
  description?: string
  tags?: string[]
  is_public?: boolean
  owner_id?: string
  created_at?: string
  updated_at?: string
  is_marketplace?: boolean
  price?: number
  preview_content?: any
  total_purchases?: number
  average_rating?: number
}

export interface PlaybookListItem {
  id: string
  title: string
  description: string | null
  tags: string[] | null
  is_public: boolean
  created_at: string
  updated_at: string
  owner_id: string
  is_marketplace?: boolean
  price?: number
  total_purchases?: number
  average_rating?: number
  is_purchased?: boolean
}

export class PlaybookService {
  private supabase = createSupabaseClient()

  /**
   * Save a new playbook to Supabase
   */
  async savePlaybook(playbookData: Omit<PlaybookData, 'id'>): Promise<PlaybookData> {
    try {
      console.log('Saving playbook:', playbookData.title)
      
      const { data, error } = await this.supabase
        .from('playbooks')
        .insert({
          title: playbookData.title,
          content: playbookData.content,
          description: playbookData.description || null,
          tags: playbookData.tags || [],
          is_public: playbookData.is_public || false,
          owner_id: playbookData.owner_id || null,
          is_marketplace: playbookData.is_marketplace || false,
          price: playbookData.price || 0,
          preview_content: playbookData.preview_content || null,
          total_purchases: playbookData.total_purchases || 0,
          average_rating: playbookData.average_rating || 0
        })
        .select()
        .single()

      if (error) {
        console.error('Error saving playbook:', error)
        throw new Error(`Failed to save playbook: ${error.message}`)
      }

      console.log('Playbook saved successfully:', data.id)
      
      // Add the owner as a collaborator
      if (playbookData.owner_id) {
        try {
          const { error: collaboratorError } = await this.supabase
            .from('collaborators')
            .insert({
              playbook_id: data.id,
              user_id: playbookData.owner_id,
              user_email: '', // Will be filled in later if available
              user_name: '', // Will be filled in later if available
              permission_level: 'owner',
              invited_by: playbookData.owner_id,
              invited_at: new Date().toISOString(),
              accepted_at: new Date().toISOString(),
              status: 'accepted'
            })
          
          if (collaboratorError) {
            console.warn('Failed to add owner as collaborator:', collaboratorError)
            // Don't fail the entire operation if this fails
          } else {
            console.log('Owner added as collaborator for playbook:', data.id)
          }
        } catch (collaboratorError) {
          console.warn('Error adding owner as collaborator:', collaboratorError)
          // Don't fail the entire operation if this fails
        }
      }
      
      return data as PlaybookData
    } catch (error) {
      console.error('PlaybookService.savePlaybook error:', error)
      throw error
    }
  }

  /**
   * Update an existing playbook
   */
  async updatePlaybook(id: string, updates: Partial<PlaybookData>): Promise<PlaybookData> {
    try {
      console.log('Updating playbook:', id, updates)
      
      const { data, error } = await this.supabase
        .from('playbooks')
        .update({
          title: updates.title,
          content: updates.content,
          description: updates.description,
          tags: updates.tags,
          is_public: updates.is_public,
          is_marketplace: updates.is_marketplace,
          price: updates.price,
          preview_content: updates.preview_content,
          total_purchases: updates.total_purchases,
          average_rating: updates.average_rating,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('Error updating playbook:', error)
        throw new Error(`Failed to update playbook: ${error.message}`)
      }

      console.log('Playbook updated successfully:', id)
      return data as PlaybookData
    } catch (error) {
      console.error('PlaybookService.updatePlaybook error:', error)
      throw error
    }
  }

  /**
   * Get all playbooks for a user
   */
  async getPlaybooks(ownerId: string): Promise<PlaybookListItem[]> {
    try {
      console.log('Fetching playbooks for owner:', ownerId)
      
      const { data, error } = await this.supabase
        .from('playbooks')
        .select('id, title, description, tags, is_public, created_at, updated_at, owner_id, is_marketplace, price, total_purchases, average_rating')
        .eq('owner_id', ownerId)
        .order('updated_at', { ascending: false })

      if (error) {
        console.error('Error fetching playbooks:', error)
        throw new Error(`Failed to fetch playbooks: ${error.message}`)
      }

      console.log('Fetched playbooks:', data?.length || 0)
      return data as PlaybookListItem[]
    } catch (error) {
      console.error('PlaybookService.getPlaybooks error:', error)
      throw error
    }
  }

  /**
   * Get a single playbook by ID
   */
  async getPlaybook(id: string): Promise<PlaybookData> {
    try {
      console.log('Fetching playbook:', id)
      
      const { data, error } = await this.supabase
        .from('playbooks')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        console.error('Error fetching playbook:', error)
        throw new Error(`Failed to fetch playbook: ${error.message}`)
      }

      console.log('Fetched playbook:', data.title)
      return data as PlaybookData
    } catch (error) {
      console.error('PlaybookService.getPlaybook error:', error)
      throw error
    }
  }

  /**
   * Delete a playbook
   */
  async deletePlaybook(id: string): Promise<void> {
    try {
      console.log('Deleting playbook:', id)
      
      const { error } = await this.supabase
        .from('playbooks')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('Error deleting playbook:', error)
        throw new Error(`Failed to delete playbook: ${error.message}`)
      }

      console.log('Playbook deleted successfully:', id)
    } catch (error) {
      console.error('PlaybookService.deletePlaybook error:', error)
      throw error
    }
  }

  /**
   * Duplicate a playbook
   */
  async duplicatePlaybook(id: string, newTitle?: string): Promise<PlaybookData> {
    try {
      console.log('Duplicating playbook:', id)
      
      // First, get the original playbook
      const originalPlaybook = await this.getPlaybook(id)
      
      // Create a new playbook with the duplicated data
      const duplicatedData: Omit<PlaybookData, 'id'> = {
        title: newTitle || `${originalPlaybook.title} (Copy)`,
        content: originalPlaybook.content,
        description: originalPlaybook.description,
        tags: originalPlaybook.tags,
        is_public: false, // Duplicates are private by default
        owner_id: originalPlaybook.owner_id
      }

      const newPlaybook = await this.savePlaybook(duplicatedData)
      console.log('Playbook duplicated successfully:', newPlaybook.id)
      return newPlaybook
    } catch (error) {
      console.error('PlaybookService.duplicatePlaybook error:', error)
      throw error
    }
  }

  /**
   * Search playbooks by title or content
   */
  async searchPlaybooks(ownerId: string, query: string): Promise<PlaybookListItem[]> {
    try {
      console.log('Searching playbooks:', query)
      
      const { data, error } = await this.supabase
        .from('playbooks')
        .select('id, title, description, tags, is_public, created_at, updated_at, owner_id')
        .eq('owner_id', ownerId)
        .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
        .order('updated_at', { ascending: false })

      if (error) {
        console.error('Error searching playbooks:', error)
        throw new Error(`Failed to search playbooks: ${error.message}`)
      }

      console.log('Search results:', data?.length || 0)
      return data as PlaybookListItem[]
    } catch (error) {
      console.error('PlaybookService.searchPlaybooks error:', error)
      throw error
    }
  }

  /**
   * Get public playbooks (for marketplace)
   */
  async getPublicPlaybooks(limit: number = 20, offset: number = 0): Promise<PlaybookListItem[]> {
    try {
      console.log('Fetching public playbooks:', { limit, offset })
      
      const { data, error } = await this.supabase
        .from('playbooks')
        .select('id, title, description, tags, is_public, created_at, updated_at, owner_id')
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (error) {
        console.error('Error fetching public playbooks:', error)
        throw new Error(`Failed to fetch public playbooks: ${error.message}`)
      }

      console.log('Fetched public playbooks:', data?.length || 0)
      return data as PlaybookListItem[]
    } catch (error) {
      console.error('PlaybookService.getPublicPlaybooks error:', error)
      throw error
    }
  }

  /**
   * Get collaborators for a playbook
   */
  async getCollaborators(playbookId: string): Promise<Array<{
    id: string
    user_id: string
    user_name: string
    user_email: string
    permission_level: string
    status: string
  }>> {
    try {
      const { data, error } = await this.supabase
        .from('collaborators')
        .select('*')
        .eq('playbook_id', playbookId)
        .eq('status', 'accepted')
        .order('user_name', { ascending: true })

      if (error) {
        console.error('Error fetching collaborators:', error)
        throw new Error(`Failed to fetch collaborators: ${error.message}`)
      }

      return data || []
    } catch (error) {
      console.error('PlaybookService.getCollaborators error:', error)
      throw error
    }
  }
}

// Export singleton instance
export const playbookService = new PlaybookService()

