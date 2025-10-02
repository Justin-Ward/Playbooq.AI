'use client'

import { useState } from 'react'
import { useUser } from '@clerk/nextjs'
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


interface UploadedFile {
  id: string
  name: string
  size: number
  type: string
}

export default function PlaybooksPage() {
  const { user, isLoaded } = useUser()
  const [leftSidebarCollapsed, setLeftSidebarCollapsed] = useState(false)
  const [rightSidebarCollapsed, setRightSidebarCollapsed] = useState(false)
  const [selectedPlaybook, setSelectedPlaybook] = useState<string | null>(null)
  const [aiGenerationExpanded, setAiGenerationExpanded] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [aiPrompt, setAiPrompt] = useState('')
  const [playbookTitle, setPlaybookTitle] = useState('Untitled Playbook')

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


  const formatRelativeTime = (date: Date) => {
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) return 'Just now'
    if (diffInHours < 24) return `${diffInHours} hours ago`
    if (diffInHours < 48) return 'Yesterday'
    const diffInDays = Math.floor(diffInHours / 24)
    return `${diffInDays} days ago`
  }

  const handleFileUpload = (files: FileList | null) => {
    if (!files) return
    
    const newFiles: UploadedFile[] = Array.from(files).map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      size: file.size,
      type: file.type
    }))
    
    setUploadedFiles(prev => [...prev, ...newFiles])
  }

  const removeFile = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId))
  }

  if (!isLoaded) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
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
        } flex flex-col`}>
          {!leftSidebarCollapsed && (
            <>
              {/* Sidebar Header */}
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">My Playbooks</h2>
                  <button
                    onClick={() => setLeftSidebarCollapsed(true)}
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    <PanelLeftClose className="h-4 w-4 text-gray-500" />
                  </button>
                </div>
                <button className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2">
                  <Plus className="h-4 w-4" />
                  New Playbook
                </button>
              </div>

              {/* Playbook Categories */}
              <div className="flex-1 overflow-y-auto">
                <PlaybookCategory
                  title="My playbooks not in the marketplace"
                  icon={<Lock className="h-4 w-4" />}
                  playbooks={samplePlaybooks.filter(p => p.category === 'private')}
                  selectedPlaybook={selectedPlaybook}
                  onSelectPlaybook={setSelectedPlaybook}
                  formatRelativeTime={formatRelativeTime}
                />
                <PlaybookCategory
                  title="My playbooks in the marketplace"
                  icon={<Store className="h-4 w-4" />}
                  playbooks={samplePlaybooks.filter(p => p.category === 'marketplace')}
                  selectedPlaybook={selectedPlaybook}
                  onSelectPlaybook={setSelectedPlaybook}
                  formatRelativeTime={formatRelativeTime}
                />
                <PlaybookCategory
                  title="Favorited playbooks from marketplace"
                  icon={<Heart className="h-4 w-4" />}
                  playbooks={samplePlaybooks.filter(p => p.category === 'favorited')}
                  selectedPlaybook={selectedPlaybook}
                  onSelectPlaybook={setSelectedPlaybook}
                  formatRelativeTime={formatRelativeTime}
                />
              </div>

              {/* Table of Contents */}
              <div className="border-t border-gray-200 p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Table of Contents</h3>
                <div className="space-y-1">
                  {sampleTOC.map(item => (
                    <div
                      key={item.id}
                      className={`text-sm text-gray-600 hover:text-gray-900 cursor-pointer p-1 hover:bg-gray-50 rounded ${
                        item.level === 1 ? 'font-medium' : 'ml-4'
                      }`}
                    >
                      <span className="text-gray-400 mr-2">{item.sectionNumber}</span>
                      {item.title}
                    </div>
                  ))}
                </div>
              </div>
            </>
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
              <input
                type="text"
                value={playbookTitle}
                onChange={(e) => setPlaybookTitle(e.target.value)}
                className="w-full text-2xl font-bold text-gray-900 bg-transparent border-none outline-none focus:ring-0 placeholder-gray-400"
                placeholder="Enter playbook title..."
              />
            </div>
          </div>

          {/* Editor Toolbar Placeholder */}
          <div className="border-b border-gray-200 p-4 bg-gray-50">
            <div className="text-sm text-gray-500">
              Editor Toolbar (Coming in next prompt)
            </div>
          </div>

          {/* Rich Text Editor Workspace */}
          <div className="flex-1 p-4 overflow-y-auto">
            <div className="max-w-4xl mx-auto">
              <div className="min-h-96 p-6 bg-white border border-gray-200 rounded-lg">
                <p className="text-gray-500 text-center">
                  Start typing your playbook here, or use the AI generation in the right sidebar to get started...
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className={`bg-white border-l border-gray-200 transition-all duration-300 ${
          rightSidebarCollapsed ? 'w-0' : 'w-80'
        } flex flex-col`}>
          {!rightSidebarCollapsed && (
            <>
              {/* AI Generation Section */}
              <div className={`${aiGenerationExpanded ? 'flex-[2]' : 'flex-none'} border-b border-gray-200 overflow-y-auto`}>
                <div className="p-3">
                  <button
                    onClick={() => setAiGenerationExpanded(!aiGenerationExpanded)}
                    className="flex items-center gap-2 text-sm font-semibold text-gray-900 hover:text-gray-700 mb-3"
                  >
                    {aiGenerationExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                    Generate with AI
                  </button>
                  
                  {aiGenerationExpanded && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Describe your playbook:
                        </label>
                        <textarea
                          value={aiPrompt}
                          onChange={(e) => setAiPrompt(e.target.value)}
                          className="w-full h-16 p-2 text-xs border border-gray-300 rounded resize-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                          placeholder="e.g., 'Digital marketing strategy for SaaS startup...'"
                        />
                      </div>
                      
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <label className="text-xs font-medium text-gray-700">
                            Upload docs:
                          </label>
                          <div
                            className="border border-dashed border-gray-300 rounded px-1 py-0.5 hover:border-gray-400 transition-colors cursor-pointer flex items-center gap-1"
                            onDrop={(e) => {
                              e.preventDefault()
                              handleFileUpload(e.dataTransfer.files)
                            }}
                            onDragOver={(e) => e.preventDefault()}
                          >
                            <Upload className="h-2 w-2 text-gray-400" />
                            <label className="text-xs text-blue-600 hover:text-blue-700 cursor-pointer">
                              Browse
                              <input
                                type="file"
                                multiple
                                accept=".pdf,.docx,.txt,.md"
                                className="hidden"
                                onChange={(e) => handleFileUpload(e.target.files)}
                              />
                            </label>
                          </div>
                        </div>
                        
                        {uploadedFiles.length > 0 && (
                          <div className="space-y-1">
                            {uploadedFiles.map(file => (
                              <div key={file.id} className="flex items-center justify-between p-1 bg-gray-50 rounded text-xs">
                                <span className="text-gray-700 truncate">{file.name}</span>
                                <button
                                  onClick={() => removeFile(file.id)}
                                  className="text-red-500 hover:text-red-700 ml-1"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      <button
                        onClick={() => setIsGenerating(true)}
                        disabled={isGenerating || (!aiPrompt.trim() && uploadedFiles.length === 0)}
                        className="w-full bg-blue-600 text-white px-3 py-2 text-xs rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-1"
                      >
                        {isGenerating ? (
                          <>
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                            Generating...
                          </>
                        ) : (
                          'Generate Playbook'
                        )}
                      </button>
                    </div>
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
interface PlaybookCategoryProps {
  title: string
  icon: React.ReactNode
  playbooks: Playbook[]
  selectedPlaybook: string | null
  onSelectPlaybook: (id: string) => void
  formatRelativeTime: (date: Date) => string
}

function PlaybookCategory({ 
  title, 
  icon, 
  playbooks, 
  selectedPlaybook, 
  onSelectPlaybook, 
  formatRelativeTime 
}: PlaybookCategoryProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  
  return (
    <div className="border-b border-gray-200">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-gray-50"
      >
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
          {icon}
          {title}
          <span className="text-gray-400">({playbooks.length})</span>
        </div>
        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </button>
      
      {isExpanded && (
        <div className="pb-2">
          {playbooks.map(playbook => (
            <div
              key={playbook.id}
              onClick={() => onSelectPlaybook(playbook.id)}
              className={`mx-2 p-3 rounded cursor-pointer group flex items-center justify-between ${
                selectedPlaybook === playbook.id ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50'
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 truncate">
                  {playbook.title}
                </div>
                <div className="text-xs text-gray-500">
                  {formatRelativeTime(playbook.lastEdited)}
                </div>
              </div>
              <button className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 rounded">
                <MoreHorizontal className="h-4 w-4 text-gray-500" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
