import { useState, useCallback, useEffect, useRef } from 'react'
import { useUser } from '@clerk/nextjs'
import { playbookService, PlaybookData, PlaybookListItem } from '@/lib/services/playbookService'

interface UsePlaybookManagerReturn {
  // Current playbook state
  currentPlaybook: PlaybookData | null
  playbookList: PlaybookListItem[]
  isLoading: boolean
  isSaving: boolean
  lastSaved: Date | null
  error: string | null
  
  // Playbook actions
  loadPlaybook: (id: string) => Promise<void>
  savePlaybook: (playbookData: Omit<PlaybookData, 'id'>) => Promise<PlaybookData>
  updatePlaybook: (id: string, updates: Partial<PlaybookData>) => Promise<void>
  deletePlaybook: (id: string) => Promise<void>
  duplicatePlaybook: (id: string, newTitle?: string) => Promise<PlaybookData>
  createNewPlaybook: () => void
  
  // Content management
  updateContent: (content: any, title?: string) => Promise<void>
  updateTitle: (title: string) => Promise<void>
  
  // List management
  refreshPlaybookList: () => Promise<void>
  searchPlaybooks: (query: string) => Promise<void>
  
  // Utility
  clearError: () => void
  setCurrentPlaybook: (playbook: PlaybookData | null) => void
}

export function usePlaybookManager(): UsePlaybookManagerReturn {
  const { user } = useUser()
  const [currentPlaybook, setCurrentPlaybook] = useState<PlaybookData | null>(null)
  const [playbookList, setPlaybookList] = useState<PlaybookListItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  // Auto-save functionality
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const hasUnsavedChangesRef = useRef(false)

  // Clear error
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  // Load a specific playbook
  const loadPlaybook = useCallback(async (id: string) => {
    if (!user?.id) {
      setError('User not authenticated')
      return
    }

    setIsLoading(true)
    setError(null)
    
    try {
      console.log('Loading playbook:', id)
      const playbook = await playbookService.getPlaybook(id)
      
      // Verify ownership
      if (playbook.owner_id !== user.id) {
        throw new Error('You do not have permission to access this playbook')
      }
      
      setCurrentPlaybook(playbook)
      setLastSaved(new Date())
      hasUnsavedChangesRef.current = false
      console.log('Playbook loaded successfully:', playbook.title)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load playbook'
      setError(errorMessage)
      console.error('Error loading playbook:', err)
    } finally {
      setIsLoading(false)
    }
  }, [user?.id])

  // Save a new playbook
  const savePlaybook = useCallback(async (playbookData: Omit<PlaybookData, 'id'>): Promise<PlaybookData> => {
    if (!user?.id) {
      throw new Error('User not authenticated')
    }

    setIsSaving(true)
    setError(null)
    
    try {
      console.log('Saving new playbook:', playbookData.title)
      const savedPlaybook = await playbookService.savePlaybook({
        ...playbookData,
        owner_id: user.id
      })
      
      setCurrentPlaybook(savedPlaybook)
      setLastSaved(new Date())
      hasUnsavedChangesRef.current = false
      
      // Refresh the playbook list
      await refreshPlaybookList()
      
      console.log('Playbook saved successfully:', savedPlaybook.id)
      return savedPlaybook
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save playbook'
      setError(errorMessage)
      console.error('Error saving playbook:', err)
      throw err
    } finally {
      setIsSaving(false)
    }
  }, [user?.id])

  // Update an existing playbook
  const updatePlaybook = useCallback(async (id: string, updates: Partial<PlaybookData>) => {
    if (!user?.id) {
      throw new Error('User not authenticated')
    }

    setIsSaving(true)
    setError(null)
    
    try {
      console.log('Updating playbook:', id, updates)
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
      
      console.log('Playbook updated successfully:', id)
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
    if (!user?.id) {
      throw new Error('User not authenticated')
    }

    setIsLoading(true)
    setError(null)
    
    try {
      console.log('Deleting playbook:', id)
      await playbookService.deletePlaybook(id)
      
      // If this was the current playbook, clear it
      if (currentPlaybook?.id === id) {
        setCurrentPlaybook(null)
        setLastSaved(null)
      }
      
      // Remove from the playbook list
      setPlaybookList(prev => prev.filter(playbook => playbook.id !== id))
      
      console.log('Playbook deleted successfully:', id)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete playbook'
      setError(errorMessage)
      console.error('Error deleting playbook:', err)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [user?.id, currentPlaybook?.id])

  // Duplicate a playbook
  const duplicatePlaybook = useCallback(async (id: string, newTitle?: string): Promise<PlaybookData> => {
    if (!user?.id) {
      throw new Error('User not authenticated')
    }

    setIsSaving(true)
    setError(null)
    
    try {
      console.log('Duplicating playbook:', id)
      const duplicatedPlaybook = await playbookService.duplicatePlaybook(id, newTitle)
      
      // Refresh the playbook list to include the new duplicate
      await refreshPlaybookList()
      
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
  }, [user?.id])

  // Create a new empty playbook
  const createNewPlaybook = useCallback(() => {
    setCurrentPlaybook(null)
    setLastSaved(null)
    hasUnsavedChangesRef.current = false
    clearError()
  }, [clearError])

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

  // Refresh playbook list
  const refreshPlaybookList = useCallback(async () => {
    if (!user?.id) {
      setPlaybookList([])
      return
    }

    setIsLoading(true)
    setError(null)
    
    try {
      console.log('Refreshing playbook list')
      const playbooks = await playbookService.getPlaybooks(user.id)
      setPlaybookList(playbooks)
      console.log('Playbook list refreshed:', playbooks.length, 'playbooks')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch playbooks'
      setError(errorMessage)
      console.error('Error refreshing playbook list:', err)
    } finally {
      setIsLoading(false)
    }
  }, [user?.id])

  // Search playbooks
  const searchPlaybooks = useCallback(async (query: string) => {
    if (!user?.id) {
      setPlaybookList([])
      return
    }

    if (!query.trim()) {
      await refreshPlaybookList()
      return
    }

    setIsLoading(true)
    setError(null)
    
    try {
      console.log('Searching playbooks:', query)
      const playbooks = await playbookService.searchPlaybooks(user.id, query)
      setPlaybookList(playbooks)
      console.log('Search completed:', playbooks.length, 'results')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to search playbooks'
      setError(errorMessage)
      console.error('Error searching playbooks:', err)
    } finally {
      setIsLoading(false)
    }
  }, [user?.id, refreshPlaybookList])

  // Load playbook list on mount and when user changes
  useEffect(() => {
    if (user?.id) {
      refreshPlaybookList()
    } else {
      setPlaybookList([])
      setCurrentPlaybook(null)
    }
  }, [user?.id, refreshPlaybookList])

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
    setCurrentPlaybook
  }
}

