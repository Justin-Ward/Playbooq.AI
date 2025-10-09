import { NextRequest, NextResponse } from 'next/server'

// Types
interface ProcessedFile {
  name: string
  type: string
  size: number
  content: string
  error?: string
}

/**
 * Extract text content from various file types
 */
async function extractTextFromFile(file: File): Promise<ProcessedFile> {
  const result: ProcessedFile = {
    name: file.name,
    type: file.type,
    size: file.size,
    content: ''
  }

  try {
    const arrayBuffer = await file.arrayBuffer()
    
    switch (file.type) {
      case 'text/plain':
        result.content = new TextDecoder().decode(arrayBuffer)
        break
        
      case 'application/pdf':
        // PDF processing is now handled client-side
        // This is just a placeholder - the actual content should come from client-side parsing
        result.content = `[PDF File: ${file.name}]\n\n✅ PDF Upload Successful\n📄 File Details:\n- Name: ${file.name}\n- Size: ${(file.size / 1024).toFixed(1)} KB\n- Status: Uploaded successfully\n\n📝 Processing Note:\nPDF files are now processed client-side for better compatibility. Please use the client-side PDF parser to extract text content.`
        
        console.log('PDF file uploaded - processing handled client-side')
        break
        
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        try {
          console.log('Processing DOCX:', file.name)
          console.log('File size:', file.size, 'bytes')
          
          // Dynamic import to avoid webpack issues
          const mammoth = (await import('mammoth')).default
          
          // Convert ArrayBuffer to Buffer for mammoth
          const buffer = Buffer.from(arrayBuffer)
          console.log('Buffer created for DOCX, size:', buffer.length, 'bytes')
          
          const docxResult = await mammoth.extractRawText({ buffer })
          result.content = docxResult.value.trim()
          
          console.log(`DOCX text extraction successful. Text length: ${result.content.length}`)
          
          if (!result.content || result.content.length < 10) {
            throw new Error('No meaningful text content found in DOCX')
          }
        } catch (docxError) {
          console.error('DOCX processing error:', docxError)
          throw new Error(`Failed to parse DOCX: ${docxError instanceof Error ? docxError.message : 'Unknown error'}`)
        }
        break
        
      case 'text/markdown':
        result.content = new TextDecoder().decode(arrayBuffer)
        break
        
      case 'text/csv':
        result.content = new TextDecoder().decode(arrayBuffer)
        break
        
      case 'application/json':
        const jsonContent = new TextDecoder().decode(arrayBuffer)
        try {
          const parsed = JSON.parse(jsonContent)
          result.content = typeof parsed === 'string' ? parsed : JSON.stringify(parsed, null, 2)
        } catch {
          result.content = jsonContent
        }
        break
        
      default:
        // Try to read as text for other file types
        try {
          result.content = new TextDecoder().decode(arrayBuffer)
        } catch {
          throw new Error(`Unsupported file type: ${file.type}`)
        }
    }
    
    // Clean up the content
    result.content = result.content.trim()
    
    if (!result.content) {
      throw new Error('No text content found in file')
    }
    
  } catch (error) {
    result.error = error instanceof Error ? error.message : 'Failed to process file'
  }
  
  return result
}

/**
 * Extract text from multiple files
 */
async function extractTextFromFiles(files: File[]): Promise<ProcessedFile[]> {
  const results = await Promise.allSettled(
    files.map(file => extractTextFromFile(file))
  )
  
  return results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value
    } else {
      return {
        name: files[index].name,
        type: files[index].type,
        size: files[index].size,
        content: '',
        error: result.reason?.message || 'Failed to process file'
      }
    }
  })
}

// Main API handler
export async function POST(request: NextRequest) {
  try {
    console.log('File processing API called')
    
    // Parse form data
    const formData = await request.formData()
    const files = formData.getAll('files') as File[]
    
    console.log('Files received:', files.map(f => ({ name: f.name, type: f.type, size: f.size })))
    
    if (!files || files.length === 0) {
      console.log('No files provided')
      return NextResponse.json(
        { error: 'No files provided' },
        { status: 400 }
      )
    }
    
    // Validate file types
    const validTypes = [
      'text/plain',
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/markdown',
      'text/csv',
      'application/json'
    ]
    
    const invalidFiles = files.filter(file => 
      !validTypes.includes(file.type) && !file.name.endsWith('.txt')
    )
    
    if (invalidFiles.length > 0) {
      console.log('Invalid file types:', invalidFiles.map(f => f.name))
      return NextResponse.json(
        { error: `Unsupported file types: ${invalidFiles.map(f => f.name).join(', ')}` },
        { status: 400 }
      )
    }
    
    console.log('Processing files...')
    
    // Process files
    const processedFiles = await extractTextFromFiles(files)
    
    console.log('Files processed successfully:', processedFiles.map(f => ({ 
      name: f.name, 
      hasContent: !!f.content, 
      hasError: !!f.error 
    })))
    
    return NextResponse.json(processedFiles)
    
  } catch (error) {
    console.error('File processing error:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to process files',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString()
  })
}
