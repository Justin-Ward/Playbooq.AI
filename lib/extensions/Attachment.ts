import { Node, mergeAttributes } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'

export interface AttachmentAttributes {
  fileName: string
  fileUrl: string
  fileSize: number // in bytes
  fileType: string // MIME type or extension
  uploadDate: string // ISO string
}

export interface AttachmentOptions {
  HTMLAttributes: Record<string, any>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    attachment: {
      /**
       * Add an attachment node at the current cursor position
       */
      addAttachment: (attributes: AttachmentAttributes) => ReturnType
    }
  }
}

// Helper function to format file size
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}

// Helper function to get icon based on file type
function getFileIcon(fileType: string): string {
  const type = fileType.toLowerCase()
  
  // PDFs
  if (type.includes('pdf')) return '📄'
  
  // Word documents
  if (type.includes('word') || type.includes('doc') || type.includes('docx')) return '📝'
  
  // Excel/spreadsheets
  if (type.includes('excel') || type.includes('spreadsheet') || type.includes('xls') || type.includes('xlsx') || type.includes('csv')) return '📊'
  
  // PowerPoint/presentations
  if (type.includes('powerpoint') || type.includes('presentation') || type.includes('ppt') || type.includes('pptx')) return '📽️'
  
  // Images
  if (type.includes('image') || type.includes('png') || type.includes('jpg') || type.includes('jpeg') || type.includes('gif') || type.includes('svg') || type.includes('webp')) return '🖼️'
  
  // Videos
  if (type.includes('video') || type.includes('mp4') || type.includes('mov') || type.includes('avi') || type.includes('webm')) return '🎥'
  
  // Audio
  if (type.includes('audio') || type.includes('mp3') || type.includes('wav') || type.includes('ogg')) return '🎵'
  
  // Zip/Archives
  if (type.includes('zip') || type.includes('rar') || type.includes('7z') || type.includes('tar') || type.includes('gz')) return '🗜️'
  
  // Code files
  if (type.includes('javascript') || type.includes('typescript') || type.includes('python') || type.includes('json') || type.includes('xml') || type.includes('html') || type.includes('css')) return '💻'
  
  // Text files
  if (type.includes('text') || type.includes('txt')) return '📃'
  
  // Default
  return '📎'
}

