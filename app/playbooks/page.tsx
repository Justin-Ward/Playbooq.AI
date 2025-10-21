'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useUser } from '@clerk/nextjs'
import { useSearchParams } from 'next/navigation'
import { 
  ChevronLeft, 
  ChevronRight, 
  ChevronDown, 
  ChevronUp,
  FileText,
  Star,
  StarOff,
  Users,
  PanelLeftOpen,
  PanelLeftClose,
  PanelRightOpen,
  PanelRightClose,
  Save,
  Lock,
  AlertCircle,
} from 'lucide-react'
import PlaybookEditor, { extractTableOfContents } from '@/components/PlaybookEditor'
import PlaybookGenerator from '@/components/PlaybookGenerator'
import PlaybookSidebar from '@/components/PlaybookSidebar'
import CollaboratorsModal from '@/components/CollaboratorsModal'
import PlaybookChat from '@/components/PlaybookChat'
import LoadingSkeleton from '@/components/LoadingSkeleton'
import MarketplaceModal from '@/components/MarketplaceModal'
import { useEnhancedPlaybookManager } from '@/lib/hooks/useEnhancedPlaybookManager'
import { useGeneratePlaybook } from '@/lib/hooks/useGeneratePlaybook'
import { LocalPlaybookService } from '@/lib/services/localPlaybookService'
import { playbookService } from '@/lib/services/playbookService'
import Link from 'next/link'

