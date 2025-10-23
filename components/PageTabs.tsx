import React from 'react'
import { X, FileText, Edit } from 'lucide-react'

interface InternalPage {
  id: string
  name: string
  title: string
  content: string
  created_by?: string
  permissions?: { user_id: string; permission_level: 'owner' | 'edit' | 'view' }[]
}

interface PageTabsProps {
  currentPageId: string | null
  internalPages: InternalPage[]
  onPageSelect: (pageId: string | null) => void
  onPageClose: (pageId: string) => void
  onPageEdit: (pageId: string) => void
  currentUserId?: string
}

export default function PageTabs({
  currentPageId,
  internalPages,
  onPageSelect,
  onPageClose,
  onPageEdit,
  currentUserId,
}: PageTabsProps) {
  const handleCloseClick = (e: React.MouseEvent, pageId: string) => {
    e.stopPropagation()
    onPageClose(pageId)
  }

  const handleEditClick = (e: React.MouseEvent, pageId: string) => {
    e.stopPropagation()
    onPageEdit(pageId)
  }

  // Check if current user can edit a page (creator or owner permission)
  const canEditPage = (page: InternalPage): boolean => {
    if (!currentUserId) return false
    
    // Check if user is the creator
    if (page.created_by === currentUserId) return true
    
    // Check if user has owner permission
    if (page.permissions) {
      const userPermission = page.permissions.find(p => p.user_id === currentUserId)
      if (userPermission && userPermission.permission_level === 'owner') return true
    }
    
    return false
  }

  return (
    <div className="flex items-center border-b border-gray-200 bg-gray-50">
      {/* Main Page Tab */}
      <button
        onClick={() => onPageSelect(null)}
        className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
          currentPageId === null
            ? 'border-blue-500 text-blue-600 bg-white'
            : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
        }`}
      >
        <FileText className="h-4 w-4" />
        Main Page
      </button>

      {/* Internal Page Tabs */}
      {internalPages.map((page) => (
        <div
          key={page.id}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors group ${
            currentPageId === page.id
              ? 'border-blue-500 text-blue-600 bg-white'
              : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
          }`}
        >
          <button
            onClick={() => onPageSelect(page.id)}
            className="flex items-center gap-2 flex-1 min-w-0"
          >
            <FileText className="h-4 w-4 flex-shrink-0" />
            <span className="max-w-32 truncate" title={page.title}>
              {page.name}
            </span>
          </button>
          {canEditPage(page) && (
            <button
              onClick={(e) => handleEditClick(e, page.id)}
              className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-gray-200 transition-all flex-shrink-0"
              title="Edit page"
            >
              <Edit className="h-3 w-3" />
            </button>
          )}
          <button
            onClick={(e) => handleCloseClick(e, page.id)}
            className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-gray-200 transition-all flex-shrink-0"
            title="Close tab"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ))}
    </div>
  )
}
