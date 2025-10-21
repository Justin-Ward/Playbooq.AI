import React, { useState, useRef, useEffect } from 'react'
import { Editor } from '@tiptap/react'
import { Download, Trash2, X } from 'lucide-react'

interface AttachmentData {
  fileName: string
  fileUrl: string
  fileSize: number
  fileType: string
  uploadDate: string
}

interface AttachmentsPanelProps {
  editor: Editor
  isOpen: boolean
  onClose: () => void
}

export default function AttachmentsPanel({ editor, isOpen, onClose }: AttachmentsPanelProps) {
  const [attachments, setAttachments] = useState<AttachmentData[]>([])
  const panelRef = useRef<HTMLDivElement>(null)

  // Extract attachments from editor content
  useEffect(() => {
    if (!editor) return

    const extractAttachments = () => {
      const attachmentNodes: AttachmentData[] = []
      
      editor.state.doc.descendants((node) => {
        if (node.type.name === 'attachment') {
          attachmentNodes.push({
            fileName: node.attrs.fileName || 'Untitled',
            fileUrl: node.attrs.fileUrl || '#',
            fileSize: node.attrs.fileSize || 0,
            fileType: node.attrs.fileType || 'file',
            uploadDate: node.attrs.uploadDate || new Date().toISOString(),
          })
        }
      })
      
      setAttachments(attachmentNodes)
    }

    // Extract on mount and when content changes
    extractAttachments()
    
    const handleUpdate = () => {
      extractAttachments()
    }

    editor.on('update', handleUpdate)
    
    return () => {
      editor.off('update', handleUpdate)
    }
  }, [editor])

  // Close panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onClose])

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const downloadFile = (attachment: AttachmentData) => {
    if (attachment.fileUrl && attachment.fileUrl !== '#') {
      const link = document.createElement('a')
      link.href = attachment.fileUrl
      link.download = attachment.fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  const deleteAttachment = (attachment: AttachmentData) => {
    if (!editor) return

    // Find and delete the specific attachment node
    const { state } = editor
    const { doc } = state
    let deletePos: number | null = null

    doc.descendants((node, pos) => {
      if (node.type.name === 'attachment' && 
          node.attrs.fileName === attachment.fileName &&
          node.attrs.fileUrl === attachment.fileUrl) {
        deletePos = pos
        return false // Stop iterating
      }
    })

    if (deletePos !== null) {
      const tr = state.tr.delete(deletePos, deletePos + 1)
      editor.view.dispatch(tr)
    }
  }

  const downloadAll = () => {
    attachments.forEach(attachment => {
      downloadFile(attachment)
    })
  }

  const deleteAll = () => {
    if (!editor) return

    // Delete all attachment nodes
    const { state } = editor
    const { doc } = state
    const tr = state.tr

    // Collect all attachment positions (in reverse order to maintain positions)
    const attachmentPositions: number[] = []
    doc.descendants((node, pos) => {
      if (node.type.name === 'attachment') {
        attachmentPositions.push(pos)
      }
    })

    // Delete from end to beginning to maintain positions
    attachmentPositions.reverse().forEach(pos => {
      tr.delete(pos, pos + 1)
    })

    if (attachmentPositions.length > 0) {
      editor.view.dispatch(tr)
    }
  }

  if (!isOpen) return null

  return (
    <div
      ref={panelRef}
      className="fixed bg-white border border-gray-300 rounded-lg shadow-lg z-[9999] min-w-[400px] max-w-[500px] max-h-[400px] overflow-hidden"
      style={{
        top: '60px', // Position below toolbar
        right: '20px', // Position on the right side
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-gray-50">
        <h3 className="text-sm font-medium text-gray-900">Attachments ({attachments.length})</h3>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-gray-200 transition-colors"
          title="Close"
        >
          <X className="h-4 w-4 text-gray-500" />
        </button>
      </div>

      {/* Content */}
      <div className="p-3">
        {attachments.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p className="text-sm">No attachments in this document</p>
          </div>
        ) : (
          <>
            {/* Action Buttons */}
            <div className="flex gap-2 mb-3">
              <button
                onClick={downloadAll}
                className="flex items-center gap-1 px-3 py-1.5 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                title="Download all attachments"
              >
                <Download className="h-3 w-3" />
                Download All
              </button>
              <button
                onClick={deleteAll}
                className="flex items-center gap-1 px-3 py-1.5 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                title="Delete all attachments"
              >
                <Trash2 className="h-3 w-3" />
                Delete All
              </button>
            </div>

            {/* Attachments List */}
            <div className="space-y-2 max-h-[250px] overflow-y-auto">
              {attachments.map((attachment, index) => (
                <div
                  key={`${attachment.fileName}-${index}`}
                  className="flex items-center justify-between p-2 border border-gray-200 rounded hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900 truncate">
                        {attachment.fileName}
                      </span>
                      <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                        {attachment.fileType.toUpperCase()}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {formatFileSize(attachment.fileSize)} • {formatDate(attachment.uploadDate)}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1 ml-2">
                    <button
                      onClick={() => downloadFile(attachment)}
                      className="p-1 rounded hover:bg-blue-100 transition-colors"
                      title="Download file"
                    >
                      <Download className="h-3 w-3 text-blue-600" />
                    </button>
                    <button
                      onClick={() => deleteAttachment(attachment)}
                      className="p-1 rounded hover:bg-red-100 transition-colors"
                      title="Delete file"
                    >
                      <Trash2 className="h-3 w-3 text-red-600" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
