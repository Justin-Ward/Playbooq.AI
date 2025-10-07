'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Color from '@tiptap/extension-color'
import { TextStyle } from '@tiptap/extension-text-style'
import Highlight from '@tiptap/extension-highlight'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import Placeholder from '@tiptap/extension-placeholder'
import Link from '@tiptap/extension-link'

// Custom Font Family Extension
const FontFamily = TextStyle.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      fontFamily: {
        default: null,
        parseHTML: element => element.style.fontFamily?.replace(/['"]/g, ''),
        renderHTML: attributes => {
          if (!attributes.fontFamily) {
            return {}
          }
          return {
            style: `font-family: ${attributes.fontFamily}`,
          }
        },
      },
    }
  },
  addCommands() {
    return {
      setFontFamily: (fontFamily) => ({ chain }) => {
        return chain()
          .setMark(this.name, { fontFamily })
          .run()
      },
    }
  },
})

// Custom Font Size Extension
const FontSize = TextStyle.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      fontSize: {
        default: null,
        parseHTML: element => element.style.fontSize?.replace(/['"]/g, ''),
        renderHTML: attributes => {
          if (!attributes.fontSize) {
            return {}
          }
          return {
            style: `font-size: ${attributes.fontSize}`,
          }
        },
      },
    }
  },
  addCommands() {
    return {
      setFontSize: (fontSize) => ({ chain }) => {
        return chain()
          .setMark(this.name, { fontSize })
          .run()
      },
    }
  },
})

import { useCallback, useEffect, useState } from 'react'
import { 
  Bold, 
  Italic, 
  Underline as UnderlineIcon, 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  AlignJustify,
  List,
  ListOrdered,
  Link as LinkIcon,
  Palette,
  Highlighter,
  Minus,
  StickyNote,
  Save,
  Clock,
  Users,
  History,
  Copy,
  Upload,
  Settings,
  MoreHorizontal,
  Eye,
  EyeOff,
  Download,
  Share2,
  IndentDecrease,
  IndentIncrease,
  Store
} from 'lucide-react'

interface EditorToolbarProps {
  editor: any
  onExportPDF?: () => void
  onOpenVersions?: () => void
  onDuplicatePlaybook?: () => void
  onToggleMarketplace?: () => void
  isInMarketplace?: boolean
  isSaving?: boolean
  lastSaved?: Date | null
  trackChangesEnabled?: boolean
  onToggleTrackChanges?: () => void
}

interface PlaybookEditorProps {
      content?: string
      onChange?: (content: string) => void
      editable?: boolean
      placeholder?: string
      onSelectionChange?: (selection: any) => void
      className?: string
      // New toolbar props
      onExportPDF?: () => void
      onOpenVersions?: () => void
      onDuplicatePlaybook?: () => void
      onToggleMarketplace?: () => void
      isInMarketplace?: boolean
      isSaving?: boolean
      lastSaved?: Date | null
      trackChangesEnabled?: boolean
      onToggleTrackChanges?: () => void
      // New display options
      showToolbarOnly?: boolean
      showContentOnly?: boolean
    }

interface TableOfContentsItem {
  id: string
  title: string
  level: number
  sectionNumber: string
}

