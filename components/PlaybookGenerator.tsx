'use client'

import { useState } from 'react'
import { useGeneratePlaybook } from '@/lib/hooks/useGeneratePlaybook'
import { UploadedFile } from '@/types/api'
import { Upload, X, Loader2 } from 'lucide-react'

interface PlaybookGeneratorProps {
  onPlaybookGenerated: (playbook: any) => void
  existingContent?: string
}

export default function PlaybookGenerator({ 
  onPlaybookGenerated, 
  existingContent 
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
      
      // Process files on the server
      const formData = new FormData()
      fileArray.forEach(file => {
        formData.append('files', file)
      })
      
      console.log('Sending request to /api/process-files')
      const response = await fetch('/api/process-files', {
        method: 'POST',
        body: formData,
      })
      
      console.log('Response status:', response.status)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('Response error:', errorText)
        throw new Error(`Failed to process files: ${response.status} ${errorText}`)
      }
      
      const processedFiles = await response.json()
      console.log('Processed files response:', processedFiles)
      
      const newUploadedFiles: UploadedFile[] = processedFiles.map((file: any, index: number) => ({
        id: `file-${Date.now()}-${index}`,
        name: file.name,
        size: file.size,
        type: file.type,
        content: file.content,
        error: file.error
      }))
      
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
      fileCount: uploadedFiles.length
    })
    
    clearError()
    
    try {
      const documents = uploadedFiles
        .filter(file => file.content && !file.error)
        .map(file => file.content!)
      
      console.log('Documents to process:', documents.length)
      
      const result = await generatePlaybook({
        topic: topic.trim() || 'Generate a playbook from the uploaded document(s)',
        documents: documents.length > 0 ? documents : undefined,
        existingContent
      })
      
      console.log('Playbook generation completed:', result)
      onPlaybookGenerated(result)
      
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
          Describe your playbook and/or paste in any amount of text that you want the playbook to be about:
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
          >
            <Upload className="h-2 w-2 text-gray-400" />
            <label className="text-xs text-blue-600 hover:text-blue-700 cursor-pointer">
              Browse
              <input
                type="file"
                multiple
                accept=".pdf,.docx,.txt,.md,.csv,.json"
                className="hidden"
                onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
              />
            </label>
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
