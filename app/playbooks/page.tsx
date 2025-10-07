'use client'

import { useState, useRef, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import Link from 'next/link'
import { 
  Lock, 
  Store, 
  Heart, 
  Plus, 
  ChevronDown, 
  ChevronRight,
  MoreHorizontal,
  Upload,
  X,
  MessageCircle,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen
} from 'lucide-react'
import PlaybookEditor, { extractTableOfContents } from '@/components/PlaybookEditor'
import PlaybookGenerator from '@/components/PlaybookGenerator'
import { UploadedFile } from '@/types/api'

// Types
interface Playbook {
  id: string
  title: string
  lastEdited: Date
  category: 'private' | 'marketplace' | 'favorited'
  isSelected?: boolean
}

interface TableOfContentsItem {
  id: string
  title: string
  level: number
  sectionNumber: string
}



export default function PlaybooksPage() {
  const { user, isLoaded } = useUser()
  const [leftSidebarCollapsed, setLeftSidebarCollapsed] = useState(false)
  const [rightSidebarCollapsed, setRightSidebarCollapsed] = useState(false)
  const [selectedPlaybook, setSelectedPlaybook] = useState<string | null>(null)
  const [aiGenerationExpanded, setAiGenerationExpanded] = useState(true)
  const [playbookTitle, setPlaybookTitle] = useState('Untitled Playbook')
  const [editorContent, setEditorContent] = useState('')
  const [tableOfContents, setTableOfContents] = useState<TableOfContentsItem[]>([])
  const [isInMarketplace, setIsInMarketplace] = useState(false)
  const [trackChangesEnabled, setTrackChangesEnabled] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [tableOfContentsExpanded, setTableOfContentsExpanded] = useState(true)
  const titleTextareaRef = useRef<HTMLTextAreaElement>(null)

  // Sample data - replace with real data later
  const samplePlaybooks: Playbook[] = [
    { id: '1', title: 'Digital Marketing Strategy', lastEdited: new Date(Date.now() - 2 * 60 * 60 * 1000), category: 'private' },
    { id: '2', title: 'Employee Onboarding Process', lastEdited: new Date(Date.now() - 24 * 60 * 60 * 1000), category: 'marketplace' },
    { id: '3', title: 'Product Launch Checklist', lastEdited: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), category: 'favorited' },
  ]

  const sampleTOC: TableOfContentsItem[] = [
    { id: '1', title: 'Introduction', level: 1, sectionNumber: '1' },
    { id: '2', title: 'Getting Started', level: 2, sectionNumber: '1.1' },
    { id: '3', title: 'Prerequisites', level: 2, sectionNumber: '1.2' },
    { id: '4', title: 'Implementation', level: 1, sectionNumber: '2' },
    { id: '5', title: 'Best Practices', level: 2, sectionNumber: '2.1' },
  ]

  // Auto-resize textarea function
  const autoResizeTextarea = (textarea: HTMLTextAreaElement) => {
    textarea.style.height = 'auto'
    textarea.style.height = Math.max(textarea.scrollHeight, 48) + 'px'
  }

  // Effect to auto-resize when title changes
  useEffect(() => {
    if (titleTextareaRef.current) {
      autoResizeTextarea(titleTextareaRef.current)
    }
  }, [playbookTitle])

  const formatRelativeTime = (date: Date) => {
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) return 'Just now'
    if (diffInHours < 24) return `${diffInHours} hours ago`
    if (diffInHours < 48) return 'Yesterday'
    const diffInDays = Math.floor(diffInHours / 24)
    return `${diffInDays} days ago`
  }


  // Editor handlers
  const handleEditorChange = (content: string) => {
    setEditorContent(content)
    const toc = extractTableOfContents(content)
    setTableOfContents(toc)
    setLastSaved(new Date())
  }

  const handleSelectionChange = (selection: any) => {
    // This can be used to sync with right sidebar metadata
    console.log('Selection changed:', selection)
  }

  // Scroll to heading function
  const scrollToHeading = (headingTitle: string) => {
    try {
      // Find the editor content area
      const editorContainer = document.querySelector('.ProseMirror')
      if (!editorContainer) return

      // Find all headings in the editor
      const headings = editorContainer.querySelectorAll('h1, h2, h3, h4, h5, h6')
      
      // Find the heading that matches the title
      let targetHeading: Element | null = null
      headings.forEach(heading => {
        if (heading.textContent?.trim() === headingTitle.trim()) {
          targetHeading = heading
        }
      })

      if (targetHeading) {
        const headingElement = targetHeading as HTMLElement
        // Scroll the heading into view with smooth behavior
        headingElement.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start',
          inline: 'nearest'
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
  }

  // Toolbar action handlers
  const handleExportPDF = () => {
    try {
      // Get the HTML content from the editor
      const editorElement = document.querySelector('.ProseMirror')
      const htmlContent = editorElement ? editorElement.innerHTML : '<p>No content to export</p>'
      
      // Create a styled HTML document for printing
      const fullHtmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>${playbookTitle}</title>
            <style>
              body { 
                font-family: Arial, sans-serif; 
                margin: 40px; 
                line-height: 1.6; 
                color: #333;
              }
              h1 { 
                color: #333; 
                border-bottom: 2px solid #333; 
                padding-bottom: 10px; 
                margin-bottom: 30px;
              }
              h2 { 
                color: #555; 
                margin-top: 30px; 
                margin-bottom: 15px;
              }
              h3 { 
                color: #666; 
                margin-top: 20px; 
                margin-bottom: 10px;
              }
              p { margin: 10px 0; }
              ul, ol { margin: 10px 0; padding-left: 30px; }
              blockquote { 
                border-left: 4px solid #ddd; 
                padding-left: 20px; 
                margin: 20px 0; 
                font-style: italic; 
                background-color: #f9f9f9;
                padding: 15px 20px;
              }
              .note { 
                background-color: #fef3c7; 
                padding: 15px; 
                border-radius: 5px; 
                margin: 15px 0; 
                border-left: 4px solid #f59e0b;
              }
              mark {
                background-color: #fef3c7;
                padding: 2px 4px;
                border-radius: 3px;
              }
              @media print {
                body { margin: 20px; }
                .no-print { display: none; }
              }
            </style>
          </head>
          <body>
            <h1>${playbookTitle}</h1>
            <div class="content">
              ${htmlContent}
            </div>
          </body>
        </html>
      `
      
      // Create a new window with the content and trigger print
      const printWindow = window.open('', '_blank')
      if (printWindow) {
        printWindow.document.write(fullHtmlContent)
        printWindow.document.close()
        printWindow.focus()
        
        // Wait for content to load, then trigger print
        setTimeout(() => {
          printWindow.print()
          // Keep window open for a moment in case user wants to save as PDF
          setTimeout(() => {
            printWindow.close()
          }, 1000)
        }, 500)
      }
    } catch (error) {
      console.error('Error exporting PDF:', error)
      alert('Error exporting to PDF. Please try again.')
    }
  }

  const handleOpenVersions = () => {
    // Create a simple version history modal
    const modal = document.createElement('div')
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'
    modal.innerHTML = `
      <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h3 class="text-lg font-semibold mb-4">Version History</h3>
        <div class="space-y-2">
          <div class="flex justify-between items-center p-2 bg-gray-50 rounded">
            <span class="text-sm">Current Version</span>
            <span class="text-xs text-gray-500">Just now</span>
          </div>
          <div class="flex justify-between items-center p-2 bg-gray-50 rounded">
            <span class="text-sm">Version 1.1</span>
            <span class="text-xs text-gray-500">2 hours ago</span>
          </div>
          <div class="flex justify-between items-center p-2 bg-gray-50 rounded">
            <span class="text-sm">Version 1.0</span>
            <span class="text-xs text-gray-500">Yesterday</span>
          </div>
        </div>
        <div class="mt-4 flex justify-end">
          <button onclick="this.closest('.fixed').remove()" class="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">
            Close
          </button>
        </div>
      </div>
    `
    document.body.appendChild(modal)
    
    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove()
      }
    })
  }

  const handleDuplicatePlaybook = () => {
    const newTitle = `${playbookTitle} (Copy)`
    const newContent = editorContent
    
    // Update the current playbook with duplicated content
    setPlaybookTitle(newTitle)
    setEditorContent(newContent)
    setLastSaved(new Date())
    
    alert(`Playbook duplicated as "${newTitle}"`)
  }

  const handleToggleMarketplace = () => {
    const newMarketplaceStatus = !isInMarketplace
    setIsInMarketplace(newMarketplaceStatus)
    
    if (newMarketplaceStatus) {
      // Show marketplace settings modal
      const modal = document.createElement('div')
      modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'
      modal.innerHTML = `
        <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
          <h3 class="text-lg font-semibold mb-4">Add to Marketplace</h3>
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium mb-2">Price (USD)</label>
              <input type="number" placeholder="0.00" class="w-full border border-gray-300 rounded px-3 py-2" />
            </div>
            <div>
              <label class="block text-sm font-medium mb-2">Description</label>
              <textarea placeholder="Describe your playbook..." class="w-full border border-gray-300 rounded px-3 py-2 h-20"></textarea>
            </div>
            <div>
              <label class="flex items-center">
                <input type="checkbox" class="mr-2" />
                <span class="text-sm">Make this playbook public</span>
              </label>
            </div>
          </div>
          <div class="mt-6 flex justify-end space-x-2">
            <button onclick="this.closest('.fixed').remove(); setIsInMarketplace(false)" class="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">
              Cancel
            </button>
            <button onclick="this.closest('.fixed').remove(); alert('Playbook added to marketplace!')" class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
              Add to Marketplace
            </button>
          </div>
        </div>
      `
      document.body.appendChild(modal)
      
      // Close modal when clicking outside
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.remove()
          setIsInMarketplace(false)
        }
      })
    } else {
      // Show marketplace settings
      const modal = document.createElement('div')
      modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'
      modal.innerHTML = `
        <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
          <h3 class="text-lg font-semibold mb-4">Marketplace Settings</h3>
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium mb-2">Current Price</label>
              <input type="number" value="9.99" class="w-full border border-gray-300 rounded px-3 py-2" />
            </div>
            <div>
              <label class="block text-sm font-medium mb-2">Status</label>
              <select class="w-full border border-gray-300 rounded px-3 py-2">
                <option>Published</option>
                <option>Draft</option>
                <option>Unpublished</option>
              </select>
            </div>
            <div>
              <label class="flex items-center">
                <input type="checkbox" checked class="mr-2" />
                <span class="text-sm">Visible in marketplace</span>
              </label>
            </div>
          </div>
          <div class="mt-6 flex justify-end space-x-2">
            <button onclick="this.closest('.fixed').remove()" class="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">
              Close
            </button>
            <button onclick="this.closest('.fixed').remove(); alert('Settings updated!')" class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
              Save Changes
            </button>
          </div>
        </div>
      `
      document.body.appendChild(modal)
      
      // Close modal when clicking outside
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.remove()
        }
      })
    }
  }

  const handleToggleTrackChanges = () => {
    const newTrackChangesStatus = !trackChangesEnabled
    setTrackChangesEnabled(newTrackChangesStatus)
    
    // Visual feedback for track changes
    if (newTrackChangesStatus) {
      alert('Track Changes enabled - your edits will be highlighted')
    } else {
      alert('Track Changes disabled')
    }
  }

  // Handler for when a playbook is generated by AI
  const handlePlaybookGenerated = (generatedPlaybook: any) => {
    // Update the editor content with the generated playbook
    setEditorContent(JSON.stringify(generatedPlaybook.content))
    
    // Update the playbook title
    if (generatedPlaybook.title) {
      setPlaybookTitle(generatedPlaybook.title)
    }
    
    // Update the table of contents
    if (generatedPlaybook.sections) {
      const toc = generatedPlaybook.sections.map((section: any, index: number) => ({
        id: section.id || `section-${index}`,
        title: section.title,
        level: section.level || 1,
        sectionNumber: `${index + 1}`
      }))
      setTableOfContents(toc)
    }
    
    // Update last saved timestamp
    setLastSaved(new Date())
    
    console.log('Generated playbook:', generatedPlaybook)
  }

  if (!isLoaded) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        Loading user data...
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Main Layout Container */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Sidebar */}
        <div className={`bg-white border-r border-gray-200 transition-all duration-300 ${
          leftSidebarCollapsed ? 'w-0' : 'w-80'
        } flex flex-col relative`}>
          {!leftSidebarCollapsed && (
            <>
              {/* Sidebar Header */}
              <div className="p-4 border-b border-gray-200">
                {/* Logo and Marketplace Navigation */}
                <div className="flex items-center gap-4 mb-4">
                  <Link href="/" className="text-blue-600 font-bold text-lg hover:text-blue-700 transition-colors">
                    Playbooq.AI
                  </Link>
                  <div className="h-4 w-px bg-gray-300"></div>
                  <Link href="/marketplace" className="text-gray-700 hover:text-gray-900 transition-colors">
                    Marketplace
                  </Link>
                </div>
                
                {/* Divider */}
                <div className="h-px bg-gray-200 mb-4"></div>
                
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">My Playbooks</h2>
                </div>
                
                <button className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2">
                  <Plus className="h-4 w-4" />
                  New Playbook
                </button>
              </div>

              {/* Playbook Categories */}
              <div className="flex-1 overflow-y-auto">
                <PlaybookCategory
                  title="Not in the marketplace"
                  icon={<Lock className="h-4 w-4" />}
                  playbooks={samplePlaybooks.filter(p => p.category === 'private')}
                  selectedPlaybook={selectedPlaybook}
                  onSelectPlaybook={setSelectedPlaybook}
                  formatRelativeTime={formatRelativeTime}
                />
                <PlaybookCategory
                  title="In the marketplace"
                  icon={<Store className="h-4 w-4" />}
                  playbooks={samplePlaybooks.filter(p => p.category === 'marketplace')}
                  selectedPlaybook={selectedPlaybook}
                  onSelectPlaybook={setSelectedPlaybook}
                  formatRelativeTime={formatRelativeTime}
                />
                <PlaybookCategory
                  title="Favorites from marketplace"
                  icon={<Heart className="h-4 w-4" />}
                  playbooks={samplePlaybooks.filter(p => p.category === 'favorited')}
                  selectedPlaybook={selectedPlaybook}
                  onSelectPlaybook={setSelectedPlaybook}
                  formatRelativeTime={formatRelativeTime}
                />
              </div>

              {/* Table of Contents */}
              <div className="border-t border-gray-200 p-4 flex flex-col">
                <button
                  onClick={() => setTableOfContentsExpanded(!tableOfContentsExpanded)}
                  className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-3 hover:text-gray-700 w-full text-left"
                >
                  {tableOfContentsExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  Table of Contents
                </button>
                {tableOfContentsExpanded && (
                  <div className="flex-1 overflow-y-auto max-h-60 space-y-1 toc-scroll">
                    {tableOfContents.length > 0 ? (
                      tableOfContents.map((item, index) => (
                        <div
                          key={item.id}
                          onClick={() => scrollToHeading(item.title)}
                          className={`text-sm text-gray-600 hover:text-gray-900 cursor-pointer p-1 hover:bg-gray-50 rounded transition-colors ${
                            item.level === 1 ? 'font-medium' : item.level === 2 ? 'ml-2' : 'ml-4'
                          }`}
                          title={`Jump to ${item.title}`}
                        >
                          <span className="text-gray-400 mr-2">
                            {item.sectionNumber}.
                          </span>
                          {item.title}
                        </div>
                      ))
                    ) : (
                      <div className="text-xs text-gray-400 italic">
                        Add headings to see table of contents
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
          
          {/* Left Sidebar Collapse Button */}
          {!leftSidebarCollapsed && (
            <button
              onClick={() => setLeftSidebarCollapsed(true)}
              className="absolute top-1/2 -translate-y-1/2 right-0 w-6 h-8 bg-white border-r border-gray-200 flex items-center justify-center hover:bg-gray-50 -mr-6 z-10"
              title="Collapse sidebar"
            >
              <PanelLeftClose className="h-4 w-4 text-gray-500" />
            </button>
          )}
        </div>

        {/* Collapsed Left Sidebar Button */}
        {leftSidebarCollapsed && (
          <button
            onClick={() => setLeftSidebarCollapsed(false)}
            className="w-10 bg-white border-r border-gray-200 flex items-center justify-center hover:bg-gray-50"
          >
            <PanelLeftOpen className="h-4 w-4 text-gray-500" />
          </button>
        )}

        {/* Main Editor Area */}
        <div className="flex-1 flex flex-col bg-white overflow-hidden">
          
          {/* Playbook Title Section */}
          <div className="border-b border-gray-200 p-4 bg-white">
            <div className="max-w-4xl mx-auto">
              <textarea
                ref={titleTextareaRef}
                value={playbookTitle}
                onChange={(e) => {
                  setPlaybookTitle(e.target.value)
                  // Auto-resize immediately
                  if (titleTextareaRef.current) {
                    autoResizeTextarea(titleTextareaRef.current)
                  }
                }}
                className="w-full text-2xl font-bold text-gray-900 bg-transparent border-none outline-none focus:ring-0 placeholder-gray-400 resize-none overflow-hidden min-h-[3rem] leading-tight"
                placeholder="Enter playbook title..."
                rows={1}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement
                  autoResizeTextarea(target)
                }}
              />
            </div>
          </div>

          {/* Editor Toolbar - Fixed */}
          <div className="sticky top-0 z-30 bg-white border-b border-gray-200">
            <div className="max-w-4xl mx-auto">
              <PlaybookEditor
                content={editorContent}
                onChange={handleEditorChange}
                editable={true}
                placeholder="Start typing your playbook here, or use the AI generation in the right sidebar to get started..."
                onSelectionChange={handleSelectionChange}
                className="shadow-sm border-0 rounded-none"
                onExportPDF={handleExportPDF}
                onOpenVersions={handleOpenVersions}
                onDuplicatePlaybook={handleDuplicatePlaybook}
                onToggleMarketplace={handleToggleMarketplace}
                isInMarketplace={isInMarketplace}
                isSaving={false}
                lastSaved={lastSaved}
                trackChangesEnabled={trackChangesEnabled}
                onToggleTrackChanges={handleToggleTrackChanges}
                showToolbarOnly={true}
              />
            </div>
          </div>

          {/* Saved Status Bar - Fixed */}
          <div className="sticky top-14 z-30 bg-white border-b border-gray-200 px-4 py-2">
            <div className="max-w-4xl mx-auto">
              <div className="flex justify-end">
                <div className="text-xs text-gray-500 flex items-center gap-2">
                  {lastSaved ? (
                    <>
                      <div className="h-3 w-3 rounded-full bg-green-500"></div>
                      Saved ✓
                    </>
                  ) : (
                    <>
                      <div className="h-3 w-3 rounded-full bg-gray-300"></div>
                      Not saved
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Rich Text Editor Workspace - Scrollable */}
          <div className="flex-1 p-4 overflow-y-auto">
            <div className="max-w-4xl mx-auto">
              <PlaybookEditor
                content={editorContent}
                onChange={handleEditorChange}
                editable={true}
                placeholder="Start typing your playbook here, or use the AI generation in the right sidebar to get started..."
                onSelectionChange={handleSelectionChange}
                className="shadow-sm border-0 rounded-none"
                onExportPDF={handleExportPDF}
                onOpenVersions={handleOpenVersions}
                onDuplicatePlaybook={handleDuplicatePlaybook}
                onToggleMarketplace={handleToggleMarketplace}
                isInMarketplace={isInMarketplace}
                isSaving={false}
                lastSaved={lastSaved}
                trackChangesEnabled={trackChangesEnabled}
                onToggleTrackChanges={handleToggleTrackChanges}
                showContentOnly={true}
              />
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className={`bg-white border-l border-gray-200 transition-all duration-300 ${
          rightSidebarCollapsed ? 'w-0' : 'w-80'
        } flex flex-col relative`}>
          {!rightSidebarCollapsed && (
            <>
              {/* AI Generation Section */}
              <div className={`${aiGenerationExpanded ? 'flex-[2]' : 'flex-none'} border-b border-gray-200 overflow-y-auto`}>
                <div className="p-3">
                  <div className="flex items-center justify-between mb-3">
                    <button
                      onClick={() => setAiGenerationExpanded(!aiGenerationExpanded)}
                      className="flex items-center gap-2 text-sm font-semibold text-gray-900 hover:text-gray-700"
                    >
                      {aiGenerationExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                      Generate with AI
                    </button>
                  </div>
                  
                  {aiGenerationExpanded && (
                    <PlaybookGenerator
                      onPlaybookGenerated={handlePlaybookGenerated}
                      existingContent={editorContent}
                    />
                  )}
                </div>
              </div>

              {/* Chat Section */}
              <div className="flex-1 flex flex-col">
                <div className="p-3 border-b border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-900">Collaborator Chat</h3>
                </div>
                
                <div className="flex-1 p-3 bg-gray-50">
                  <div className="text-xs text-gray-500 text-center">
                    Chat functionality coming soon...
                  </div>
                </div>
              </div>
            </>
          )}
          
          {/* Right Sidebar Collapse Button */}
          {!rightSidebarCollapsed && (
            <button
              onClick={() => setRightSidebarCollapsed(true)}
              className="absolute top-1/2 -translate-y-1/2 left-0 w-6 h-8 bg-white border-l border-gray-200 flex items-center justify-center hover:bg-gray-50 -ml-6 z-10"
              title="Collapse sidebar"
            >
              <PanelRightClose className="h-4 w-4 text-gray-500" />
            </button>
          )}
        </div>

        {/* Collapsed Right Sidebar Button */}
        {rightSidebarCollapsed && (
          <button
            onClick={() => setRightSidebarCollapsed(false)}
            className="w-10 bg-white border-l border-gray-200 flex items-center justify-center hover:bg-gray-50"
          >
            <PanelRightOpen className="h-4 w-4 text-gray-500" />
          </button>
        )}
      </div>
    </div>
  )
}

// Playbook Category Component
function PlaybookCategory({ 
  title, 
  icon, 
  playbooks, 
  selectedPlaybook, 
  onSelectPlaybook,
  formatRelativeTime 
}: {
  title: string
  icon: React.ReactNode
  playbooks: Playbook[]
  selectedPlaybook: string | null
  onSelectPlaybook: (id: string) => void
  formatRelativeTime: (date: Date) => string
}) {
  const [expanded, setExpanded] = useState(true)

  return (
    <div className="px-4 py-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 w-full text-left"
      >
        {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        {icon}
        {title} ({playbooks.length})
      </button>
      
      {expanded && playbooks.length > 0 && (
        <div className="mt-2 ml-6 space-y-1">
          {playbooks.map((playbook) => (
            <button
              key={playbook.id}
              onClick={() => onSelectPlaybook(playbook.id)}
              className={`block w-full text-left text-sm p-2 rounded hover:bg-gray-50 transition-colors ${
                selectedPlaybook === playbook.id ? 'bg-blue-50 text-blue-700 border-l-2 border-blue-500' : 'text-gray-600'
              }`}
            >
              <div className="font-medium truncate">{playbook.title}</div>
              <div className="text-xs text-gray-500">{formatRelativeTime(playbook.lastEdited)}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}