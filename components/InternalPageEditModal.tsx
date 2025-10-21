import React, { useState, useEffect } from 'react'
import { User } from '@supabase/supabase-js'
import { X, AlertTriangle } from 'lucide-react'

interface InternalPageEditModalProps {
  isOpen: boolean
  onClose: () => void
  onUpdate: (data: {
    pageName: string
    pageTitle: string
    collaborators: { userId: string; permission: 'owner' | 'edit' | 'view' }[]
  }) => void
  onDelete: () => void
  page: { id: string; name: string; title: string; content: string }
  collaborators: User[]
}

const InternalPageEditModal: React.FC<InternalPageEditModalProps> = ({
  isOpen,
  onClose,
  onUpdate,
  onDelete,
  page,
  collaborators,
}) => {
  const [pageName, setPageName] = useState('')
  const [pageTitle, setPageTitle] = useState('')
  const [selectedCollaborators, setSelectedCollaborators] = useState<{ userId: string; permission: 'owner' | 'edit' | 'view' }[]>([])
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  useEffect(() => {
    if (isOpen && page) {
      setPageName(page.name)
      setPageTitle(page.title)
      // Initialize with empty collaborators for now - in a real implementation,
      // you'd fetch the current permissions from the database
      setSelectedCollaborators([])
      setShowDeleteConfirm(false)
    }
  }, [isOpen, page])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!pageName.trim() || !pageTitle.trim()) return

    onUpdate({
      pageName: pageName.trim(),
      pageTitle: pageTitle.trim(),
      collaborators: selectedCollaborators,
    })
  }

  const handleDelete = () => {
    setShowDeleteConfirm(true)
  }

  const confirmDelete = () => {
    onDelete()
    setShowDeleteConfirm(false)
  }

  const cancelDelete = () => {
    setShowDeleteConfirm(false)
  }

  const handleToggleUser = (userId: string) => {
    setSelectedCollaborators(prev => {
      const existing = prev.find(c => c.userId === userId)
      if (existing) {
        return prev.filter(c => c.userId !== userId)
      } else {
        return [...prev, { userId, permission: 'view' as const }]
      }
    })
  }

  const handlePermissionChange = (userId: string, permission: 'owner' | 'edit' | 'view') => {
    setSelectedCollaborators(prev =>
      prev.map(c => c.userId === userId ? { ...c, permission } : c)
    )
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Edit Internal Page</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Page Name */}
          <div>
            <label htmlFor="pageName" className="block text-sm font-medium text-gray-700 mb-2">
              Page Name (for the link)
            </label>
            <input
              type="text"
              id="pageName"
              value={pageName}
              onChange={(e) => setPageName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter page name for the link"
              required
            />
          </div>

          {/* Page Title */}
          <div>
            <label htmlFor="pageTitle" className="block text-sm font-medium text-gray-700 mb-2">
              Page Title
            </label>
            <input
              type="text"
              id="pageTitle"
              value={pageTitle}
              onChange={(e) => setPageTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter page title"
              required
            />
          </div>

          {/* Collaborators */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Page Permissions
            </label>
            <div className="space-y-3 max-h-48 overflow-y-auto border border-gray-200 rounded-md p-3">
              {collaborators.map((collaborator) => {
                const isSelected = selectedCollaborators.some(c => c.userId === collaborator.id)
                const permission = selectedCollaborators.find(c => c.userId === collaborator.id)?.permission || 'view'

                return (
                  <div key={collaborator.id} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        id={`collaborator-${collaborator.id}`}
                        checked={isSelected}
                        onChange={() => handleToggleUser(collaborator.id)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor={`collaborator-${collaborator.id}`} className="text-sm text-gray-700">
                        {collaborator.user_metadata?.full_name || collaborator.email}
                      </label>
                    </div>
                    {isSelected && (
                      <select
                        value={permission}
                        onChange={(e) => handlePermissionChange(collaborator.id, e.target.value as 'owner' | 'edit' | 'view')}
                        className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="view">View</option>
                        <option value="edit">Edit</option>
                        <option value="owner">Owner</option>
                      </select>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={handleDelete}
              className="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md transition-colors"
            >
              Delete Page
            </button>
            
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
              >
                Update
              </button>
            </div>
          </div>
        </form>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
              <div className="p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Delete Page</h3>
                </div>
                <p className="text-gray-600 mb-6">
                  Are you sure you want to delete this internal page? This action cannot be undone and will remove all content and permissions.
                </p>
                <div className="flex space-x-3 justify-end">
                  <button
                    onClick={cancelDelete}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmDelete}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors"
                  >
                    Delete Page
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default InternalPageEditModal