// Toolbar Component
function EditorToolbar({ 
  editor, 
  onExportPDF, 
  onOpenVersions, 
  onDuplicatePlaybook, 
  onToggleMarketplace,
  isInMarketplace = false,
  isSaving = false,
  lastSaved = null,
  trackChangesEnabled = false,
  onToggleTrackChanges
}: EditorToolbarProps) {
  const setLink = useCallback(() => {
    if (!editor) return
    const previousUrl = editor.getAttributes('link').href
    const url = window.prompt('URL', previousUrl)

    // cancelled
    if (url === null) {
      return
    }

    // empty
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }

    // update link
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }, [editor])

  const addNote = useCallback(() => {
    if (!editor) return
    editor.chain().focus().insertContent({
      type: 'blockquote',
      attrs: {},
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: '📝 Note: ',
              marks: [
                {
                  type: 'bold'
                }
              ]
            }
          ]
        }
      ]
    }).run()
  }, [editor])

  const addHorizontalRule = useCallback(() => {
    if (!editor) return
    editor.chain().focus().setHorizontalRule().run()
  }, [editor])

  if (!editor) return null

  const formatLastSaved = (date: Date | null) => {
    if (!date) return 'Never'
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    
    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    return date.toLocaleDateString()
  }

  return (
    <div className="border-b border-gray-200 bg-gray-50 p-2 sticky top-0 z-10">
      <div className="flex items-center gap-2 overflow-x-auto overflow-y-hidden toolbar-scroll">
        {/* Left Side - Formatting Tools */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Text Formatting */}
          <div className="flex items-center gap-1 border-r border-gray-300 pr-2">
            <button
              onClick={() => editor.chain().focus().toggleBold().run()}
              className={`p-2 rounded hover:bg-gray-200 transition-colors ${
                editor.isActive('bold') ? 'bg-blue-100 text-blue-600' : 'text-gray-600'
              }`}
              title="Bold (Ctrl+B)"
            >
              <Bold className="h-4 w-4" />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleItalic().run()}
              className={`p-2 rounded hover:bg-gray-200 transition-colors ${
                editor.isActive('italic') ? 'bg-blue-100 text-blue-600' : 'text-gray-600'
              }`}
              title="Italic (Ctrl+I)"
            >
              <Italic className="h-4 w-4" />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              className={`p-2 rounded hover:bg-gray-200 transition-colors ${
                editor.isActive('underline') ? 'bg-blue-100 text-blue-600' : 'text-gray-600'
              }`}
              title="Underline (Ctrl+U)"
            >
              <UnderlineIcon className="h-4 w-4" />
            </button>
          </div>

          {/* Font Editor */}
          <div className="flex items-center gap-1 border-r border-gray-300 pr-2">
            {/* Font T Button with Popup */}
            <div className="relative group">
              <button
                className="p-2 rounded hover:bg-gray-200 transition-colors text-gray-600 font-bold text-lg"
                title="Font Options"
              >
                T
              </button>
              <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded shadow-lg p-4 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10 min-w-64">
                <div className="space-y-3">
                  {/* Font Family */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Font Family</label>
                    <select
                      onChange={(e) => editor.chain().focus().setFontFamily(e.target.value).run()}
                      className="w-full text-sm border border-gray-300 rounded px-3 py-2 bg-white hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">Default Font</option>
                      <option value="Arial, sans-serif">Arial</option>
                      <option value="Helvetica, sans-serif">Helvetica</option>
                      <option value="Georgia, serif">Georgia</option>
                      <option value="Times New Roman, serif">Times New Roman</option>
                      <option value="Courier New, monospace">Courier New</option>
                      <option value="Verdana, sans-serif">Verdana</option>
                      <option value="Trebuchet MS, sans-serif">Trebuchet MS</option>
                      <option value="Impact, sans-serif">Impact</option>
                      <option value="Comic Sans MS, cursive">Comic Sans MS</option>
                    </select>
                  </div>
                  
                  {/* Font Size */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Font Size</label>
                    <select
                      onChange={(e) => editor.chain().focus().setFontSize(e.target.value).run()}
                      className="w-full text-sm border border-gray-300 rounded px-3 py-2 bg-white hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">Default Size</option>
                      <option value="8px">8px</option>
                      <option value="9px">9px</option>
                      <option value="10px">10px</option>
                      <option value="11px">11px</option>
                      <option value="12px">12px</option>
                      <option value="14px">14px</option>
                      <option value="16px">16px</option>
                      <option value="18px">18px</option>
                      <option value="20px">20px</option>
                      <option value="24px">24px</option>
                      <option value="28px">28px</option>
                      <option value="32px">32px</option>
                      <option value="36px">36px</option>
                      <option value="48px">48px</option>
                      <option value="72px">72px</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Lists */}
          <div className="flex items-center gap-1 border-r border-gray-300 pr-2">
            <button
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              className={`p-2 rounded hover:bg-gray-200 transition-colors ${
                editor.isActive('bulletList') ? 'bg-blue-100 text-blue-600' : 'text-gray-600'
              }`}
              title="Bullet List"
            >
              <List className="h-4 w-4" />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              className={`p-2 rounded hover:bg-gray-200 transition-colors ${
                editor.isActive('orderedList') ? 'bg-blue-100 text-blue-600' : 'text-gray-600'
              }`}
              title="Numbered List"
            >
              <ListOrdered className="h-4 w-4" />
            </button>
          </div>

          {/* Indentation */}
          <div className="flex items-center gap-1 border-r border-gray-300 pr-2">
            <button
              onClick={() => {
                if (editor.isActive('bulletList') || editor.isActive('orderedList')) {
                  editor.chain().focus().liftListItem('listItem').run()
                }
              }}
              className="p-2 rounded hover:bg-gray-200 transition-colors text-gray-600"
              title="Decrease Indent"
            >
              <IndentDecrease className="h-4 w-4" />
            </button>
            <button
              onClick={() => {
                if (editor.isActive('bulletList') || editor.isActive('orderedList')) {
                  editor.chain().focus().sinkListItem('listItem').run()
                }
              }}
              className="p-2 rounded hover:bg-gray-200 transition-colors text-gray-600"
              title="Increase Indent"
            >
              <IndentIncrease className="h-4 w-4" />
            </button>
          </div>

          {/* Text Alignment */}
          <div className="flex items-center gap-1 border-r border-gray-300 pr-2">
            {/* Single Alignment Button with Popup */}
            <div className="relative group">
              <button
                className={`p-2 rounded hover:bg-gray-200 transition-colors ${
                  editor.isActive({ textAlign: 'left' }) ? 'bg-blue-100 text-blue-600' : 'text-gray-600'
                }`}
                title="Text Alignment"
              >
                <AlignLeft className="h-4 w-4" />
              </button>
              <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded shadow-lg p-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => editor.chain().focus().setTextAlign('left').run()}
                    className={`p-3 rounded hover:bg-gray-200 transition-colors flex items-center justify-center border ${
                      editor.isActive({ textAlign: 'left' }) ? 'bg-blue-100 text-blue-600 border-blue-300' : 'text-gray-600 border-gray-200'
                    }`}
                    title="Align Left"
                  >
                    <AlignLeft className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => editor.chain().focus().setTextAlign('center').run()}
                    className={`p-3 rounded hover:bg-gray-200 transition-colors flex items-center justify-center border ${
                      editor.isActive({ textAlign: 'center' }) ? 'bg-blue-100 text-blue-600 border-blue-300' : 'text-gray-600 border-gray-200'
                    }`}
                    title="Align Center"
                  >
                    <AlignCenter className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => editor.chain().focus().setTextAlign('right').run()}
                    className={`p-3 rounded hover:bg-gray-200 transition-colors flex items-center justify-center border ${
                      editor.isActive({ textAlign: 'right' }) ? 'bg-blue-100 text-blue-600 border-blue-300' : 'text-gray-600 border-gray-200'
                    }`}
                    title="Align Right"
                  >
                    <AlignRight className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => editor.chain().focus().setTextAlign('justify').run()}
                    className={`p-3 rounded hover:bg-gray-200 transition-colors flex items-center justify-center border ${
                      editor.isActive({ textAlign: 'justify' }) ? 'bg-blue-100 text-blue-600 border-blue-300' : 'text-gray-600 border-gray-200'
                    }`}
                    title="Justify"
                  >
                    <AlignJustify className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Colors */}
          <div className="flex items-center gap-1 border-r border-gray-300 pr-2">
            <div className="relative group">
              <button
                className="p-2 rounded hover:bg-gray-200 transition-colors text-gray-600"
                title="Text Color"
              >
                <Palette className="h-4 w-4" />
              </button>
              <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded shadow-lg p-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                <div className="grid grid-cols-4 gap-2">
                  {['#000000', '#374151', '#6B7280', '#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#F97316', '#84CC16', '#06B6D4'].map((color, index) => (
                    <button
                      key={`text-${index}-${color}`}
                      onClick={() => editor.chain().focus().setColor(color).run()}
                      className="w-8 h-8 rounded border border-gray-300 hover:scale-110 transition-transform"
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="relative group">
              <button
                className="p-2 rounded hover:bg-gray-200 transition-colors text-gray-600"
                title="Highlight Color"
              >
                <Highlighter className="h-4 w-4" />
              </button>
              <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded shadow-lg p-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                <div className="grid grid-cols-4 gap-2">
                  {['#FEF3C7', '#FDE68A', '#FED7AA', '#FECACA', '#FED7D7', '#E5E7EB', '#DBEAFE', '#E0E7FF', '#EDE9FE', '#FCE7F3', '#D1FAE5', '#F3E8FF'].map((color, index) => (
                    <button
                      key={`highlight-${index}-${color}`}
                      onClick={() => editor.chain().focus().toggleHighlight({ color }).run()}
                      className="w-8 h-8 rounded border border-gray-300 hover:scale-110 transition-transform"
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Special Elements */}
          <div className="flex items-center gap-1 border-r border-gray-300 pr-2">
            <button
              onClick={setLink}
              className={`p-2 rounded hover:bg-gray-200 transition-colors ${
                editor.isActive('link') ? 'bg-blue-100 text-blue-600' : 'text-gray-600'
              }`}
              title="Insert Link (Ctrl+K)"
            >
              <LinkIcon className="h-4 w-4" />
            </button>
            <button
              onClick={addNote}
              className="p-2 rounded hover:bg-gray-200 transition-colors text-gray-600"
              title="Insert Note"
            >
              <StickyNote className="h-4 w-4" />
            </button>
            <button
              onClick={addHorizontalRule}
              className="p-2 rounded hover:bg-gray-200 transition-colors text-gray-600"
              title="Insert Horizontal Rule"
            >
              <Minus className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Right Side - Document Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Document Actions */}
          <div className="flex items-center gap-1 border-r border-gray-300 pr-2">
            <button
              onClick={onToggleTrackChanges}
              className={`p-2 rounded hover:bg-gray-200 transition-colors ${
                trackChangesEnabled ? 'bg-blue-100 text-blue-600' : 'text-gray-600'
              }`}
              title="Track Changes"
            >
              <Eye className="h-4 w-4" />
            </button>
            <button
              onClick={onExportPDF}
              className="p-2 rounded hover:bg-gray-200 transition-colors text-gray-600"
              title="Export to PDF"
            >
              <Download className="h-4 w-4" />
            </button>
            <button
              onClick={onOpenVersions}
              className="p-2 rounded hover:bg-gray-200 transition-colors text-gray-600"
              title="Version History"
            >
              <History className="h-4 w-4" />
            </button>
            <button
              onClick={onDuplicatePlaybook}
              className="p-2 rounded hover:bg-gray-200 transition-colors text-gray-600"
              title="Duplicate Playbook"
            >
              <Copy className="h-4 w-4" />
            </button>
          </div>

          {/* Marketplace */}
          <div className="flex items-center gap-1 border-r border-gray-300 pr-2">
            <button
              onClick={onToggleMarketplace}
              className={`p-2 rounded hover:bg-gray-200 transition-colors ${
                isInMarketplace ? 'bg-blue-100 text-blue-600' : 'text-gray-600'
              }`}
              title={isInMarketplace ? "Marketplace Settings" : "Add to Marketplace"}
            >
              <Store className="h-4 w-4" />
            </button>
          </div>

          {/* Status */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="text-xs text-gray-500 flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-green-500"></div>
              Auto-save enabled
            </div>
            {lastSaved && (
              <div className="text-xs text-gray-500">
                Last saved: {formatLastSaved(lastSaved)}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Main Editor Component
export default function PlaybookEditor({
  content = '',
  onChange,
  editable = true,
  placeholder = 'Start writing your playbook...',
  onSelectionChange,
  className = '',
  // New toolbar props
  onExportPDF,
  onOpenVersions,
  onDuplicatePlaybook,
  onToggleMarketplace,
  isInMarketplace = false,
  isSaving = false,
  lastSaved = null,
  trackChangesEnabled = false,
  onToggleTrackChanges,
  // New display options
  showToolbarOnly = false,
  showContentOnly = false
}: PlaybookEditorProps) {
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('saved')

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
        bulletList: {
          keepMarks: true,
          keepAttributes: false,
        },
        orderedList: {
          keepMarks: true,
          keepAttributes: false,
        },
      }),
      TextStyle,
      Color.configure({ types: ['textStyle'] }),
      FontFamily,
      FontSize,
      Highlight.configure({ multicolor: true }),
      Underline,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Placeholder.configure({
        placeholder: 'Welcome to your playbook editor! Start typing your playbook here, or use the AI generation in the right sidebar to get started...',
        emptyEditorClass: 'is-editor-empty',
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 underline cursor-pointer hover:text-blue-800',
        },
      }),
    ],
    content,
    editable,
    onUpdate: ({ editor }) => {
      const json = editor.getJSON()
      onChange?.(JSON.stringify(json))
      setSaveStatus('saving')
      setTimeout(() => setSaveStatus('saved'), 1000)
    },
    onSelectionUpdate: ({ editor }) => {
      const selection = editor.state.selection
      onSelectionChange?.(selection)
    },
  })

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      try {
        const parsedContent = JSON.parse(content || '{}')
        editor.commands.setContent(parsedContent)
      } catch (error) {
        console.error('Error parsing content:', error)
        editor.commands.setContent(content)
      }
    }
  }, [content, editor])

  if (!editor) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500">Loading editor...</div>
      </div>
    )
  }

  // Show only toolbar
  if (showToolbarOnly) {
    return (
      <div className={className}>
        {editable && (
          <EditorToolbar 
            editor={editor}
            onExportPDF={onExportPDF}
            onOpenVersions={onOpenVersions}
            onDuplicatePlaybook={onDuplicatePlaybook}
            onToggleMarketplace={onToggleMarketplace}
            isInMarketplace={isInMarketplace}
            isSaving={isSaving}
            lastSaved={lastSaved}
            trackChangesEnabled={trackChangesEnabled}
            onToggleTrackChanges={onToggleTrackChanges}
          />
        )}
      </div>
    )
  }

  // Show only content
  if (showContentOnly) {
    const isEmpty = !editor.getText().trim()
    
    return (
      <div className={className}>
        <div className="relative">
          <EditorContent 
            editor={editor} 
            className="min-h-[500px] p-6 focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-opacity-20"
          />
        </div>
      </div>
    )
  }

  // Show full editor (default)
  return (
    <div className={`bg-white rounded-lg border border-gray-200 overflow-hidden ${className}`}>
      {editable && (
        <EditorToolbar 
          editor={editor}
          onExportPDF={onExportPDF}
          onOpenVersions={onOpenVersions}
          onDuplicatePlaybook={onDuplicatePlaybook}
          onToggleMarketplace={onToggleMarketplace}
          isInMarketplace={isInMarketplace}
          isSaving={isSaving}
          lastSaved={lastSaved}
          trackChangesEnabled={trackChangesEnabled}
          onToggleTrackChanges={onToggleTrackChanges}
        />
      )}
      
      <div className="relative">
        <EditorContent 
          editor={editor} 
          className="min-h-[500px] p-6 focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-opacity-20"
        />
      </div>
    </div>
  )
}

