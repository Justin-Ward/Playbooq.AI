import { useState, useCallback, useEffect, useRef } from 'react'
import { useUser } from '@clerk/nextjs'
import { playbookService, PlaybookData, PlaybookListItem } from '@/lib/services/playbookService'
import { LocalPlaybookService, LocalPlaybook } from '@/lib/services/localPlaybookService'
// import { marketplaceService } from '@/lib/services/marketplaceService'

interface UseEnhancedPlaybookManagerReturn {
  // Current playbook state
  currentPlaybook: (PlaybookData | LocalPlaybook) | null
  playbookList: (PlaybookListItem | LocalPlaybook)[]
  isLoading: boolean
  isSaving: boolean
  lastSaved: Date | null
  error: string | null
  
  // Authentication state
  isAuthenticated: boolean
  isLoaded: boolean
  tempPlaybookCount: number
  canCreateMore: boolean
  
  // Playbook actions
  loadPlaybook: (id: string) => Promise<void>
  savePlaybook: (playbookData: Omit<PlaybookData, 'id'>) => Promise<PlaybookData | LocalPlaybook>
  updatePlaybook: (id: string, updates: Partial<PlaybookData | LocalPlaybook>) => Promise<void>
  deletePlaybook: (id: string) => Promise<void>
  duplicatePlaybook: (id: string, newTitle?: string) => Promise<PlaybookData | LocalPlaybook>
  createNewPlaybook: () => void
  
  // Content management
  updateContent: (content: any, title?: string) => Promise<void>
  updateTitle: (title: string) => Promise<void>
  
  // List management
  refreshPlaybookList: () => Promise<void>
  searchPlaybooks: (query: string) => Promise<void>
  
  // Utility
  clearError: () => void
  setCurrentPlaybook: (playbook: (PlaybookData | LocalPlaybook) | null) => void
  promptSignIn: () => void
}

