'use client'

import { useState } from 'react'
import { useGeneratePlaybook } from '@/lib/hooks/useGeneratePlaybook'
import { UploadedFile } from '@/types/api'
import { Upload, X, Loader2 } from 'lucide-react'
import { extractPDFText } from '@/lib/pdf-parser'

interface PlaybookGeneratorProps {
  onPlaybookGenerated: (playbook: any) => void
  onContentGenerated?: (content: any) => void  // New callback for updating existing content
  existingContent?: string
  mode?: 'create' | 'update'  // New prop to determine behavior
}

export default function PlaybookGenerator({ 
  onPlaybookGenerated, 
  onContentGenerated,
  existingContent,
  mode = 'create'
}: PlaybookGeneratorProps) {
  const [topic, setTopic] = useState('')
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [isProcessingFiles, setIsProcessingFiles] = useState(false)
  
  const { generatePlaybook, isGenerating, error, clearError } = useGeneratePlaybook()

  const handleFileUpload = async (files: FileList) => {
    console.log('Starting file upload with files:', Array.from(files).map(f => f.name))
    
    // Check if files were actually selected (not just cancelled)
    if (!files || files.length === 0) {
      console.log('No files selected - user likely cancelled file selection')
      return
    }
    
    setIsProcessingFiles(true)
    clearError()
    
    try {
      const fileArray = Array.from(files)
      console.log('Processing files:', fileArray.map(f => ({ name: f.name, type: f.type, size: f.size })))
      
      const newUploadedFiles: UploadedFile[] = []
      
      // Process each file
      for (const file of fileArray) {
        try {
          let content = ''
          
          if (file.type === 'application/pdf') {
            // Handle PDF files client-side
            console.log('Processing PDF client-side:', file.name)
            content = await extractPDFText(file)
            console.log(`PDF text extracted successfully. Length: ${content.length}`)
          } else {
            // Handle other files server-side
            console.log('Processing non-PDF file server-side:', file.name)
            const formData = new FormData()
            formData.append('files', file)
            
            const response = await fetch('/api/process-files', {
              method: 'POST',
              body: formData,
            })
            
            if (!response.ok) {
              const errorText = await response.text()
              throw new Error(`Failed to process file: ${response.status} ${errorText}`)
            }
            
            const processedFiles = await response.json()
            if (processedFiles.length > 0 && processedFiles[0].content) {
              content = processedFiles[0].content
            } else {
              throw new Error('No content extracted from file')
            }
          }
          
          newUploadedFiles.push({
            id: `file-${Date.now()}-${newUploadedFiles.length}`,
            name: file.name,
            size: file.size,
            type: file.type,
            content: content,
            error: undefined
          })
          
        } catch (fileError) {
          console.error('Error processing file:', file.name, fileError)
          newUploadedFiles.push({
            id: `error-${Date.now()}-${newUploadedFiles.length}`,
            name: file.name,
            size: file.size,
            type: file.type,
            content: '',
            error: fileError instanceof Error ? fileError.message : 'Failed to process file'
          })
        }
      }
      
      console.log('New uploaded files:', newUploadedFiles)
      setUploadedFiles(prev => {
        const updated = [...prev, ...newUploadedFiles]
        console.log('Updated uploaded files state:', updated)
        return updated
      })
    } catch (err) {
      console.error('File processing error:', err)
      // Set error state so user knows something went wrong
      setUploadedFiles(prev => [...prev, {
        id: `error-${Date.now()}`,
        name: Array.from(files)[0]?.name || 'Unknown file',
        size: 0,
        type: 'error',
        content: '',
        error: err instanceof Error ? err.message : 'Failed to process file'
      }])
    } finally {
      setIsProcessingFiles(false)
      console.log('File processing completed')
    }
  }

  const removeFile = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(file => file.id !== fileId))
  }

  // Helper function to extract text content from Tiptap JSON while preserving structure
  const extractTextFromTiptapJSON = (jsonContent: string): string => {
    try {
      const parsed = JSON.parse(jsonContent)
      if (!parsed.content || !Array.isArray(parsed.content)) {
        return ''
      }
      
      const extractText = (node: any, depth: number = 0): string => {
        const indent = '  '.repeat(depth)
        
        if (node.type === 'text') {
          return node.text || ''
        }
        
        if (node.type === 'heading') {
          const level = node.attrs?.level || 1
          const headingPrefix = '#'.repeat(level) + ' '
          const content = node.content ? node.content.map((child: any) => extractText(child)).join('') : ''
          return `\n${headingPrefix}${content}\n`
        }
        
        if (node.type === 'paragraph') {
          const content = node.content ? node.content.map((child: any) => extractText(child)).join('') : ''
          return content ? `${content}\n\n` : '\n'
        }
        
        if (node.type === 'bulletList') {
          const items = node.content ? node.content.map((item: any) => extractText(item, depth + 1)).join('') : ''
          return items
        }
        
        if (node.type === 'orderedList') {
          const items = node.content ? node.content.map((item: any, index: number) => {
            const content = extractText(item, depth + 1)
            return content.replace(/^- /, `${index + 1}. `)
          }).join('') : ''
          return items
        }
        
        if (node.type === 'listItem') {
          const content = node.content ? node.content.map((child: any) => extractText(child, depth)).join('') : ''
          return `${indent}- ${content.trim()}\n`
        }
        
        if (node.type === 'blockquote') {
          const content = node.content ? node.content.map((child: any) => extractText(child)).join('') : ''
          return `> ${content.trim()}\n\n`
        }
        
        if (node.type === 'codeBlock') {
          const content = node.content ? node.content.map((child: any) => extractText(child)).join('') : ''
          return `\`\`\`\n${content}\n\`\`\`\n\n`
        }
        
        if (node.content && Array.isArray(node.content)) {
          return node.content.map((child: any) => extractText(child, depth)).join('')
        }
        
        return ''
      }
      
      const extractedText = parsed.content.map((node: any) => extractText(node)).join('')
      console.log('Extracted text length:', extractedText.length)
      console.log('Extracted text preview:', extractedText.substring(0, 200) + '...')
      
      return extractedText.trim()
    } catch (error) {
      console.error('Error extracting text from Tiptap JSON:', error)
      return ''
    }
  }

  const handleGenerate = async () => {
    // Check if we have either topic text or uploaded files
    const hasTopic = topic.trim().length > 0
    const hasFiles = uploadedFiles.length > 0 && uploadedFiles.some(file => file.content && !file.error)
    
    if (!hasTopic && !hasFiles) {
      console.log('No topic or files to generate from')
      return
    }
    
    console.log('Starting playbook generation...', {
      hasTopic,
      hasFiles,
      topicLength: topic.trim().length,
      fileCount: uploadedFiles.length,
      hasExistingContent: !!existingContent
    })
    
    clearError()
    
    try {
      const documents = uploadedFiles
        .filter(file => file.content && !file.error)
        .map(file => file.content!)
      
      console.log('Documents to process:', documents.length)
      
      // Convert existing content from Tiptap JSON to readable text
      const existingContentText = existingContent ? extractTextFromTiptapJSON(existingContent) : undefined
      
      console.log('Existing content text length:', existingContentText?.length || 0)
      
      const result = await generatePlaybook({
        topic: topic.trim() || 'Generate a playbook from the uploaded document(s)',
        documents: documents.length > 0 ? documents : undefined,
        existingContent: existingContentText
      })
      
      console.log('Playbook generation completed:', result)
      
      // Use appropriate callback based on mode
      if (mode === 'update' && onContentGenerated) {
        onContentGenerated(result.content)
      } else {
        onPlaybookGenerated({
          ...result,
          content: result.content
        })
      }
      
      // Clear form
      setTopic('')
      setUploadedFiles([])
    } catch (err) {
      console.error('Generation error:', err)
    }
  }

  return (
    <div className="space-y-4">
      {/* Topic Input */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Describe your playbook topic and/or add any amount of text that you want the playbook to be about:
        </label>
        <textarea
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          className="w-full h-16 p-2 text-xs border border-gray-300 rounded resize-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
          placeholder="e.g., 'Digital marketing strategy for SaaS startup...'"
        />
      </div>

      {/* File Upload */}
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
            onClick={() => {
              const fileInput = document.getElementById('file-upload-input') as HTMLInputElement
              fileInput?.click()
            }}
          >
            <Upload className="h-2 w-2 text-gray-400" />
            <span className="text-xs text-blue-600 hover:text-blue-700 cursor-pointer">
              Browse
            </span>
            <input
              id="file-upload-input"
              type="file"
              multiple
              accept=".pdf,.docx,.txt,.md,.csv,.json"
              className="hidden"
              onChange={(e) => {
                console.log('File input changed, files:', e.target.files)
                if (e.target.files && e.target.files.length > 0) {
                  console.log('Calling handleFileUpload with files:', Array.from(e.target.files).map(f => f.name))
                  handleFileUpload(e.target.files)
                } else {
                  console.log('No files selected or files cancelled')
                }
              }}
            />
          </div>
        </div>
        
        {/* Instructional Text */}
        <div className="text-xs text-gray-500 mt-2">
          For videos (e.g. YouTube), please paste the transcript(s) into the text box above.
        </div>
        
        <div className="text-xs text-gray-500 mt-1">
          You can always add additional content to an existing playbook by inputing into these fields above and pressing the Generate Playbook button
        </div>
        
        {/* Processing Indicator */}
        {isProcessingFiles && (
          <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs">
            <div className="flex items-center gap-2 text-blue-700">
              <Loader2 className="h-3 w-3 animate-spin" />
              Processing document...
            </div>
          </div>
        )}
        
        {/* Uploaded Files */}
        {uploadedFiles.length > 0 && (
          <div className="mt-2">
            <div className="text-xs font-medium text-gray-700 mb-1">Uploaded documents:</div>
            <div className="space-y-1">
              {uploadedFiles.map(file => (
                <div key={file.id} className={`flex items-center justify-between p-2 rounded text-xs ${
                  file.error 
                    ? 'bg-red-50 border border-red-200' 
                    : 'bg-green-50 border border-green-200'
                }`}>
                  <div className="flex items-center gap-2 flex-1">
                    <div className={`h-2 w-2 rounded-full ${
                      file.error ? 'bg-red-500' : 'bg-green-500'
                    }`}></div>
                    <span className={`truncate flex-1 ${
                      file.error ? 'text-red-800' : 'text-green-800'
                    }`}>
                      {file.name}
                      {file.error && (
                        <span className="text-red-600 ml-1 font-medium">(Error: {file.error})</span>
                      )}
                      {!file.error && file.content && (
                        <span className="text-green-600 ml-1">✓</span>
                      )}
                    </span>
                  </div>
                  <button
                    onClick={() => removeFile(file.id)}
                    className="text-gray-400 hover:text-red-500 transition-colors p-1"
                    title="Remove file"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Debug Info - Remove in production */}
        {process.env.NODE_ENV === 'development' && uploadedFiles.length > 0 && (
          <div className="mt-2 p-2 bg-gray-100 rounded text-xs">
            <div className="font-medium text-gray-700 mb-1">Debug Info:</div>
            <pre className="text-xs text-gray-600 overflow-auto max-h-20">
              {JSON.stringify(uploadedFiles, null, 2)}
            </pre>
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
          {error}
        </div>
      )}

      {/* Generate Button */}
      <button
        onClick={handleGenerate}
        disabled={(!topic.trim() && uploadedFiles.length === 0) || isGenerating || isProcessingFiles}
        className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
      >
        {(isGenerating || isProcessingFiles) ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            {isProcessingFiles ? 'Processing files...' : 'Generating playbook...'}
          </>
        ) : (
          'Generate Playbook'
        )}
      </button>
    </div>
  )
}
