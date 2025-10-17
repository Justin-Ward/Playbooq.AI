'use client'

import { useState, useRef, useEffect } from 'react'
import { PlaybookListItem } from '@/lib/services/playbookService'
import { LocalPlaybook } from '@/lib/services/localPlaybookService'
import { 
  Search, 
  Plus, 
  MoreVertical, 
  FileText, 
  Star, 
  Trash2, 
  Copy,
  Calendar,
  Tag,
  ChevronDown,
  ChevronRight,
  List
} from 'lucide-react'
import LoadingSkeleton, { PlaybookListItemSkeleton } from './LoadingSkeleton'
import ContextMenu from './ContextMenu'
import Link from 'next/link'

interface PlaybookSection {
  id: string
  title: string
  level: number
  sectionNumber: string
}

interface PlaybookSidebarProps {
  onPlaybookSelect: (playbook: any) => void
  onNewPlaybook: () => void
  className?: string
  isAuthenticated?: boolean
  tempPlaybookCount?: number
  canCreateMore?: boolean
  playbookList?: (PlaybookListItem | LocalPlaybook)[]
  isLoading?: boolean
  error?: string | null
  loadPlaybook?: (id: string) => Promise<void>
  deletePlaybook?: (id: string) => Promise<void>
  duplicatePlaybook?: (id: string, newTitle?: string) => Promise<any>
  searchPlaybooks?: (query: string) => Promise<void>
  refreshPlaybookList?: () => Promise<void>
  clearError?: () => void
  tableOfContents?: PlaybookSection[]
  onScrollToHeading?: (title: string) => void
}

