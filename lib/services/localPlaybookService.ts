import { PlaybookData } from './playbookService'

const STORAGE_KEY = 'playbooq-temp-playbooks'
const MAX_TEMP_PLAYBOOKS = 2

export interface LocalPlaybook extends Omit<PlaybookData, 'id' | 'owner_id' | 'created_at' | 'updated_at'> {
  id: string
  created_at: string
  updated_at: string
  is_temp: boolean
  is_purchased?: boolean
}

export class LocalPlaybookService {
  /**
   * Get all temporary playbooks from localStorage
   */
  static getTempPlaybooks(): LocalPlaybook[] {
    if (typeof window === 'undefined') return []
    
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (!stored) return []
      
      const playbooks = JSON.parse(stored)
      return Array.isArray(playbooks) ? playbooks : []
    } catch (error) {
      console.error('Error reading temp playbooks from localStorage:', error)
      return []
    }
  }

  /**
   * Save a temporary playbook to localStorage
   */
  static saveTempPlaybook(playbookData: Omit<LocalPlaybook, 'id' | 'created_at' | 'updated_at' | 'is_temp'>): LocalPlaybook {
    if (typeof window === 'undefined') {
      throw new Error('localStorage not available')
    }

    const existingPlaybooks = this.getTempPlaybooks()
    
    // Check if we've reached the limit
    if (existingPlaybooks.length >= MAX_TEMP_PLAYBOOKS) {
      throw new Error(`You can only create ${MAX_TEMP_PLAYBOOKS} playbooks without signing in. Please sign in to create more.`)
    }

    const newPlaybook: LocalPlaybook = {
      ...playbookData,
      id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_temp: true
    }

    const updatedPlaybooks = [...existingPlaybooks, newPlaybook]
    
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedPlaybooks))
      console.log('Temp playbook saved:', newPlaybook.id)
      return newPlaybook
    } catch (error) {
      console.error('Error saving temp playbook to localStorage:', error)
      throw new Error('Failed to save playbook locally')
    }
  }

  /**
   * Update a temporary playbook in localStorage
   */
  static updateTempPlaybook(id: string, updates: Partial<LocalPlaybook>): LocalPlaybook {
    if (typeof window === 'undefined') {
      throw new Error('localStorage not available')
    }

    const existingPlaybooks = this.getTempPlaybooks()
    const playbookIndex = existingPlaybooks.findIndex(p => p.id === id)
    
    if (playbookIndex === -1) {
      throw new Error('Playbook not found')
    }

    const updatedPlaybook: LocalPlaybook = {
      ...existingPlaybooks[playbookIndex],
      ...updates,
      updated_at: new Date().toISOString()
    }

    const updatedPlaybooks = [...existingPlaybooks]
    updatedPlaybooks[playbookIndex] = updatedPlaybook
    
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedPlaybooks))
      console.log('Temp playbook updated:', id)
      return updatedPlaybook
    } catch (error) {
      console.error('Error updating temp playbook in localStorage:', error)
      throw new Error('Failed to update playbook locally')
    }
  }

  /**
   * Delete a temporary playbook from localStorage
   */
  static deleteTempPlaybook(id: string): void {
    if (typeof window === 'undefined') {
      throw new Error('localStorage not available')
    }

    const existingPlaybooks = this.getTempPlaybooks()
    const filteredPlaybooks = existingPlaybooks.filter(p => p.id !== id)
    
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filteredPlaybooks))
      console.log('Temp playbook deleted:', id)
    } catch (error) {
      console.error('Error deleting temp playbook from localStorage:', error)
      throw new Error('Failed to delete playbook locally')
    }
  }

  /**
   * Get a specific temporary playbook by ID
   */
  static getTempPlaybook(id: string): LocalPlaybook | null {
    const playbooks = this.getTempPlaybooks()
    return playbooks.find(p => p.id === id) || null
  }

  /**
   * Check if user can create more temporary playbooks
   */
  static canCreateTempPlaybook(): boolean {
    const existingPlaybooks = this.getTempPlaybooks()
    return existingPlaybooks.length < MAX_TEMP_PLAYBOOKS
  }

  /**
   * Get the number of temporary playbooks created
   */
  static getTempPlaybookCount(): number {
    return this.getTempPlaybooks().length
  }

  /**
   * Clear all temporary playbooks (useful when user signs in)
   */
  static clearTempPlaybooks(): void {
    if (typeof window === 'undefined') return
    
    try {
      localStorage.removeItem(STORAGE_KEY)
      console.log('All temp playbooks cleared')
    } catch (error) {
      console.error('Error clearing temp playbooks:', error)
    }
  }

  /**
   * Check if a playbook ID is a temporary playbook
   */
  static isTempPlaybook(id: string): boolean {
    return typeof id === 'string' && id.startsWith('temp-')
  }

  /**
   * Clean up non-temp playbooks from localStorage (for Guest Mode)
   */
  static cleanupNonTempPlaybooks(): void {
    if (typeof window === 'undefined') return
    
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (!stored) return
      
      const playbooks = JSON.parse(stored)
      if (!Array.isArray(playbooks)) return
      
      // Filter out non-temp playbooks
      const tempPlaybooks = playbooks.filter((playbook: any) => 
        this.isTempPlaybook(playbook.id)
      )
      
      // If we removed any playbooks, update localStorage
      if (tempPlaybooks.length !== playbooks.length) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(tempPlaybooks))
        console.log('Cleaned up non-temp playbooks from localStorage')
      }
    } catch (error) {
      console.error('Error cleaning up non-temp playbooks:', error)
    }
  }
}