export const Attachment = Node.create<AttachmentOptions>({
  name: 'attachment',

  // Make it an inline node
  inline: true,
  
  // Can be placed within other blocks
  group: 'inline',
  
  // Can contain no other content
  atom: true,
  
  // Make it selectable and deletable
  selectable: true,
  draggable: true,

  addOptions() {
    return {
      HTMLAttributes: {},
    }
  },

  addAttributes() {
    return {
      fileName: {
        default: null,
        parseHTML: element => element.getAttribute('data-file-name'),
        renderHTML: attributes => {
          if (!attributes.fileName) return {}
          return { 'data-file-name': attributes.fileName }
        },
      },
      fileUrl: {
        default: null,
        parseHTML: element => element.getAttribute('data-file-url'),
        renderHTML: attributes => {
          if (!attributes.fileUrl) return {}
          return { 'data-file-url': attributes.fileUrl }
        },
      },
      fileSize: {
        default: 0,
        parseHTML: element => parseInt(element.getAttribute('data-file-size') || '0'),
        renderHTML: attributes => {
          return { 'data-file-size': attributes.fileSize?.toString() || '0' }
        },
      },
      fileType: {
        default: 'file',
        parseHTML: element => element.getAttribute('data-file-type'),
        renderHTML: attributes => {
          return { 'data-file-type': attributes.fileType || 'file' }
        },
      },
      uploadDate: {
        default: null,
        parseHTML: element => element.getAttribute('data-upload-date'),
        renderHTML: attributes => {
          if (!attributes.uploadDate) return {}
          return { 'data-upload-date': attributes.uploadDate }
        },
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-attachment]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    const icon = getFileIcon(HTMLAttributes['data-file-type'] || 'file')
    const fileName = HTMLAttributes['data-file-name'] || 'Untitled'
    const fileSize = formatFileSize(parseInt(HTMLAttributes['data-file-size'] || '0'))
    const fileUrl = HTMLAttributes['data-file-url'] || '#'

    return [
      'span',
      mergeAttributes(
        {
          'data-attachment': 'true',
          'class': 'attachment-node',
          'contenteditable': 'false',
          'data-file-url': fileUrl,
        },
        this.options.HTMLAttributes,
        HTMLAttributes
      ),
      [
        'span',
        {
          class: 'attachment-icon-container',
        },
        [
          'span',
          {
            class: 'attachment-icon',
          },
          icon,
        ],
        [
          'span',
          {
            class: 'attachment-delete',
            'data-delete': 'true',
            'title': 'Remove attachment',
          },
          '×',
        ],
      ],
      [
        'span',
        {
          class: 'attachment-name',
        },
        fileName,
      ],
      [
        'span',
        {
          class: 'attachment-size',
        },
        fileSize,
      ],
    ]
  },

  addCommands() {
    return {
      addAttachment:
        (attributes: AttachmentAttributes) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: attributes,
          })
        },
    }
  },

  // Add keyboard shortcut to delete selected attachment
  addKeyboardShortcuts() {
    return {
      Backspace: () => {
        const { state } = this.editor
        const { selection } = state
        const { $anchor } = selection

        // Check if we're at a position with an attachment node
        const node = $anchor.nodeBefore
        if (node && node.type.name === this.name) {
          return this.editor.commands.deleteSelection()
        }

        return false
      },
      Delete: () => {
        const { state } = this.editor
        const { selection } = state
        const { $anchor } = selection

        // Check if we're at a position with an attachment node
        const node = $anchor.nodeAfter
        if (node && node.type.name === this.name) {
          return this.editor.commands.deleteSelection()
        }

        return false
      },
    }
  },

  // Add plugin to handle clicks on attachment nodes
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('attachmentClickHandler'),
        props: {
          handleClick(view, pos, event) {
            const target = event.target as HTMLElement
            
            // Check if click was on delete button
            if (target.hasAttribute('data-delete') || target.closest('.attachment-delete')) {
              event.preventDefault()
              event.stopPropagation()
              
              // Find the attachment node position and delete it
              const attachmentNode = target.closest('.attachment-node')
              if (attachmentNode) {
                // Find the node in the document
                const { state } = view
                const { doc } = state
                let deletePos: number | null = null
                
                doc.descendants((node, pos) => {
                  if (node.type.name === 'attachment') {
                    // Check if this is the clicked attachment
                    const domNode = view.nodeDOM(pos)
                    if (domNode === attachmentNode) {
                      deletePos = pos
                      return false // Stop iterating
                    }
                  }
                })
                
                if (deletePos !== null) {
                  const tr = state.tr.delete(deletePos, deletePos + 1)
                  view.dispatch(tr)
                }
              }
              
              return true
            }
            
            // Check if click was on an attachment node (but not delete button)
            const attachmentNode = target.closest('.attachment-node')
            if (attachmentNode) {
              const fileUrl = attachmentNode.getAttribute('data-file-url')
              
              if (fileUrl && fileUrl !== '#') {
                event.preventDefault()
                
                // Handle data URLs (base64 encoded files)
                if (fileUrl.startsWith('data:')) {
                  // Create a temporary link to download the file
                  const link = document.createElement('a')
                  link.href = fileUrl
                  link.download = attachmentNode.getAttribute('data-file-name') || 'attachment'
                  document.body.appendChild(link)
                  link.click()
                  document.body.removeChild(link)
                } else {
                  // Handle regular URLs
                  window.open(fileUrl, '_blank', 'noopener,noreferrer')
                }
                
                return true
              }
            }
            
            return false
          },
        },
      }),
    ]
  },
})