export default function PlaybookSidebar({
  onPlaybookSelect,
  onNewPlaybook,
  className = '',
  isAuthenticated = false,
  tempPlaybookCount = 0,
  canCreateMore = true,
  playbookList = [],
  isLoading = false,
  error = null,
  loadPlaybook = async () => {},
  deletePlaybook = async () => {},
  duplicatePlaybook = async () => {},
  searchPlaybooks = async () => {},
  refreshPlaybookList = async () => {},
  clearError = () => {},
  tableOfContents = [],
  onScrollToHeading = () => {}
}: PlaybookSidebarProps) {

  const [searchQuery, setSearchQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [selectedPlaybookId, setSelectedPlaybookId] = useState<string | null>(null)
  const [tocExpanded, setTocExpanded] = useState(true)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Focus search input when search is shown
  useEffect(() => {
    if (showSearch && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [showSearch])

  // Handle search
  const handleSearch = async (query: string) => {
    setSearchQuery(query)
    await searchPlaybooks(query)
  }

  // Handle playbook selection
  const handlePlaybookSelect = async (playbook: PlaybookListItem | LocalPlaybook) => {
    const playbookId = String(playbook.id) // Ensure it's a string
    setSelectedPlaybookId(playbookId)
    await loadPlaybook(playbookId)
    onPlaybookSelect(playbook)
  }

  // Handle playbook actions
  const handleDeletePlaybook = async (playbookId: string, event?: React.MouseEvent) => {
    if (event && event.stopPropagation) {
      event.stopPropagation()
    }
    if (window.confirm('Are you sure you want to delete this playbook?')) {
      try {
        await deletePlaybook(playbookId)
        if (selectedPlaybookId === playbookId) {
          setSelectedPlaybookId(null)
        }
      } catch (error) {
        console.error('Error deleting playbook:', error)
      }
    }
  }

  const handleDuplicatePlaybook = async (playbook: PlaybookListItem | LocalPlaybook, event?: React.MouseEvent) => {
    if (event && event.stopPropagation) {
      event.stopPropagation()
    }
    try {
      await duplicatePlaybook(playbook.id, `${playbook.title} (Copy)`)
    } catch (error) {
      console.error('Error duplicating playbook:', error)
    }
  }

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 1) return 'Today'
    if (diffDays === 2) return 'Yesterday'
    if (diffDays <= 7) return `${diffDays - 1} days ago`
    return date.toLocaleDateString()
  }

  return (
    <div className={`h-full flex flex-col bg-white border-r border-gray-200 ${className}`}>
      {/* Top Header with Navigation */}
      <div className="p-4">
        <div className="flex items-center gap-3 mb-4">
          <Link 
            href="/" 
            className="text-xl font-bold text-blue-600 hover:text-blue-700 transition-colors"
          >
            Playbooq.AI
          </Link>
          <div className="h-6 w-px bg-gray-300 flex-shrink-0"></div>
          <Link 
            href="/marketplace" 
            className="text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
          >
            Marketplace
          </Link>
        </div>
      </div>

      {/* Dividing Line */}
      <div className="border-b border-gray-300"></div>

      {/* My Playbooks Section */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">My Playbooks</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSearch(!showSearch)}
              className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
              title="Search playbooks"
            >
              <Search className="h-4 w-4" />
            </button>
            <button
              onClick={onNewPlaybook}
              className={`p-1.5 rounded-md transition-colors ${
                !canCreateMore && !isAuthenticated
                  ? 'text-gray-300 cursor-not-allowed'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
              title={!canCreateMore && !isAuthenticated ? "Sign in to create more playbooks" : "New playbook"}
              disabled={!canCreateMore && !isAuthenticated}
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Freemium Status */}
        {!isAuthenticated && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-md">
            <div className="flex items-center gap-2 text-sm">
              <div className="h-2 w-2 bg-amber-500 rounded-full"></div>
              <span className="text-amber-800 font-medium">Guest Mode</span>
            </div>
            <p className="text-xs text-amber-700 mt-1">
              {tempPlaybookCount}/2 free playbooks used
            </p>
            {tempPlaybookCount >= 2 && (
              <p className="text-xs text-amber-700 mt-1 font-medium">
                Sign in to create unlimited playbooks
              </p>
            )}
          </div>
        )}

        {/* Search */}
        {showSearch && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search playbooks..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        )}
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 bg-red-50 border-b border-red-200">
          <div className="flex items-center justify-between">
            <p className="text-sm text-red-600">{error}</p>
            <button
              onClick={clearError}
              className="text-red-400 hover:text-red-600"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Playbook List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <PlaybookListItemSkeleton key={i} />
            ))}
          </div>
        ) : playbookList.length === 0 ? (
          <div className="p-8 text-center">
            <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-sm mb-4">
              {searchQuery ? 'No playbooks found matching your search.' : 'No playbooks yet.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {playbookList.map((playbook) => (
              <ContextMenu
                key={playbook.id}
                onDuplicate={() => handleDuplicatePlaybook(playbook)}
                onDelete={() => handleDeletePlaybook(playbook.id)}
              >
                <div
                  onClick={() => handlePlaybookSelect(playbook)}
                  className={`p-3 cursor-pointer transition-colors hover:bg-gray-50 ${
                    selectedPlaybookId === playbook.id ? 'bg-blue-50 border-r-2 border-blue-500' : ''
                  }`}
                >
                  <div className="relative" style={{ width: '100%', minWidth: 0 }}>
                    <h3 
                      className="text-sm font-medium text-gray-900 leading-tight pr-6 break-words overflow-wrap-anywhere"
                      style={{ 
                        wordBreak: 'break-word', 
                        overflowWrap: 'anywhere',
                        whiteSpace: 'normal',
                        display: 'block',
                        maxWidth: '100%'
                      }}
                      title={playbook.title}
                    >
                      {playbook.title}
                    </h3>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        // Context menu will handle this
                      }}
                      className="absolute top-0 right-0 p-0.5 text-gray-400 hover:text-gray-600 opacity-60 hover:opacity-100 transition-opacity"
                    >
                      <MoreVertical className="h-3 w-3" />
                    </button>
                  </div>
                  
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDate(playbook.updated_at)}
                    </div>
                    
                    {/* Marketplace Status - inline with date */}
                    {playbook.is_marketplace && (
                      <>
                        <div className="h-3 w-px bg-gray-300"></div>
                        <div className="text-green-600 font-medium">
                          In the Marketplace
                        </div>
                      </>
                    )}
                    
                    {'is_temp' in playbook && playbook.is_temp && (
                      <div className="flex items-center gap-1 text-amber-600">
                        <div className="h-2 w-2 bg-amber-500 rounded-full"></div>
                        Temp
                      </div>
                    )}
                    {playbook.tags && playbook.tags.length > 0 && (
                      <div className="flex items-center gap-1">
                        <Tag className="h-3 w-3" />
                        {playbook.tags.length}
                      </div>
                    )}
                    {playbook.is_public && (
                      <div className="flex items-center gap-1">
                        <Star className="h-3 w-3" />
                        Public
                      </div>
                    )}
                  </div>
                  
                  {/* Purchased Status - on separate line if needed */}
                  {'is_purchased' in playbook && playbook.is_purchased && (
                    <div className="mt-1 text-xs">
                      <div className="text-blue-600 font-medium">
                        Purchased from Marketplace
                      </div>
                    </div>
                  )}
                </div>
              </ContextMenu>
            ))}
          </div>
        )}
      </div>

      {/* Table of Contents */}
      <div className="border-t border-gray-200">
        <button
          onClick={() => setTocExpanded(!tocExpanded)}
          className="w-full p-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <List className="h-4 w-4 text-gray-500" />
            <h3 className="text-sm font-semibold text-gray-900">Table of Contents</h3>
          </div>
          {tocExpanded ? (
            <ChevronDown className="h-4 w-4 text-gray-500" />
          ) : (
            <ChevronRight className="h-4 w-4 text-gray-500" />
          )}
        </button>
        
        {tocExpanded && (
          <div className="max-h-48 overflow-y-auto border-t border-gray-200">
            {tableOfContents.length === 0 ? (
              <div className="p-3 text-center">
                <p className="text-xs text-gray-500">No headings found</p>
              </div>
            ) : (
              <div className="p-2">
                <div className="space-y-1">
                  {tableOfContents.map((section, index) => (
                    <button
                      key={section.id}
                      onClick={() => onScrollToHeading(section.title)}
                      className={`block w-full text-left px-2 py-1 text-xs rounded hover:bg-gray-100 transition-colors truncate ${
                        section.level === 1 ? 'font-medium' : ''
                      }`}
                      style={{ paddingLeft: `${(section.level - 1) * 12 + 8}px` }}
                      title={section.title}
                    >
                      {section.sectionNumber && `${section.sectionNumber}. `}{section.title}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex flex-col">
            <span>{playbookList.length} playbook{playbookList.length !== 1 ? 's' : ''}</span>
            {!isAuthenticated && tempPlaybookCount > 0 && (
              <span className="text-amber-600">
                {tempPlaybookCount} temporary
              </span>
            )}
          </div>
          <button
            onClick={refreshPlaybookList}
            className="text-blue-600 hover:text-blue-700 transition-colors"
            disabled={isLoading}
          >
            Refresh
          </button>
        </div>
      </div>
    </div>
  )
}
