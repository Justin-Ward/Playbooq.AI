import React, { useState, useCallback, useEffect, forwardRef, useImperativeHandle } from 'react'
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
import { Attachment, AttachmentAttributes } from '@/lib/extensions/Attachment'
import { InternalLink } from '@/lib/extensions/InternalLink'
import AssignmentModal from './AssignmentModal'
import AssignmentFilter from './AssignmentFilter'
import AttachmentsPanel from './AttachmentsPanel'
import { 
  Bold, Italic, Underline as UnderlineIcon, List, ListOrdered,
  IndentDecrease, IndentIncrease, Link as LinkIcon, StickyNote, Minus,
  Eye, Download, History, Copy, Palette, Highlighter,
  ChevronDown, ChevronRight, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  UserCheck, Undo, Redo, Paperclip, FileText
} from 'lucide-react'

interface InternalPage {
  id: string
  name: string
  title: string
  content: string
}

interface InternalPageEditorProps {
  page: InternalPage
  onContentChange: (pageId: string, content: string) => void
  collaborators: any[]
  rightSidebarCollapsed?: boolean
  leftSidebarCollapsed?: boolean
}

export interface InternalPageEditorRef {
  getEditor: () => any
}

const InternalPageEditor = forwardRef<InternalPageEditorRef, InternalPageEditorProps>(({
  page,
  onContentChange,
  collaborators,
  rightSidebarCollapsed = false,
  leftSidebarCollapsed = false
}, ref) => {
  const [showTextColorPopup, setShowTextColorPopup] = useState(false)
  const [showHighlightPopup, setShowHighlightPopup] = useState(false)
  const [showTextAlignPopup, setShowTextAlignPopup] = useState(false)
  const [showFontEditorPopup, setShowFontEditorPopup] = useState(false)
  const [showAssignmentModal, setShowAssignmentModal] = useState(false)
  const [editingAssignment, setEditingAssignment] = useState<AssignmentAttributes | null>(null)
  const [assignmentToRemovePos, setAssignmentToRemovePos] = useState<number | null>(null)
  const [assignmentFilter, setAssignmentFilter] = useState<string | null>(null)
  const [showAttachmentsPanel, setShowAttachmentsPanel] = useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const saveTimeoutRef = React.useRef<NodeJS.Timeout | null>(null)

  // Debounced save function - waits 3 seconds after user stops typing
  const debouncedSave = useCallback((pageId: string, content: string) => {
    // Clear any existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    // Set new timeout to save after 3 seconds
    saveTimeoutRef.current = setTimeout(() => {
      onContentChange(pageId, content)
    }, 3000)
  }, [onContentChange])

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        history: {
          depth: 100,
        },
        heading: { levels: [1, 2, 3, 4] },
      }),
      TextStyle,
      Color,
      FontFamily,
      Highlight.configure({
        multicolor: true,
      }),
      Underline,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Placeholder.configure({
        placeholder: 'Welcome to your playbook editor! Start typing your playbook here, or use the AI generation in the right sidebar to get started...',
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 underline cursor-pointer',
        },
      }),
      Assignment.configure({
        HTMLAttributes: {
          class: 'assignment-mark',
        },
      }),
      AssignmentDecorations.configure({
        rightSidebarCollapsed: rightSidebarCollapsed || leftSidebarCollapsed,
      }),
      Attachment,
      InternalLink,
    ],
    content: page.content,
    editable: true,
    onUpdate: ({ editor }) => {
      const content = editor.getHTML()
      // Remove the title from the content if it's the first h1 element
      const contentWithoutTitle = content.replace(/^<h1>.*?<\/h1>\s*/, '')
      // Use debounced save instead of immediate save
      debouncedSave(page.id, contentWithoutTitle)
    },
  })

  // Expose editor to parent component
  useImperativeHandle(ref, () => ({
    getEditor: () => editor
  }), [editor])

  // Cleanup timeout on unmount and save immediately if there's pending content
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        // Save immediately when component unmounts
        clearTimeout(saveTimeoutRef.current)
        if (editor) {
          const content = editor.getHTML()
          const contentWithoutTitle = content.replace(/^<h1>.*?<\/h1>\s*/, '')
          onContentChange(page.id, contentWithoutTitle)
        }
      }
    }
  }, [editor, page.id, onContentChange])

  // Handle assignment removal
  useEffect(() => {
    if (assignmentToRemovePos !== null && editor) {
      const { state } = editor
      const { doc } = state
      
      // Find the assignment mark at the given position
      doc.descendants((node, pos) => {
        if (node.marks) {
          node.marks.forEach(mark => {
            if (mark.type.name === 'assignment' && pos <= assignmentToRemovePos && pos + node.nodeSize >= assignmentToRemovePos) {
              // Set selection to the mark range and remove it
              const tr = state.tr.setSelection(state.selection.constructor.near(state.doc.resolve(pos)))
              editor.view.dispatch(tr)
              editor.chain().focus().unsetMark('assignment').run()
            }
          })
        }
      })
      
      setAssignmentToRemovePos(null)
    }
  }, [assignmentToRemovePos, editor])

  // Handle assignment filter CSS
  useEffect(() => {
    if (!editor || !assignmentFilter) return

    let styleEl = document.getElementById('assignment-filter-style') as HTMLStyleElement
    if (!styleEl) {
      styleEl = document.createElement('style')
      styleEl.id = 'assignment-filter-style'
      document.head.appendChild(styleEl)
    }

    const css = `
      .ProseMirror[data-assignment-filter="${assignmentFilter}"] p:has(mark[data-assignment="true"][data-assigned-to*="${assignmentFilter}"]),
      .ProseMirror[data-assignment-filter="${assignmentFilter}"] h1:has(mark[data-assignment="true"][data-assigned-to*="${assignmentFilter}"]),
      .ProseMirror[data-assignment-filter="${assignmentFilter}"] h2:has(mark[data-assignment="true"][data-assigned-to*="${assignmentFilter}"]),
      .ProseMirror[data-assignment-filter="${assignmentFilter}"] h3:has(mark[data-assignment="true"][data-assigned-to*="${assignmentFilter}"]),
      .ProseMirror[data-assignment-filter="${assignmentFilter}"] li:has(mark[data-assignment="true"][data-assigned-to*="${assignmentFilter}"]) {
        opacity: 1 !important;
      }
    `
    styleEl.textContent = css

    return () => {
      if (!assignmentFilter && styleEl) {
        styleEl.textContent = ''
      }
    }
  }, [editor, assignmentFilter])

  // Update editor content when page changes - only on initial load
  useEffect(() => {
    if (editor && page.content) {
      // Handle both string and object content
      if (typeof page.content === 'string') {
        // String content (HTML)
        const currentEditorContent = editor.getHTML()
        // Only update if the editor is completely empty (initial load)
        if (currentEditorContent.trim() === '' || 
            currentEditorContent.trim() === '<p></p>' ||
            currentEditorContent.trim() === '<p><br></p>') {
          // Don't automatically add the page title as an H1 - just use the page content as is
          editor.commands.setContent(page.content)
        }
      } else {
        // Object content (TipTap JSON) - only update if editor is empty
        const currentEditorContent = editor.getHTML()
        if (currentEditorContent.trim() === '' || 
            currentEditorContent.trim() === '<p></p>' ||
            currentEditorContent.trim() === '<p><br></p>') {
          editor.commands.setContent(page.content)
        }
      }
    }
  }, [page.content, page.title, editor])

  // Set assignment filter on editor
  useEffect(() => {
    if (editor) {
      if (assignmentFilter) {
        editor.view.dom.setAttribute('data-assignment-filter', assignmentFilter)
      } else {
        editor.view.dom.removeAttribute('data-assignment-filter')
      }
    }
  }, [editor, assignmentFilter])

  const handleAssignmentSave = useCallback((attributes: AssignmentAttributes) => {
    if (!editor) return

    if (editingAssignment) {
      // Update existing assignment
      editor.chain().focus().setMark('assignment', attributes).run()
    } else {
      // Create new assignment
      editor.chain().focus().setMark('assignment', attributes).run()
    }

    setShowAssignmentModal(false)
    setEditingAssignment(null)
  }, [editor, editingAssignment])

  const handleAssignmentRemove = useCallback((pos: number) => {
    setAssignmentToRemovePos(pos)
  }, [])

  const handleModalClose = useCallback(() => {
    setShowAssignmentModal(false)
    setEditingAssignment(null)
  }, [])

  const handleFileAttachment = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }, [])

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !editor) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const fileUrl = e.target?.result as string
      
      const attachmentAttrs: AttachmentAttributes = {
        fileName: file.name,
        fileUrl: fileUrl,
        fileSize: file.size,
        fileType: file.type || file.name.split('.').pop() || 'file',
        uploadDate: new Date().toISOString(),
      }

      editor.chain().focus().addAttachment(attachmentAttrs).run()
    }
    reader.readAsDataURL(file)

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [editor])

  if (!editor) {
    return <div>Loading editor...</div>
  }

  return (
    <div className="flex flex-col h-full">
      {/* Editor Content */}
      <div className="flex-1 overflow-y-auto">
        <div className={`relative ${(rightSidebarCollapsed || leftSidebarCollapsed) ? 'pr-[220px]' : ''}`}>
          <EditorContent
            editor={editor}
            className="prose prose-sm max-w-none p-6 focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-opacity-20"
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

      {/* Attachments Panel */}
      <AttachmentsPanel
        editor={editor}
        isOpen={showAttachmentsPanel}
        onClose={() => setShowAttachmentsPanel(false)}
      />

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileChange}
        accept="*/*"
      />
    </div>
  )
})

InternalPageEditor.displayName = 'InternalPageEditor'

export default InternalPageEditor