export function useEnhancedPlaybookManager(): UseEnhancedPlaybookManagerReturn {
  const { user, isLoaded } = useUser()
  const [currentPlaybook, setCurrentPlaybook] = useState<(PlaybookData | LocalPlaybook) | null>(null)
  const [playbookList, setPlaybookList] = useState<(PlaybookListItem | LocalPlaybook)[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [tempPlaybookCount, setTempPlaybookCount] = useState(0)
  const [canCreateMore, setCanCreateMore] = useState(true)
  
  // Auto-save functionality
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const hasUnsavedChangesRef = useRef(false)

  const isAuthenticated = !!user

  // Clear error
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  // Update temp playbook count and limits
  const updateTempLimits = useCallback(() => {
    const count = LocalPlaybookService.getTempPlaybookCount()
    setTempPlaybookCount(count)
    setCanCreateMore(count < 2)
  }, [])

  // Load a specific playbook (local or remote)
  const loadPlaybook = useCallback(async (id: string) => {
    setIsLoading(true)
    setError(null)
    
    try {
      console.log('Loading playbook:', id, 'User authenticated:', !!user?.id, 'ID type:', typeof id)
      console.log('Is temp playbook check:', LocalPlaybookService.isTempPlaybook(id))
      
      // Check if it's a temporary playbook
      if (LocalPlaybookService.isTempPlaybook(id)) {
        console.log('Loading temp playbook with ID:', id)
        const playbook = LocalPlaybookService.getTempPlaybook(id)
        console.log('Found temp playbook:', playbook ? { id: playbook.id, title: playbook.title } : 'Not found')
        
        if (!playbook) {
          throw new Error('Temporary playbook not found')
        }
        setCurrentPlaybook(playbook)
        setLastSaved(new Date(playbook.updated_at))
        hasUnsavedChangesRef.current = false
        console.log('Temp playbook loaded successfully:', playbook.title)
      } else {
        // Load from remote database (requires authentication)
        if (!user?.id) {
          console.warn('Attempted to load non-temp playbook without authentication:', id, 'User object:', user)
          throw new Error('This playbook requires authentication to access. Please sign in to view saved playbooks.')
        }
        
        const playbook = await playbookService.getPlaybook(id)
        
        // Verify ownership or collaboration
        if (playbook.owner_id !== user.id) {
          // Check if user is a collaborator
          const { createSupabaseClient } = await import('@/lib/supabase')
          const supabase = createSupabaseClient()
          
          const { data: collaborator, error: collaboratorError } = await supabase
            .from('collaborators')
            .select('permission_level, status')
            .eq('playbook_id', id)
            .eq('user_id', user.id)
            .eq('status', 'accepted')
            .single()
          
          if (collaboratorError || !collaborator) {
            throw new Error('You do not have permission to access this playbook')
          }
        }
        
        setCurrentPlaybook(playbook)
        setLastSaved(new Date(playbook.updated_at))
        hasUnsavedChangesRef.current = false
        console.log('Remote playbook loaded successfully:', playbook.title)
        // console.log('Playbook marketplace data:', {
        //   is_marketplace: playbook.is_marketplace,
        //   price: playbook.price,
        //   total_purchases: playbook.total_purchases,
        //   average_rating: playbook.average_rating
        // })
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load playbook'
      setError(errorMessage)
      console.error('Error loading playbook:', err)
    } finally {
      setIsLoading(false)
    }
  }, [user?.id])

  // Save a new playbook (local or remote)
  const savePlaybook = useCallback(async (playbookData: Omit<PlaybookData, 'id'>): Promise<PlaybookData | LocalPlaybook> => {
    setIsSaving(true)
    setError(null)
    
    try {
      console.log('Saving playbook:', playbookData.title, 'User authenticated:', !!user?.id, 'User ID:', user?.id)
      
      if (user?.id) {
        // Save to remote database
        const savedPlaybook = await playbookService.savePlaybook({
          ...playbookData,
          owner_id: user.id
        })
        
        setCurrentPlaybook(savedPlaybook)
        setLastSaved(new Date())
        hasUnsavedChangesRef.current = false
        
        // Refresh the playbook list
        await refreshPlaybookList()
        
        console.log('Playbook saved to database:', savedPlaybook.id)
        return savedPlaybook
      } else {
        // Save locally as temporary playbook
        console.log('Saving as temporary playbook (Guest Mode)')
        const savedPlaybook = LocalPlaybookService.saveTempPlaybook(playbookData)
        
        console.log('Temp playbook created with ID:', savedPlaybook.id, 'Title:', savedPlaybook.title)
        
        setCurrentPlaybook(savedPlaybook)
        setLastSaved(new Date())
        hasUnsavedChangesRef.current = false
        
        // Update temp limits and refresh list
        updateTempLimits()
        await refreshPlaybookList()
        
        console.log('Playbook saved locally:', savedPlaybook.id)
        return savedPlaybook
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save playbook'
      setError(errorMessage)
      console.error('Error saving playbook:', err)
      throw err
    } finally {
      setIsSaving(false)
    }
  }, [user?.id, updateTempLimits])

  // Update an existing playbook
  const updatePlaybook = useCallback(async (id: string, updates: Partial<PlaybookData | LocalPlaybook>) => {
    setIsSaving(true)
    setError(null)
    
    try {
      console.log('Updating playbook:', id, updates)
      
      if (LocalPlaybookService.isTempPlaybook(id)) {
        // Update temporary playbook
        const updatedPlaybook = LocalPlaybookService.updateTempPlaybook(id, updates)
        setCurrentPlaybook(updatedPlaybook)
        setLastSaved(new Date())
        hasUnsavedChangesRef.current = false
        
        // Update the playbook list
        setPlaybookList(prev => prev.map(playbook => 
          playbook.id === id 
            ? { ...playbook, title: updatedPlaybook.title, summary: updatedPlaybook.summary || (playbook as any).summary, updated_at: updatedPlaybook.updated_at }
            : playbook
        ))
        
        console.log('Temp playbook updated successfully:', id)
      } else {
        // Update remote playbook (requires authentication)
        if (!user?.id) {
          throw new Error('Authentication required to update saved playbooks')
        }
        
        const updatedPlaybook = await playbookService.updatePlaybook(id, updates)
        setCurrentPlaybook(updatedPlaybook)
        setLastSaved(new Date())
        hasUnsavedChangesRef.current = false
        
        // Update the playbook list
        setPlaybookList(prev => prev.map(playbook => 
          playbook.id === id 
            ? { ...playbook, title: updatedPlaybook.title, summary: updatedPlaybook.summary, updated_at: updatedPlaybook.updated_at! }
            : playbook
        ))
        
        console.log('Remote playbook updated successfully:', id)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update playbook'
      setError(errorMessage)
      console.error('Error updating playbook:', err)
      throw err
    } finally {
      setIsSaving(false)
    }
  }, [user?.id])

  // Delete a playbook
  const deletePlaybook = useCallback(async (id: string) => {
    setIsLoading(true)
    setError(null)
    
    try {
      console.log('Deleting playbook:', id)
      
      if (LocalPlaybookService.isTempPlaybook(id)) {
        // Delete temporary playbook
        LocalPlaybookService.deleteTempPlaybook(id)
        
        // If this was the current playbook, clear it
        if (currentPlaybook?.id === id) {
          setCurrentPlaybook(null)
          setLastSaved(null)
        }
        
        // Remove from the playbook list and update limits
        setPlaybookList(prev => prev.filter(playbook => playbook.id !== id))
        updateTempLimits()
        
        console.log('Temp playbook deleted successfully:', id)
      } else {
        // Delete remote playbook (requires authentication)
        if (!user?.id) {
          throw new Error('Authentication required to delete saved playbooks')
        }
        
        await playbookService.deletePlaybook(id)
        
        // If this was the current playbook, clear it
        if (currentPlaybook?.id === id) {
          setCurrentPlaybook(null)
          setLastSaved(null)
        }
        
        // Remove from the playbook list
        setPlaybookList(prev => prev.filter(playbook => playbook.id !== id))
        
        console.log('Remote playbook deleted successfully:', id)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete playbook'
      setError(errorMessage)
      console.error('Error deleting playbook:', err)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [user?.id, currentPlaybook?.id, updateTempLimits])

  // Duplicate a playbook
  const duplicatePlaybook = useCallback(async (id: string, newTitle?: string): Promise<PlaybookData | LocalPlaybook> => {
    setIsSaving(true)
    setError(null)
    
    try {
      console.log('Duplicating playbook:', id)
      
      let originalPlaybook: PlaybookData | LocalPlaybook | null = null
      
      if (LocalPlaybookService.isTempPlaybook(id)) {
        originalPlaybook = LocalPlaybookService.getTempPlaybook(id)
      } else {
        if (!user?.id) {
          throw new Error('Authentication required to duplicate saved playbooks')
        }
        originalPlaybook = await playbookService.getPlaybook(id)
      }
      
      if (!originalPlaybook) {
        throw new Error('Playbook not found')
      }
      
      const duplicatedData: Omit<PlaybookData, 'id'> = {
        title: newTitle || `${originalPlaybook.title} (Copy)`,
        content: originalPlaybook.content,
        summary: originalPlaybook.summary,
        tags: originalPlaybook.tags,
        is_public: false
      }
      
      const duplicatedPlaybook = await savePlaybook(duplicatedData)
      console.log('Playbook duplicated successfully:', duplicatedPlaybook.id)
      return duplicatedPlaybook
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to duplicate playbook'
      setError(errorMessage)
      console.error('Error duplicating playbook:', err)
      throw err
    } finally {
      setIsSaving(false)
    }
  }, [user?.id, savePlaybook])

  // Create a new empty playbook
  const createNewPlaybook = useCallback(() => {
    if (!canCreateMore && !isAuthenticated) {
      setError(`You can only create 2 playbooks without signing in. Please sign in to create more.`)
      return
    }
    
    setCurrentPlaybook(null)
    setLastSaved(null)
    hasUnsavedChangesRef.current = false
    clearError()
  }, [canCreateMore, isAuthenticated, clearError])

  // Update content with auto-save
  const updateContent = useCallback(async (content: any, title?: string) => {
    if (!currentPlaybook?.id) {
      console.log('No current playbook to update')
      return
    }

    hasUnsavedChangesRef.current = true
    
    // Clear existing timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current)
    }
    
    // Set new timeout for auto-save
    autoSaveTimeoutRef.current = setTimeout(async () => {
      try {
        await updatePlaybook(currentPlaybook.id, {
          content,
          ...(title && { title })
        })
      } catch (err) {
        console.error('Auto-save failed:', err)
        // Don't set error state for auto-save failures
      }
    }, 2000) // Auto-save after 2 seconds of inactivity
  }, [currentPlaybook?.id, updatePlaybook])

  // Update title
  const updateTitle = useCallback(async (title: string) => {
    if (!currentPlaybook?.id) {
      console.log('No current playbook to update title')
      return
    }

    try {
      await updatePlaybook(currentPlaybook.id, { title })
    } catch (err) {
      console.error('Error updating title:', err)
    }
  }, [currentPlaybook?.id, updatePlaybook])

  // Refresh playbook list (combines local and remote)
  const refreshPlaybookList = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      console.log('Refreshing playbook list')
      
      // Clean up non-temp playbooks from localStorage when in Guest Mode
      if (!user?.id) {
        LocalPlaybookService.cleanupNonTempPlaybooks()
      }
      
      const tempPlaybooks = LocalPlaybookService.getTempPlaybooks()
      let remotePlaybooks: PlaybookListItem[] = []
      
      // Only load remote playbooks if user is authenticated
      if (user?.id) {
        // Get playbooks where user is owner
        const ownedPlaybooks = await playbookService.getPlaybooks(user.id)
        
        // Get playbooks where user is a collaborator
        const { createSupabaseClient } = await import('@/lib/supabase')
        const supabase = createSupabaseClient()
        
        const { data: collaborations, error: collaborationError } = await supabase
          .from('collaborators')
          .select(`
            playbook_id,
            playbooks!inner(
              id, title, description, tags, is_public, created_at, updated_at, owner_id,
              is_marketplace, price, total_purchases, average_rating
            )
          `)
          .eq('user_id', user.id)
          .eq('status', 'accepted')
        
        if (collaborationError) {
          console.error('Error fetching collaborations:', collaborationError)
        }
        
        // Convert collaborations to PlaybookListItem format
        const collaborativePlaybooks: PlaybookListItem[] = (collaborations || [])
          .map((collab: any) => ({
            id: collab.playbooks.id,
            title: collab.playbooks.title,
            description: collab.playbooks.description,
            tags: collab.playbooks.tags,
            is_public: collab.playbooks.is_public,
            created_at: collab.playbooks.created_at,
            updated_at: collab.playbooks.updated_at,
            owner_id: collab.playbooks.owner_id,
            is_marketplace: collab.playbooks.is_marketplace,
            price: collab.playbooks.price,
            total_purchases: collab.playbooks.total_purchases,
            average_rating: collab.playbooks.average_rating
          }))
        
        // Combine owned and collaborative playbooks, removing duplicates
        const allRemotePlaybooks = [...ownedPlaybooks, ...collaborativePlaybooks]
        const uniquePlaybooks = allRemotePlaybooks.filter((playbook, index, self) => 
          index === self.findIndex(p => p.id === playbook.id)
        )
        
        // Temporarily disable purchase functionality to focus on marketplace status
        // TODO: Re-enable purchase functionality after fixing import issues
        remotePlaybooks = uniquePlaybooks
        
        console.log('Owned playbooks:', ownedPlaybooks.length)
        console.log('Collaborative playbooks:', collaborativePlaybooks.length)
        console.log('Total remote playbooks:', remotePlaybooks.length)
        // console.log('Sample playbook data:', JSON.stringify(remotePlaybooks[0], null, 2))
      }
      
      // In Guest Mode: only show temporary playbooks
      // When authenticated: show both temporary and remote playbooks
      let allPlaybooks = [...tempPlaybooks, ...remotePlaybooks]
      
      // In Guest Mode, filter out any non-temp playbooks that might have slipped through
      if (!user?.id) {
        allPlaybooks = allPlaybooks.filter(playbook => 
          LocalPlaybookService.isTempPlaybook(playbook.id)
        )
      }
      
      allPlaybooks = allPlaybooks
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      
      setPlaybookList(allPlaybooks)
      updateTempLimits()
      
      console.log('Playbook list refreshed:', allPlaybooks.length, 'playbooks (temp:', tempPlaybooks.length, ', remote:', remotePlaybooks.length, ')')
      console.log('Temp playbooks:', tempPlaybooks.map(p => ({ id: p.id, title: p.title })))
      console.log('Remote playbooks:', remotePlaybooks.map(p => ({ id: p.id, title: p.title })))
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch playbooks'
      setError(errorMessage)
      console.error('Error refreshing playbook list:', err)
    } finally {
      setIsLoading(false)
    }
  }, [user?.id, updateTempLimits])

  // Search playbooks
  const searchPlaybooks = useCallback(async (query: string) => {
    if (!query.trim()) {
      await refreshPlaybookList()
      return
    }

    setIsLoading(true)
    setError(null)
    
    try {
      console.log('Searching playbooks:', query)
      
      const tempPlaybooks = LocalPlaybookService.getTempPlaybooks()
      const tempResults = tempPlaybooks.filter(playbook => 
        playbook.title.toLowerCase().includes(query.toLowerCase()) ||
        (playbook.description && playbook.description.toLowerCase().includes(query.toLowerCase()))
      )
      
      let remoteResults: PlaybookListItem[] = []
      if (user?.id) {
        remoteResults = await playbookService.searchPlaybooks(user.id, query)
      }
      
      const allResults = [...tempResults, ...remoteResults]
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      
      setPlaybookList(allResults)
      console.log('Search completed:', allResults.length, 'results')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to search playbooks'
      setError(errorMessage)
      console.error('Error searching playbooks:', err)
    } finally {
      setIsLoading(false)
    }
  }, [user?.id, refreshPlaybookList])

  // Prompt user to sign in
  const promptSignIn = useCallback(() => {
    setError('Please sign in to save your playbooks and create unlimited playbooks.')
  }, [])

  // Load playbook list on mount and when user changes
  useEffect(() => {
    updateTempLimits()
    refreshPlaybookList()
  }, [user?.id, updateTempLimits, refreshPlaybookList])

  // Cleanup auto-save timeout on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current)
      }
    }
  }, [])

  return {
    // Current playbook state
    currentPlaybook,
    playbookList,
    isLoading,
    isSaving,
    lastSaved,
    error,
    
    // Authentication state
    isAuthenticated,
    isLoaded,
    tempPlaybookCount,
    canCreateMore,
    
    // Playbook actions
    loadPlaybook,
    savePlaybook,
    updatePlaybook,
    deletePlaybook,
    duplicatePlaybook,
    createNewPlaybook,
    
    // Content management
    updateContent,
    updateTitle,
    
    // List management
    refreshPlaybookList,
    searchPlaybooks,
    
    // Utility
    clearError,
    setCurrentPlaybook,
    promptSignIn
  }
}

