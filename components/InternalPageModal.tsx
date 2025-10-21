import React, { useState, useEffect } from 'react'
import { X, FileText, Users } from 'lucide-react'

interface Collaborator {
  id: string
  name: string
  email: string
  permission_level: 'owner' | 'edit' | 'view'
}

interface InternalPageModalProps {
  isOpen: boolean
  onClose: () => void
  onCreatePage: (data: {
    pageName: string
    pageTitle: string
    collaborators: { userId: string; permission: 'owner' | 'edit' | 'view' }[]
  }) => void
  collaborators: Collaborator[]
}

export default function InternalPageModal({
  isOpen,
  onClose,
  onCreatePage,
  collaborators
}: InternalPageModalProps) {
  const [pageName, setPageName] = useState('')
  const [pageTitle, setPageTitle] = useState('')
  const [selectedCollaborators, setSelectedCollaborators] = useState<{ [userId: string]: 'owner' | 'edit' | 'view' }>({})

  useEffect(() => {
    if (isOpen) {
      setPageName('')
      setPageTitle('')
      setSelectedCollaborators({})
    }
  }, [isOpen])

  const handleCollaboratorToggle = (userId: string) => {
    setSelectedCollaborators(prev => {
      if (prev[userId]) {
        const { [userId]: removed, ...rest } = prev
        return rest
      } else {
        return { ...prev, [userId]: 'edit' } // Default to edit permission
      }
    })
  }

  const handlePermissionChange = (userId: string, permission: 'owner' | 'edit' | 'view') => {
    setSelectedCollaborators(prev => ({
      ...prev,
      [userId]: permission
    }))
  }

  const handleCreate = () => {
    if (!pageName.trim() || !pageTitle.trim()) {
      alert('Please enter both page name and title')
      return
    }

    const collaboratorData = Object.entries(selectedCollaborators).map(([userId, permission]) => ({
      userId,
      permission
    }))

    onCreatePage({
      pageName: pageName.trim(),
      pageTitle: pageTitle.trim(),
      collaborators: collaboratorData
    })

    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000]">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">Create Internal Page</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-100 transition-colors"
          >
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Page Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Page Name (for the link)
            </label>
            <input
              type="text"
              value={pageName}
              onChange={(e) => setPageName(e.target.value)}
              placeholder="e.g., Project Overview"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              autoFocus
            />
          </div>

          {/* Page Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Page Title (displayed at top of page)
            </label>
            <input
              type="text"
              value={pageTitle}
              onChange={(e) => setPageTitle(e.target.value)}
              placeholder="e.g., Project Overview - Q1 2024"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Collaborators Section */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Users className="h-4 w-4 text-gray-600" />
              <label className="text-sm font-medium text-gray-700">
                Give Access to Collaborators
              </label>
            </div>
            
            {collaborators.length === 0 ? (
              <p className="text-sm text-gray-500 italic">No collaborators available</p>
            ) : (
              <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-200 rounded-md p-2">
                {collaborators.map((collaborator) => (
                  <div key={collaborator.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={!!selectedCollaborators[collaborator.id]}
                        onChange={() => handleCollaboratorToggle(collaborator.id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {collaborator.name}
                        </div>
                        <div className="text-xs text-gray-500">
                          {collaborator.email}
                        </div>
                      </div>
                    </div>
                    
                    {selectedCollaborators[collaborator.id] && (
                      <select
                        value={selectedCollaborators[collaborator.id]}
                        onChange={(e) => handlePermissionChange(collaborator.id, e.target.value as 'owner' | 'edit' | 'view')}
                        className="text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="view">View</option>
                        <option value="edit">Edit</option>
                        <option value="owner">Owner</option>
                      </select>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Create Page & Link
          </button>
        </div>
      </div>
    </div>
  )
}
