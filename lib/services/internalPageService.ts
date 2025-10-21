export interface InternalPage {
  id: string
  playbook_id: string
  page_name: string
  page_title: string
  content: string
  created_at: string
  updated_at: string
  created_by: string
}

export interface InternalPagePermission {
  id: string
  internal_page_id: string
  user_id: string
  permission_level: 'owner' | 'edit' | 'view'
  granted_by: string
  granted_at: string
}

export interface CreateInternalPageData {
  playbook_id: string
  page_name: string
  page_title: string
  content?: string
  created_by: string
  permissions: { userId: string; permission: 'owner' | 'edit' | 'view' }[]
}

export interface UpdateInternalPageData {
  page_name?: string
  page_title?: string
  content?: string
  permissions?: { userId: string; permission: 'owner' | 'edit' | 'view' }[]
}

class InternalPageService {
  // Get all internal pages for a playbook
  async getInternalPages(playbookId: string): Promise<InternalPage[]> {
    try {
      const response = await fetch(`/api/internal-pages?playbookId=${playbookId}`)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch internal pages')
      }

      const { data } = await response.json()
      return data || []
    } catch (error) {
      console.error('Error fetching internal pages:', error)
      throw error
    }
  }

  // Get a specific internal page by ID
  async getInternalPage(pageId: string): Promise<InternalPage | null> {
    try {
      const response = await fetch(`/api/internal-pages?id=${pageId}`)
      
      if (!response.ok) {
        return null
      }

      const { data } = await response.json()
      return data
    } catch (error) {
      console.error('Error fetching internal page:', error)
      return null
    }
  }

  // Create a new internal page with permissions
  async createInternalPage(data: CreateInternalPageData): Promise<InternalPage> {
    try {
      const response = await fetch('/api/internal-pages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create internal page')
      }

      const { data: pageData } = await response.json()
      return pageData
    } catch (error) {
      console.error('Error creating internal page:', error)
      throw error
    }
  }

  // Update an internal page
  async updateInternalPage(pageId: string, data: UpdateInternalPageData): Promise<InternalPage> {
    try {
      const response = await fetch('/api/internal-pages', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: pageId,
          ...data,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update internal page')
      }

      const { data: pageData } = await response.json()
      return pageData
    } catch (error) {
      console.error('Error updating internal page:', error)
      throw error
    }
  }

  // Delete an internal page (this will also delete permissions due to CASCADE)
  async deleteInternalPage(pageId: string): Promise<void> {
    try {
      const response = await fetch(`/api/internal-pages?id=${pageId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete internal page')
      }
    } catch (error) {
      console.error('Error deleting internal page:', error)
      throw error
    }
  }

  // Get permissions for an internal page
  async getInternalPagePermissions(pageId: string): Promise<InternalPagePermission[]> {
    try {
      const response = await fetch(`/api/internal-pages/permissions?pageId=${pageId}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch permissions')
      }

      const { data } = await response.json()
      return data || []
    } catch (error) {
      console.error('Error fetching internal page permissions:', error)
      return []
    }
  }

  // Check if user has permission to access an internal page
  async checkUserPermission(pageId: string, userId: string): Promise<'owner' | 'edit' | 'view' | null> {
    try {
      const response = await fetch(`/api/internal-pages/check-permission?pageId=${pageId}&userId=${userId}`)
      
      if (!response.ok) {
        return null
      }

      const { permission } = await response.json()
      return permission
    } catch (error) {
      console.error('Error checking user permission:', error)
      return null
    }
  }
}

export const internalPageService = new InternalPageService()