// Helper Functions
export function extractTableOfContents(content: string): TableOfContentsItem[] {
  try {
    const parsed = JSON.parse(content)
    const headings: TableOfContentsItem[] = []

    function traverse(node: any, id = 0, sectionNumbers: number[] = []) {
      if (node.type === 'heading') {
        const level = node.attrs?.level || 1
        
        // Update section numbers based on level
        sectionNumbers = sectionNumbers.slice(0, level - 1)
        sectionNumbers[level - 1] = (sectionNumbers[level - 1] || 0) + 1
        
        const sectionNumber = sectionNumbers.slice(0, level).join('.')
        const title = node.content?.map((c: any) => c.text || '').join('') || ''

        headings.push({
          id: `heading-${id}`,
          title,
          level,
          sectionNumber
        })
      }
      
      if (node.content) {
        node.content.forEach((child: any, index: number) => {
          traverse(child, `${id}-${index}`, [...sectionNumbers])
        })
      }
    }

    traverse(parsed)
    return headings
  } catch (error) {
    console.error('Error extracting table of contents:', error)
    return []
  }
}

export function extractTextFromTiptap(content: string): string {
  try {
    const parsed = JSON.parse(content)
    
    function extractText(node: any): string {
      if (node.text) {
        return node.text
      }
      
      if (node.content) {
        return node.content.map(extractText).join('')
      }
      
      return ''
    }
    
    return extractText(parsed)
  } catch (error) {
    console.error('Error extracting text:', error)
    return content
  }
}