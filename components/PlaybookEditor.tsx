'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { TextStyle } from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import FontFamily from '@tiptap/extension-font-family'
import Highlight from '@tiptap/extension-highlight'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import Placeholder from '@tiptap/extension-placeholder'
import Link from '@tiptap/extension-link'
import { Assignment, AssignmentAttributes } from '@/lib/extensions/Assignment'
import { AssignmentDecorations } from '@/lib/extensions/AssignmentDecorations'
import AssignmentModal from './AssignmentModal'
import { useState, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { 
  Bold, Italic, Underline as UnderlineIcon, List, ListOrdered,
  IndentDecrease, IndentIncrease, Link as LinkIcon, StickyNote, Minus,
  Eye, Download, History, Copy, Palette, Highlighter,
  ChevronDown, ChevronRight, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  UserCheck
} from 'lucide-react'

interface PlaybookEditorProps {
      content?: string
      onChange?: (content: string) => void
      editable?: boolean
      placeholder?: string
      onSelectionChange?: (selection: any) => void
      className?: string
      onExportPDF?: () => void
      onOpenVersions?: () => void
      onDuplicatePlaybook?: () => void
      isSaving?: boolean
      lastSaved?: Date | null
      trackChangesEnabled?: boolean
      onToggleTrackChanges?: () => void
      collaborators?: Array<{ id: string; name: string; email: string }>
      rightSidebarCollapsed?: boolean
      leftSidebarCollapsed?: boolean
}

export default function PlaybookEditor({
  content = '',
  onChange,
  editable = true,
  placeholder = 'Start writing your playbook...',
  onSelectionChange,
  className = '',
  onExportPDF, 
  onOpenVersions, 
  onDuplicatePlaybook, 
  isSaving = false,
  lastSaved = null,
  trackChangesEnabled = false,
  onToggleTrackChanges,
  collaborators = [],
  rightSidebarCollapsed = false,
  leftSidebarCollapsed = false
}: PlaybookEditorProps) {
  const [showTextColorPopup, setShowTextColorPopup] = useState(false)
  const [showHighlightPopup, setShowHighlightPopup] = useState(false)
  const [showTextAlignPopup, setShowTextAlignPopup] = useState(false)
  const [showFontEditorPopup, setShowFontEditorPopup] = useState(false)
  const [showAssignmentModal, setShowAssignmentModal] = useState(false)
  const [editingAssignment, setEditingAssignment] = useState<AssignmentAttributes | null>(null)
  const [assignmentToRemovePos, setAssignmentToRemovePos] = useState<number | null>(null)
  const [buttonPositions, setButtonPositions] = useState<{ textColor?: DOMRect, highlight?: DOMRect, textAlign?: DOMRect, fontEditor?: DOMRect }>({})

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        bulletList: { keepMarks: true, keepAttributes: false },
        orderedList: { keepMarks: true, keepAttributes: false },
        underline: false, // Disable underline from StarterKit to avoid duplicate
        link: false, // Disable link from StarterKit to avoid duplicate
      }),
      TextStyle,
      Color.configure({ types: ['textStyle'] }),
      FontFamily.configure({
        types: ['textStyle'],
      }),
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
      Assignment,
      AssignmentDecorations.configure({
        onEdit: (attrs) => {
          setEditingAssignment(attrs)
          setShowAssignmentModal(true)
        },
        onRemove: (pos) => {
          setAssignmentToRemovePos(pos)
        },
        rightSidebarCollapsed,
      }),
    ],
    content: content || '',
    editable,
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none',
        style: 'scroll-behavior: auto;'
      },
    },
    onUpdate: ({ editor }) => {
      const json = editor.getJSON()
      onChange?.(JSON.stringify(json))
    },
    onSelectionUpdate: ({ editor }) => {
      const selection = editor.state.selection
      onSelectionChange?.(selection)
    },
  })

  // Update editor content when content prop changes (but not when it's from editor itself)
  useEffect(() => {
    if (editor && content !== undefined) {
      console.log('Updating editor content:', typeof content, content ? (typeof content === 'string' ? content.substring(0, 100) : JSON.stringify(content).substring(0, 100)) : 'empty')
      
      try {
        // Get current editor content to compare
        const currentContent = editor.getJSON()
        let newContent
        
        // Parse the incoming content
        if (typeof content === 'string') {
          try {
            newContent = JSON.parse(content)
          } catch {
            // If it's not JSON, treat it as plain text
            newContent = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: content }] }] }
          }
        } else if (content) {
          newContent = content
        } else {
          newContent = { type: 'doc', content: [] }
        }
        
        // Only update if content is actually different AND the editor is not currently focused
        // This prevents cursor reset when user is actively typing
        if (JSON.stringify(currentContent) !== JSON.stringify(newContent) && !editor.isFocused) {
          console.log('Content is different and editor not focused, updating editor')
          editor.commands.setContent(newContent)
        } else if (JSON.stringify(currentContent) !== JSON.stringify(newContent)) {
          console.log('Content is different but editor is focused, skipping update to preserve cursor')
        } else {
          console.log('Content is the same, skipping update')
        }
      } catch (error) {
        console.error('Error updating editor content:', error)
      }
    }
  }, [editor, content])

  const setLink = useCallback(() => {
    if (!editor) return
    const previousUrl = editor.getAttributes('link').href
    const url = window.prompt('URL', previousUrl)

    if (url === null) return
    if (url === '') {
      editor.chain().extendMarkRange('link').unsetLink().run()
      return
    }

    editor.chain().extendMarkRange('link').setLink({ href: url }).run()
  }, [editor])

  const addNote = useCallback(() => {
    if (!editor) return
    editor.chain().insertContent({
      type: 'blockquote',
      attrs: {},
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: '📝 Note: ',
              marks: [{ type: 'bold' }]
            }
          ]
        }
      ]
    }).run()
  }, [editor])

  const addHorizontalRule = useCallback(() => {
    if (!editor) return
    editor.chain().setHorizontalRule().run()
  }, [editor])

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

  const handleAssignmentSave = (attributes: AssignmentAttributes) => {
    if (editor) {
      editor.chain().focus().addAssignment(attributes).run()
      setEditingAssignment(null)
    }
  }

  const handleAssignmentRemove = () => {
    if (editor) {
      editor.chain().focus().removeAssignment().run()
    }
  }

  // Handle removal from decoration widget
  useEffect(() => {
    if (assignmentToRemovePos !== null && editor) {
      // Find the assignment mark at this position and remove it
      const { doc } = editor.state
      let foundAssignment = false
      
      doc.descendants((node, pos) => {
        if (foundAssignment) return false
        
        node.marks.forEach((mark) => {
          if (mark.type.name === 'assignment' && pos === assignmentToRemovePos) {
            // Set selection to this range and remove the assignment mark
            const from = pos
            const to = pos + node.nodeSize
            editor.chain()
              .setTextSelection({ from, to })
              .removeAssignment()
              .run()
            foundAssignment = true
          }
        })
      })
      
      setAssignmentToRemovePos(null)
    }
  }, [assignmentToRemovePos, editor])

  // Reset editing assignment when modal closes
  const handleModalClose = () => {
    setShowAssignmentModal(false)
    setEditingAssignment(null)
  }

  // Update decoration widget styles when sidebar state changes
  useEffect(() => {
    if (!editor) return

    const updateWidgetStyles = () => {
      const widgets = document.querySelectorAll('.assignment-decoration')
      const anySidebarCollapsed = rightSidebarCollapsed || leftSidebarCollapsed
      
      widgets.forEach((widget: Element) => {
        const htmlWidget = widget as HTMLElement
        
        if (anySidebarCollapsed) {
          // Any sidebar collapsed: always show widgets in right margin
          htmlWidget.style.right = '-500px'
          htmlWidget.style.opacity = '1'
          htmlWidget.style.pointerEvents = 'auto'
        } else {
          // Both sidebars expanded: hide by default, show near editor on hover
          htmlWidget.style.right = '10px'
          htmlWidget.style.opacity = '0'
          htmlWidget.style.pointerEvents = 'none'
        }
      })
    }

    // Update immediately
    updateWidgetStyles()

    // Update after a short delay to ensure decorations are rendered
    const timer = setTimeout(updateWidgetStyles, 100)

    return () => clearTimeout(timer)
  }, [editor, rightSidebarCollapsed, leftSidebarCollapsed])

  // Handle hover behavior for assignment decorations when both sidebars are expanded
  useEffect(() => {
    const anySidebarCollapsed = rightSidebarCollapsed || leftSidebarCollapsed
    if (!editor || anySidebarCollapsed) return

    const handleMouseMove = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      
      // Check if hovering over an assignment mark
      const assignmentMark = target.closest('mark[data-assignment="true"]')
      
      // Get all decoration widgets
      const widgets = document.querySelectorAll('.assignment-decoration')
      
      if (assignmentMark) {
        // Show widgets when hovering over assignment marks
        widgets.forEach((widget: Element) => {
          const htmlWidget = widget as HTMLElement
          htmlWidget.style.opacity = '1'
          htmlWidget.style.pointerEvents = 'auto'
        })
      } else {
        // Hide widgets when not hovering
        widgets.forEach((widget: Element) => {
          const htmlWidget = widget as HTMLElement
          htmlWidget.style.opacity = '0'
          htmlWidget.style.pointerEvents = 'none'
        })
      }
    }

    const editorElement = document.querySelector('.ProseMirror')
    if (editorElement) {
      editorElement.addEventListener('mousemove', handleMouseMove)
      
      return () => {
        editorElement.removeEventListener('mousemove', handleMouseMove)
      }
    }
  }, [editor, rightSidebarCollapsed, leftSidebarCollapsed])

  if (!editor) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500">Loading editor...</div>
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 flex flex-col ${className}`}>
      {/* Editor Toolbar */}
      <div className="border-b border-gray-200 bg-gray-50 p-2 sticky top-0 z-20 flex-shrink-0">
        <div className="flex items-center gap-2 overflow-x-auto overflow-y-visible toolbar-scroll">
        {/* Saved Status - Far Left */}
        <div className="flex items-center gap-2 flex-shrink-0 mr-2">
          {isSaving ? (
            <div className="flex items-center gap-2 text-sm text-yellow-600">
              <div className="h-3 w-3 rounded-full bg-yellow-500 animate-pulse"></div>
              <span>Saving...</span>
            </div>
          ) : lastSaved ? (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <div className="h-3 w-3 rounded-full bg-green-500"></div>
              <span>Saved</span>
            </div>
          ) : null}
        </div>

        {/* Left Side - Formatting Tools */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Text Formatting */}
          <div className="flex items-center gap-1 border-r border-gray-300 pr-2">
            <button
                onClick={() => editor.chain().toggleBold().run()}
              className={`p-2 rounded hover:bg-gray-200 transition-colors ${
                editor.isActive('bold') ? 'bg-blue-100 text-blue-600' : 'text-gray-600'
              }`}
              title="Bold (Ctrl+B)"
            >
              <Bold className="h-4 w-4" />
            </button>
            <button
                onClick={() => editor.chain().toggleItalic().run()}
              className={`p-2 rounded hover:bg-gray-200 transition-colors ${
                editor.isActive('italic') ? 'bg-blue-100 text-blue-600' : 'text-gray-600'
              }`}
              title="Italic (Ctrl+I)"
            >
              <Italic className="h-4 w-4" />
            </button>
            <button
                onClick={() => editor.chain().toggleUnderline().run()}
              className={`p-2 rounded hover:bg-gray-200 transition-colors ${
                editor.isActive('underline') ? 'bg-blue-100 text-blue-600' : 'text-gray-600'
              }`}
              title="Underline (Ctrl+U)"
            >
              <UnderlineIcon className="h-4 w-4" />
            </button>
          </div>

          {/* Lists */}
          <div className="flex items-center gap-1 border-r border-gray-300 pr-2">
            <button
                onClick={() => editor.chain().toggleBulletList().run()}
              className={`p-2 rounded hover:bg-gray-200 transition-colors ${
                editor.isActive('bulletList') ? 'bg-blue-100 text-blue-600' : 'text-gray-600'
              }`}
              title="Bullet List"
            >
              <List className="h-4 w-4" />
            </button>
            <button
                onClick={() => editor.chain().toggleOrderedList().run()}
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
                onClick={() => editor.chain().liftListItem('listItem').run()}
              className="p-2 rounded hover:bg-gray-200 transition-colors text-gray-600"
              title="Decrease Indent"
            >
              <IndentDecrease className="h-4 w-4" />
            </button>
            <button
                onClick={() => editor.chain().sinkListItem('listItem').run()}
              className="p-2 rounded hover:bg-gray-200 transition-colors text-gray-600"
              title="Increase Indent"
            >
              <IndentIncrease className="h-4 w-4" />
            </button>
          </div>

            {/* Font Editor */}
            <div className="flex items-center gap-1 border-r border-gray-300 pr-2">
              <div className="relative">
                <button
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect()
                    setButtonPositions(prev => ({ ...prev, fontEditor: rect }))
                    setShowFontEditorPopup(!showFontEditorPopup)
                    setShowTextColorPopup(false)
                    setShowHighlightPopup(false)
                    setShowTextAlignPopup(false)
                  }}
                  className="p-2 rounded hover:bg-gray-200 transition-colors text-gray-600 font-bold text-lg"
                  title="Font Options"
                >
                  T
                </button>
              </div>
          </div>

          {/* Text Alignment */}
          <div className="flex items-center gap-1 border-r border-gray-300 pr-2">
              <div className="relative">
              <button
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect()
                    setButtonPositions(prev => ({ ...prev, textAlign: rect }))
                    setShowTextAlignPopup(!showTextAlignPopup)
                    setShowTextColorPopup(false)
                    setShowHighlightPopup(false)
                    setShowFontEditorPopup(false)
                  }}
                className={`p-2 rounded hover:bg-gray-200 transition-colors ${
                    editor.isActive({ textAlign: 'left' }) ||
                    editor.isActive({ textAlign: 'center' }) ||
                    editor.isActive({ textAlign: 'right' }) ||
                    editor.isActive({ textAlign: 'justify' })
                      ? 'bg-blue-100 text-blue-600' : 'text-gray-600'
                }`}
                title="Text Alignment"
              >
                <AlignLeft className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Colors */}
          <div className="flex items-center gap-1 border-r border-gray-300 pr-2">
              <div className="relative">
              <button
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect()
                    setButtonPositions(prev => ({ ...prev, textColor: rect }))
                    setShowTextColorPopup(!showTextColorPopup)
                    setShowHighlightPopup(false)
                    setShowTextAlignPopup(false)
                    setShowFontEditorPopup(false)
                  }}
                className="p-2 rounded hover:bg-gray-200 transition-colors text-gray-600"
                title="Text Color"
              >
                <Palette className="h-4 w-4" />
              </button>
                </div>
              <div className="relative">
              <button
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect()
                    setButtonPositions(prev => ({ ...prev, highlight: rect }))
                    setShowHighlightPopup(!showHighlightPopup)
                    setShowTextColorPopup(false)
                    setShowTextAlignPopup(false)
                    setShowFontEditorPopup(false)
                  }}
                className="p-2 rounded hover:bg-gray-200 transition-colors text-gray-600"
                title="Highlight Color"
              >
                <Highlighter className="h-4 w-4" />
              </button>
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
              onClick={() => setShowAssignmentModal(true)}
              className={`p-2 rounded hover:bg-gray-200 transition-colors ${
                editor.isActive('assignment') ? 'bg-green-100 text-green-600' : 'text-gray-600'
              }`}
              title="Create Assignment"
            >
              <UserCheck className="h-4 w-4" />
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
                onClick={() => onToggleTrackChanges?.()}
              className={`p-2 rounded hover:bg-gray-200 transition-colors ${
                trackChangesEnabled ? 'bg-blue-100 text-blue-600' : 'text-gray-600'
              }`}
              title="Track Changes"
            >
              <Eye className="h-4 w-4" />
            </button>
            <button
                onClick={() => onExportPDF?.()}
              className="p-2 rounded hover:bg-gray-200 transition-colors text-gray-600"
              title="Export to PDF"
            >
              <Download className="h-4 w-4" />
            </button>
            <button
                onClick={() => onOpenVersions?.()}
              className="p-2 rounded hover:bg-gray-200 transition-colors text-gray-600"
              title="Version History"
            >
              <History className="h-4 w-4" />
            </button>
            <button
                onClick={() => onDuplicatePlaybook?.()}
              className="p-2 rounded hover:bg-gray-200 transition-colors text-gray-600"
              title="Duplicate Playbook"
            >
              <Copy className="h-4 w-4" />
            </button>
          </div>


            {/* Status - Removed auto-save text, keeping only last saved time if available */}
            {lastSaved && (
          <div className="flex items-center gap-2 flex-shrink-0">
              <div className="text-xs text-gray-500">
                Last saved: {formatLastSaved(lastSaved)}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Portal Popups */}
        {showTextColorPopup && buttonPositions.textColor && createPortal(
          <div
            className="fixed bg-white border border-gray-200 rounded shadow-lg p-2 z-[9999]"
            style={{
              top: buttonPositions.textColor.bottom + 4,
              left: buttonPositions.textColor.left,
              minWidth: '120px'
            }}
          >
            <div className="grid grid-cols-4 gap-1">
              {['#000000', '#374151', '#6B7280', '#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#F97316', '#84CC16', '#06B6D4'].map((color, index) => (
                <button
                  key={`text-${index}-${color}`}
                  onClick={() => {
                    editor.chain().setColor(color).run()
                    setShowTextColorPopup(false)
                  }}
                  className="w-6 h-6 rounded border border-gray-300 hover:scale-110 transition-transform"
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
      </div>
          </div>,
          document.body
        )}

        {showHighlightPopup && buttonPositions.highlight && createPortal(
          <div
            className="fixed bg-white border border-gray-200 rounded shadow-lg p-2 z-[9999]"
            style={{
              top: buttonPositions.highlight.bottom + 4,
              left: buttonPositions.highlight.left,
              minWidth: '120px'
            }}
          >
            <div className="grid grid-cols-4 gap-1">
              {['#FEF3C7', '#FDE68A', '#FED7AA', '#FECACA', '#FED7D7', '#E5E7EB', '#DBEAFE', '#E0E7FF', '#EDE9FE', '#FCE7F3', '#D1FAE5', '#F3E8FF'].map((color, index) => (
                <button
                  key={`highlight-${index}-${color}`}
                  onClick={() => {
                    editor.chain().toggleHighlight({ color }).run()
                    setShowHighlightPopup(false)
                  }}
                  className="w-6 h-6 rounded border border-gray-300 hover:scale-110 transition-transform"
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
    </div>
          </div>,
          document.body
        )}

        {showTextAlignPopup && buttonPositions.textAlign && createPortal(
          <div
            className="fixed bg-white border border-gray-200 rounded shadow-lg p-3 z-[9999]"
            style={{
              top: buttonPositions.textAlign.bottom + 4,
              left: buttonPositions.textAlign.left,
              minWidth: '140px'
            }}
          >
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  editor.chain().setTextAlign('left').run()
                  setShowTextAlignPopup(false)
                }}
                className={`p-3 rounded hover:bg-gray-200 transition-colors flex items-center justify-center border ${
                  editor.isActive({ textAlign: 'left' }) ? 'bg-blue-100 text-blue-600 border-blue-300' : 'text-gray-600 border-gray-200'
                }`}
                title="Align Left"
              >
                <AlignLeft className="h-5 w-5" />
              </button>
              <button
                onClick={() => {
                  editor.chain().setTextAlign('center').run()
                  setShowTextAlignPopup(false)
                }}
                className={`p-3 rounded hover:bg-gray-200 transition-colors flex items-center justify-center border ${
                  editor.isActive({ textAlign: 'center' }) ? 'bg-blue-100 text-blue-600 border-blue-300' : 'text-gray-600 border-gray-200'
                }`}
                title="Align Center"
              >
                <AlignCenter className="h-5 w-5" />
              </button>
              <button
                onClick={() => {
                  editor.chain().setTextAlign('right').run()
                  setShowTextAlignPopup(false)
                }}
                className={`p-3 rounded hover:bg-gray-200 transition-colors flex items-center justify-center border ${
                  editor.isActive({ textAlign: 'right' }) ? 'bg-blue-100 text-blue-600 border-blue-300' : 'text-gray-600 border-gray-200'
                }`}
                title="Align Right"
              >
                <AlignRight className="h-5 w-5" />
              </button>
              <button
                onClick={() => {
                  editor.chain().setTextAlign('justify').run()
                  setShowTextAlignPopup(false)
                }}
                className={`p-3 rounded hover:bg-gray-200 transition-colors flex items-center justify-center border ${
                  editor.isActive({ textAlign: 'justify' }) ? 'bg-blue-100 text-blue-600 border-blue-300' : 'text-gray-600 border-gray-200'
                }`}
                title="Justify"
              >
                <AlignJustify className="h-5 w-5" />
              </button>
            </div>
          </div>,
          document.body
        )}

        {showFontEditorPopup && buttonPositions.fontEditor && createPortal(
          <div
            className="fixed bg-white border border-gray-200 rounded shadow-lg p-4 z-[9999]"
            style={{
              top: buttonPositions.fontEditor.bottom + 4,
              left: buttonPositions.fontEditor.left,
              minWidth: '200px'
            }}
          >
            <div className="space-y-3">
              {/* Font Family */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Font Family</label>
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      editor.chain().setFontFamily(e.target.value).run()
                    }
                  }}
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
                  onChange={(e) => {
                    if (e.target.value) {
                      editor.chain().setFontSize(e.target.value).run()
                    }
                  }}
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
          </div>,
          document.body
        )}
      </div>

      {/* Editor Content */}
      <div className="flex-1 overflow-y-auto">
        <div className={`relative ${(rightSidebarCollapsed || leftSidebarCollapsed) ? 'pr-[220px]' : ''}`}>
          <EditorContent 
            editor={editor} 
            className="min-h-[500px] p-6 focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-opacity-20"
          />
        </div>
      </div>

      {/* Assignment Modal */}
      <AssignmentModal
        isOpen={showAssignmentModal}
        onClose={handleModalClose}
        onSave={handleAssignmentSave}
        currentAttributes={editingAssignment || editor.getAttributes('assignment')}
        availableUsers={collaborators}
      />
    </div>
  )
}

// Export the extractTableOfContents function for use in other components
export function extractTableOfContents(content: string | any): Array<{ id: string; title: string; level: number; sectionNumber: string }> {
  try {
    // Handle both string and object content
    let parsed: any
    if (typeof content === 'string') {
      parsed = JSON.parse(content)
    } else if (typeof content === 'object' && content !== null) {
      parsed = content
    } else {
      return []
    }
    const toc: Array<{ id: string; title: string; level: number; sectionNumber: string }> = []
    
    function traverse(node: any, sectionNumbers: number[] = []) {
      if (node.type === 'heading') {
        const level = node.attrs?.level || 1
        const title = node.content?.[0]?.text || ''
        const sectionNumber = sectionNumbers.slice(0, level).join('.')

        toc.push({
          id: `heading-${toc.length}`,
          title,
          level,
          sectionNumber
        })
        
        // Update section numbers
        sectionNumbers[level - 1] = (sectionNumbers[level - 1] || 0) + 1
        sectionNumbers = sectionNumbers.slice(0, level)
      }
      
      if (node.content) {
        node.content.forEach((child: any) => traverse(child, [...sectionNumbers]))
      }
    }

    traverse(parsed)
    return toc
  } catch (error) {
    console.error('Error extracting table of contents:', error)
    return []
  }
}