export default function PlaybooksPage() {
  const { user, isLoaded: isUserLoaded } = useUser()
  const searchParams = useSearchParams()
  const {
    playbookList,
    currentPlaybook,
    setCurrentPlaybook,
    loadPlaybook,
    savePlaybook,
    deletePlaybook,
    duplicatePlaybook,
    createNewPlaybook,
    searchPlaybooks,
    refreshPlaybookList,
    isAuthenticated,
    tempPlaybookCount,
    canCreateMore,
    isLoading,
    error,
    clearError,
    isSaving,
    lastSaved,
    updateContent,
    updateTitle,
  } = useEnhancedPlaybookManager()

  const {
    generatePlaybook,
    isGenerating,
  } = useGeneratePlaybook()

  const [editorContent, setEditorContent] = useState<string>('')
  const [playbookTitle, setPlaybookTitle] = useState('Untitled Playbook')
  const [leftSidebarCollapsed, setLeftSidebarCollapsed] = useState(false)
  const [rightSidebarCollapsed, setRightSidebarCollapsed] = useState(false)
  const [aiGenerationExpanded, setAiGenerationExpanded] = useState(true)
  const [showSignInPrompt, setShowSignInPrompt] = useState(false)
  const [showCollaboratorsModal, setShowCollaboratorsModal] = useState(false)
  const [showChat, setShowChat] = useState(false)
  const [showMarketplaceModal, setShowMarketplaceModal] = useState(false)
  const [tableOfContents, setTableOfContents] = useState<Array<{ id: string; title: string; level: number; sectionNumber: string }>>([])
  const [playbookCollaborators, setPlaybookCollaborators] = useState<Array<{ id: string; name: string; email: string }>>([])
  const [currentPageId, setCurrentPageId] = useState<string | null>(null)
  const [generatedContent, setGeneratedContent] = useState<any>(null)
  
  const titleInputRef = useRef<HTMLTextAreaElement>(null)

  // Fetch collaborators when playbook changes
  useEffect(() => {
    const fetchCollaborators = async () => {
      if (currentPlaybook && currentPlaybook.id && !currentPlaybook.id.startsWith('temp_')) {
        try {
          const collaborators = await playbookService.getCollaborators(currentPlaybook.id)
          const formattedCollaborators = collaborators.map((c: {
            user_id: string
            user_name: string
            user_email: string
          }) => ({
            id: c.user_id,
            name: c.user_name || 'Unknown User',
            email: c.user_email || ''
          }))
          setPlaybookCollaborators(formattedCollaborators)
        } catch (error) {
          console.error('Error fetching collaborators:', error)
          setPlaybookCollaborators([])
        }
      } else {
        setPlaybookCollaborators([])
      }
    }

    fetchCollaborators()
  }, [currentPlaybook?.id])

  useEffect(() => {
    if (currentPlaybook) {
      setEditorContent(currentPlaybook.content || '')
      setPlaybookTitle(currentPlaybook.title || 'Untitled Playbook')
      
      // Update table of contents when loading a playbook
      const toc = extractTableOfContents(currentPlaybook.content || '')
      setTableOfContents(toc)
    } else {
      setEditorContent('')
      setPlaybookTitle('Untitled Playbook')
      setTableOfContents([])
    }
  }, [currentPlaybook])

  const handleEditorChange = useCallback((content: string) => {
    setEditorContent(content)
    updateContent(content)
    
    // Update table of contents
    const toc = extractTableOfContents(content)
    setTableOfContents(toc)
  }, [updateContent])

  const handleTitleChange = useCallback((title: string) => {
    setPlaybookTitle(title)
      updateTitle(title)
  }, [updateTitle])

  const handleMarketplaceSave = async (data: { isInMarketplace: boolean; price: number; description?: string; updateContent?: boolean }) => {
    if (!currentPlaybook || !currentPlaybook.id) return

    try {
      console.log('handleMarketplaceSave called with:', data)
      console.log('Current playbook:', currentPlaybook)

      // Check if this is a temporary playbook
      const isTemporary = currentPlaybook.id.startsWith('temp-')
      
      if (isTemporary) {
        // For temporary playbooks, we need to save them first to get a real UUID
        console.log('Temporary playbook detected, saving first...')
        
        const savedPlaybook = await savePlaybook({
          title: currentPlaybook.title,
          content: currentPlaybook.content,
          description: data.description || currentPlaybook.description || '',
          tags: currentPlaybook.tags || [],
          is_public: false,
          is_marketplace: data.isInMarketplace,
          price: data.price,
          // Set preview_content to current content when adding to marketplace or when explicitly updating content
          preview_content: (data.isInMarketplace || data.updateContent) ? currentPlaybook.content : null
        })
        
        console.log('Playbook saved with marketplace settings:', savedPlaybook)
        
        // Update the current playbook state
        setCurrentPlaybook(savedPlaybook)
        
        // Refresh the playbook list
        await refreshPlaybookList()
        
        console.log('Marketplace save completed successfully for temporary playbook')
      } else {
        // For existing playbooks, update directly
        const updatedPlaybook = {
          is_marketplace: data.isInMarketplace,
          price: data.price,
          description: data.description,
          // Set preview_content to current content when adding to marketplace or when explicitly updating content
          preview_content: (data.isInMarketplace || data.updateContent) ? currentPlaybook.content : null
        }

        console.log('Updating existing playbook with:', updatedPlaybook)

        // Update in database (not save - this updates existing playbook)
        const result = await playbookService.updatePlaybook(currentPlaybook.id, updatedPlaybook)
        
        console.log('Update result:', result)
        
        // Update the current playbook state
        setCurrentPlaybook(result)
        
        // Refresh the playbook list to show updated marketplace status
        await refreshPlaybookList()
        
        console.log('Marketplace save completed successfully for existing playbook')
      }
    } catch (error) {
      console.error('Error saving marketplace settings:', error)
      throw error
    }
  }

  const handlePlaybookGenerated = useCallback(async (generatedResponse: any) => {
    console.log('Playbook generated response:', generatedResponse)
    console.log('User authenticated:', !!user, 'User ID:', user?.id)
    
    // Handle both string content (legacy) and response object (new)
    const content = typeof generatedResponse === 'string' 
      ? generatedResponse 
      : generatedResponse.content
    
    const title = typeof generatedResponse === 'string' 
      ? 'Generated Playbook' 
      : generatedResponse.title
    
    console.log('Content type:', typeof content)
    console.log('Content preview:', typeof content === 'string' ? content.substring(0, 100) : JSON.stringify(content).substring(0, 100))
    
    if (content) {
      // Create a new playbook first
      try {
        console.log('Creating new playbook with title:', title, 'Content length:', content.length)
        
        const newPlaybook = await savePlaybook({
          title: title || 'Generated Playbook',
          content: content,
          is_public: false
        })
        
        console.log('New playbook created:', newPlaybook.id, 'Is temp?', newPlaybook.id ? LocalPlaybookService.isTempPlaybook(newPlaybook.id) : 'No ID')
        
        // Set the new playbook as current
        setEditorContent(content)
        setPlaybookTitle(title || 'Generated Playbook')
        
        // Update table of contents
        const toc = extractTableOfContents(content)
        setTableOfContents(toc)
        
        console.log('Playbook set as current, editor content and title updated')
      } catch (error) {
        console.error('Error creating new playbook:', error)
        // Fallback: just set the content without saving
        setEditorContent(content)
        setPlaybookTitle(title || 'Generated Playbook')
        
        // Update table of contents
        const toc = extractTableOfContents(content)
        setTableOfContents(toc)
      }
    }
  }, [savePlaybook, user])

  // Handle content generation for existing pages (internal pages or main page updates)
  const handleContentGenerated = useCallback(async (content: any) => {
    console.log('Content generated for existing page:', content)
    
    if (currentPageId) {
      // We're on an internal page - pass the content to PlaybookEditor
      console.log('Content generated for internal page:', currentPageId)
      setGeneratedContent(content)
    } else {
      // We're on the main page - update the main page content
      console.log('Updating main page content')
      setEditorContent(content)
      
      // Update table of contents
      const toc = extractTableOfContents(content)
      setTableOfContents(toc)
    }
  }, [currentPageId])

  // Handle current page ID changes from PlaybookEditor
  const handleCurrentPageChange = useCallback((pageId: string | null) => {
    setCurrentPageId(pageId)
  }, [])

  // Clear generated content after it's been processed
  useEffect(() => {
    if (generatedContent) {
      // Clear the generated content after a short delay to allow PlaybookEditor to process it
      const timer = setTimeout(() => {
        setGeneratedContent(null)
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [generatedContent])

  const handleNewPlaybook = useCallback(() => {
    createNewPlaybook()
  }, [createNewPlaybook])

  const scrollToHeading = useCallback((headingText: string) => {
    try {
      // Find the editor content area
      const editorContainer = document.querySelector('.ProseMirror')
      const editorScrollWrapper = document.querySelector('.editor-content-scroll-wrapper')

      if (!editorContainer || !editorScrollWrapper) return

      // Find all headings in the editor
      const headings = editorContainer.querySelectorAll('h1, h2, h3, h4, h5, h6')
      
      // Find the heading that matches the title
      let targetHeading: Element | null = null
      headings.forEach(heading => {
        if (heading.textContent?.trim() === headingText.trim()) {
          targetHeading = heading
        }
      })

      if (targetHeading) {
        const headingElement = targetHeading as HTMLElement
        const scrollWrapper = editorScrollWrapper as HTMLElement
        
        // Calculate the position of the heading relative to the scroll wrapper
        const headingRect = headingElement.getBoundingClientRect()
        const wrapperRect = scrollWrapper.getBoundingClientRect()
        
        // Calculate how much to scroll within the wrapper
        const relativeTop = headingRect.top - wrapperRect.top
        const currentScrollTop = scrollWrapper.scrollTop
        
        // Scroll to the heading with some padding from the top
        const padding = 20 // 20px padding from the top
        const targetScrollTop = currentScrollTop + relativeTop - padding
        
        // Smooth scroll within the editor content area only
        scrollWrapper.scrollTo({
          top: targetScrollTop,
          behavior: 'smooth'
        })
        
        // Add a temporary highlight effect
        headingElement.classList.add('bg-yellow-200', 'transition-colors', 'duration-300')
        setTimeout(() => {
          headingElement.classList.remove('bg-yellow-200')
        }, 2000)
      }
    } catch (error) {
      console.error('Error scrolling to heading:', error)
    }
  }, [])

  // Handle URL parameter to load specific playbook (e.g., from invitation acceptance)
  useEffect(() => {
    const playbookId = searchParams.get('id')
    if (playbookId && playbookId !== currentPlaybook?.id && isUserLoaded) {
      console.log('Loading playbook from URL parameter:', playbookId, 'User loaded:', !!user)
      if (user?.id) {
        loadPlaybook(playbookId)
      } else {
        console.warn('Cannot load playbook - user not authenticated')
      }
    }
  }, [searchParams, currentPlaybook?.id, loadPlaybook, isUserLoaded, user?.id])

  // Debugging for Manage Collaborators button
  useEffect(() => {
    console.log('PlaybooksPage mounted/updated. user:', user, 'isLoaded:', isUserLoaded);
    if (!user) {
      console.warn('User is not authenticated. Manage Collaborators button will be disabled.');
    }
  }, [user, isUserLoaded]);

  // Auto-resize textarea for title input
  useEffect(() => {
    if (titleInputRef.current) {
      const textarea = titleInputRef.current;
      // Reset height to auto to get the correct scrollHeight
      textarea.style.height = 'auto';
      // Set height to scrollHeight, but cap it at maxHeight
      const maxHeight = 96; // 6rem = 96px
      const scrollHeight = textarea.scrollHeight;
      textarea.style.height = Math.min(scrollHeight, maxHeight) + 'px';
    }
  }, [playbookTitle]);

  return (
    <>
      <div className="h-screen bg-gray-50 flex overflow-hidden">
      {/* Left Sidebar - Playbook List */}
      {!leftSidebarCollapsed && (
          <div className="w-80 flex-shrink-0 h-full overflow-hidden">
          <PlaybookSidebar
              onPlaybookSelect={(playbook) => loadPlaybook(playbook.id)}
            onNewPlaybook={handleNewPlaybook}
            isAuthenticated={isAuthenticated}
            tempPlaybookCount={tempPlaybookCount}
            canCreateMore={canCreateMore}
            playbookList={playbookList}
            isLoading={isLoading}
            error={error}
            loadPlaybook={loadPlaybook}
            deletePlaybook={deletePlaybook}
            duplicatePlaybook={duplicatePlaybook}
              searchPlaybooks={searchPlaybooks}
              refreshPlaybookList={refreshPlaybookList}
            clearError={clearError}
              tableOfContents={tableOfContents}
              onScrollToHeading={scrollToHeading}
          />
        </div>
      )}

      {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 h-full">
        {/* Top Bar */}
          <div className="bg-white border-b border-gray-200 px-4 py-3 flex-shrink-0 relative">
          <div className="flex items-start gap-4">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <button
                onClick={() => setLeftSidebarCollapsed(!leftSidebarCollapsed)}
                className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors flex-shrink-0"
              >
                {leftSidebarCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
              </button>
              
              <div className="flex items-start gap-2 min-w-0 flex-1">
                <FileText className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
                <textarea
                  ref={titleInputRef}
                  value={playbookTitle}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  className="text-lg font-semibold bg-transparent border-none outline-none focus:ring-0 p-0 min-w-0 flex-1 resize-none"
                  style={{ 
                    wordBreak: 'break-word', 
                    overflowWrap: 'anywhere',
                    whiteSpace: 'normal',
                    minHeight: '1.5rem',
                    maxHeight: '6rem',
                    lineHeight: '1.5rem',
                    width: '100%'
                  }}
                  rows={1}
                />
                </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
                {/* Marketplace Button */}
                {currentPlaybook && (
                  <button
                    onClick={() => setShowMarketplaceModal(true)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      currentPlaybook.is_marketplace
                        ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {currentPlaybook.is_marketplace ? 'Marketplace Settings' : 'Add to Marketplace'}
                  </button>
                )}
              <button
                onClick={() => setRightSidebarCollapsed(!rightSidebarCollapsed)}
                className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
              >
                {rightSidebarCollapsed ? <PanelRightOpen className="h-4 w-4" /> : <PanelRightClose className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>

          {/* Rich Text Editor Content Area */}
          <div className="flex-1 flex flex-col overflow-y-auto min-h-0 editor-content-scroll-wrapper">
            {isLoading ? (
              <LoadingSkeleton type="editor" />
            ) : (
              <PlaybookEditor
                content={editorContent}
                onChange={handleEditorChange}
                editable={true}
                placeholder="Start typing your playbook here, or use the AI generation in the right sidebar to get started..."
                className="flex-1 flex flex-col"
                isSaving={isSaving}
                lastSaved={lastSaved}
                collaborators={playbookCollaborators}
                rightSidebarCollapsed={rightSidebarCollapsed}
                leftSidebarCollapsed={leftSidebarCollapsed}
                playbookId={currentPlaybook?.id}
                userId={user?.id}
                userName={user?.fullName || user?.firstName || user?.emailAddresses?.[0]?.emailAddress || 'Unknown User'}
                onCurrentPageChange={handleCurrentPageChange}
                generatedContent={generatedContent}
              />
            )}
            </div>
          </div>

          {/* Right Sidebar */}
          {!rightSidebarCollapsed && (
          <div className="w-80 flex-shrink-0 bg-white border-l border-gray-200 flex flex-col h-full overflow-hidden">
              {/* AI Generation */}
            <div className="flex-1 flex flex-col min-h-0">
                <button
                  onClick={() => setAiGenerationExpanded(!aiGenerationExpanded)}
                className="p-3 border-b border-gray-200 flex items-center justify-between hover:bg-gray-50 transition-colors flex-shrink-0"
                >
                  <h3 className="text-sm font-semibold text-gray-900">Generate with AI</h3>
                  {aiGenerationExpanded ? (
                    <ChevronDown className="h-4 w-4 text-gray-500" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-gray-500" />
                  )}
                </button>
                
                {aiGenerationExpanded && (
                <div className="flex-1 p-3 overflow-y-auto min-h-0">
                    <PlaybookGenerator
                      onPlaybookGenerated={handlePlaybookGenerated}
                      onContentGenerated={handleContentGenerated}
                      existingContent={editorContent}
                      mode={currentPageId ? 'update' : 'create'}
                    />
                  </div>
                )}
              </div>

            {/* Collaborators Management Section */}
            <div className="border-t border-gray-200 flex-shrink-0">
              <button
                onClick={() => {
                  console.log('Manage Collaborators clicked, isAuthenticated:', !!user, 'user:', user)
                  console.log('Current playbook ID:', currentPlaybook?.id, 'Is temp:', LocalPlaybookService.isTempPlaybook(currentPlaybook?.id || ''))
                  
                  if (!user) {
                    // Show sign-in prompt for guest users
                    setShowSignInPrompt(true)
                  } else if (LocalPlaybookService.isTempPlaybook(currentPlaybook?.id || '')) {
                    // Show message that collaborators are not available for temporary playbooks
                    alert('Collaborators are not available for temporary playbooks. Please save the playbook first to enable collaboration features.')
                  } else {
                    setShowCollaboratorsModal(true)
                  }
                }}
                className="w-full p-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <div className="p-1 bg-blue-100 rounded">
                    <Users className="h-4 w-4 text-blue-600" />
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900">
                    {user ? 'Manage Collaborators' : 'Collaborators (Sign In Required)'}
                  </h3>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-500" />
              </button>
            </div>

            {/* Chat Section */}
            <PlaybookChat
              playbookId={currentPlaybook?.id || ''}
              currentUser={{
                id: user?.id || '',
                name: user?.fullName || user?.firstName || 'User',
                email: user?.primaryEmailAddress?.emailAddress || '',
                avatar: user?.imageUrl
              }}
              permissionLevel={
                // Determine permission level based on current user and playbook
                !user?.id ? 'view' :
                (currentPlaybook && 'user_id' in currentPlaybook && !('is_temp' in currentPlaybook) && currentPlaybook.user_id === user.id) ? 'owner' :
                'edit' // Default to edit for authenticated users on non-owned playbooks
              }
              isOpen={showChat}
              onToggle={() => setShowChat(!showChat)}
            />
            </div>
          )}
      </div>

      {/* Sign In Prompt Modal */}
      {showSignInPrompt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-100 rounded-full">
                <Lock className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Sign In Required</h3>
                <p className="text-sm text-gray-600">You&apos;ve reached the limit of 2 free playbooks</p>
              </div>
            </div>
            
            <div className="mb-6">
              <p className="text-sm text-gray-700 mb-3">
                To create more playbooks and save your work permanently, please sign in:
              </p>
              <ul className="text-sm text-gray-600 space-y-2">
                <li className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 bg-green-500 rounded-full"></div>
                  Create unlimited playbooks
                </li>
                <li className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 bg-green-500 rounded-full"></div>
                  Share and collaborate
                </li>
                <li className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 bg-green-500 rounded-full"></div>
                  Access advanced AI features
                </li>
              </ul>
            </div>
            
            <div className="flex gap-3">
              <Link
                href="/sign-up"
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
              >
                Sign Up
              </Link>
              <button
                onClick={() => setShowSignInPrompt(false)}
                className="px-4 py-2 text-gray-500 hover:text-gray-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Toast */}
      {error && (
        <div className="fixed bottom-4 right-4 bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg shadow-lg z-50 max-w-sm">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="text-sm font-medium text-red-800">Error</h4>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
            <button
              onClick={clearError}
              className="text-red-400 hover:text-red-600"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Collaborators Modal */}
      <CollaboratorsModal
        isOpen={showCollaboratorsModal}
        onClose={() => {
          console.log('Closing collaborators modal')
          setShowCollaboratorsModal(false)
        }}
        playbookId={currentPlaybook?.id || ''}
        playbookTitle={playbookTitle || 'Untitled Playbook'}
        currentUserId={user?.id || ''}
        currentUserEmail={user?.primaryEmailAddress?.emailAddress || ''}
        currentUserName={user?.fullName || user?.firstName || 'User'}
      />

      {/* Marketplace Modal */}
      <MarketplaceModal
        isOpen={showMarketplaceModal}
        onClose={() => setShowMarketplaceModal(false)}
        playbook={currentPlaybook ? {
          id: currentPlaybook.id,
          title: currentPlaybook.title,
          is_marketplace: currentPlaybook.is_marketplace,
          price: currentPlaybook.price,
          description: currentPlaybook.description,
          content: currentPlaybook.content
        } : null}
        onSave={handleMarketplaceSave}
      />
    </>
  )
}