import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'

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
        try {
          console.log('Processing PDF:', file.name)
          console.log('File size:', file.size, 'bytes')
          console.log('ArrayBuffer size:', arrayBuffer.byteLength, 'bytes')
          
          // Try pdf-parse with better error handling
          let pdfParse
          try {
            console.log('Attempting to import pdf-parse...')
            const pdfParseModule = await import('pdf-parse')
            pdfParse = pdfParseModule.default
            console.log('pdf-parse imported successfully, type:', typeof pdfParse)
          } catch (parseError) {
            console.error('pdf-parse import failed:', parseError instanceof Error ? parseError.message : 'Unknown error', parseError instanceof Error ? parseError.stack?.split('\n')[0] : '')
            pdfParse = null
          }
          
          // Convert ArrayBuffer to Buffer for pdf-parse
          console.log('Converting ArrayBuffer to Buffer...')
          const buffer = Buffer.from(arrayBuffer)
          console.log('Buffer created successfully, size:', buffer.length, 'bytes')
          
          // Additional buffer validation
          console.log('Buffer details:', {
            length: buffer.length,
            type: typeof buffer,
            constructor: buffer.constructor.name,
            isBuffer: Buffer.isBuffer(buffer),
            firstBytes: buffer.toString('hex', 0, Math.min(20, buffer.length))
          })
          
          // Validate buffer
          if (buffer.length === 0) {
            throw new Error('Buffer is empty - file may be corrupted')
          }
          
          // Check if it's actually a PDF by looking at the header
          const header = buffer.toString('ascii', 0, 4)
          console.log('File header:', header)
          
          if (!header.startsWith('%PDF')) {
            throw new Error('File does not appear to be a valid PDF (missing PDF header)')
          }
          
          // Check PDF version and structure
          const pdfHeader = buffer.toString('ascii', 0, 20)
          console.log('PDF header info:', pdfHeader)
          
          // Check if it's a text-based or image-based PDF
          const bufferString = buffer.toString('ascii', 0, Math.min(1000, buffer.length))
          const hasTextStreams = bufferString.includes('/Type/Font') || bufferString.includes('/BaseFont')
          const hasImages = bufferString.includes('/Type/XObject') || bufferString.includes('/Image')
          console.log('PDF analysis:', {
            hasTextStreams,
            hasImages,
            bufferSize: buffer.length,
            first1000Chars: bufferString.substring(0, 200) + '...'
          })
          
          console.log('Starting PDF text extraction with pdf-parse...')
          
          // Try parsing with comprehensive error handling
          let pdfData
          let lastError
          
          if (pdfParse) {
            // Attempt 1: Basic parsing with explicit empty options
            try {
              console.log('Attempt 1: Basic PDF parsing with empty options')
              console.log('Buffer first 100 bytes (hex):', buffer.toString('hex', 0, 100))
              pdfData = await pdfParse(buffer, {})
              console.log('Basic parsing successful, pdfData:', {
                hasText: !!pdfData?.text,
                textLength: pdfData?.text?.length || 0,
                numPages: pdfData?.numpages,
                keys: Object.keys(pdfData || {}),
                fullPdfData: pdfData // Log the full object for debugging
              })
            } catch (error) {
              lastError = error
              console.log('Basic parsing failed:', error instanceof Error ? error.message : 'Unknown error', error instanceof Error ? error.stack?.split('\n')[0] : '')
              
              // Attempt 2: With explicit options
              try {
                console.log('Attempt 2: PDF parsing with explicit options')
                pdfData = await pdfParse(buffer, {
                  max: 0, // Parse all pages
                  version: 'v1.10.100'
                })
                console.log('Parsing with explicit options successful, pdfData:', {
                  hasText: !!pdfData?.text,
                  textLength: pdfData?.text?.length || 0,
                  numPages: pdfData?.numpages,
                  keys: Object.keys(pdfData || {})
                })
              } catch (error2) {
                lastError = error2
                console.log('Parsing with explicit options failed:', error2 instanceof Error ? error2.message : 'Unknown error', error2 instanceof Error ? error2.stack?.split('\n')[0] : '')
                
                // Attempt 3: Try with minimal options
                try {
                  console.log('Attempt 3: PDF parsing with minimal options')
                  pdfData = await pdfParse(buffer, {
                    max: 10 // Limit to first 10 pages
                  })
                  console.log('Minimal parsing successful, pdfData:', {
                    hasText: !!pdfData?.text,
                    textLength: pdfData?.text?.length || 0,
                    numPages: pdfData?.numpages,
                    keys: Object.keys(pdfData || {})
                  })
                } catch (error3) {
                  lastError = error3
                  console.log('All pdf-parse attempts failed:', error3 instanceof Error ? error3.message : 'Unknown error')
                  // Will fall back to pdfjs-dist below
                }
              }
            }
          }
          
          // If pdf-parse failed, we'll provide helpful instructions
          if (!pdfData) {
            console.log('pdf-parse failed to extract text from PDF')
            throw new Error(`PDF parsing failed: ${lastError instanceof Error ? lastError.message : 'Unknown error'}`)
          }
          
          // Check if we successfully got PDF data
          if (!pdfData) {
            throw new Error('PDF parsing failed completely - no data returned from either parsing library')
          }
          
          console.log('PDF parsing completed successfully')
          console.log('PDF info:', {
            pages: pdfData.numpages || 'unknown',
            hasInfo: !!pdfData.info,
            hasMetadata: !!pdfData.metadata,
            textLength: pdfData.text ? pdfData.text.length : 0
          })
          
          // Extract the text content
          result.content = pdfData.text ? pdfData.text.trim() : ''
          
          console.log(`PDF text extraction successful. Text length: ${result.content.length}`)
          
          if (!result.content || result.content.length < 10) {
            throw new Error('No meaningful text content found in PDF - may be image-based, password protected, or contain only scanned content')
          }
          
        } catch (pdfError) {
          console.error('PDF processing error:', pdfError)
          console.error('Error details:', {
            name: pdfError instanceof Error ? pdfError.name : 'Unknown',
            message: pdfError instanceof Error ? pdfError.message : 'Unknown error',
            stack: pdfError instanceof Error ? pdfError.stack?.split('\n').slice(0, 5).join('\n') : ''
          })
          
          // Graceful fallback - provide helpful instructions without failing
          result.content = `[PDF File: ${file.name}]

✅ PDF Upload Successful
📄 File Details:
- Name: ${file.name}
- Size: ${(file.size / 1024).toFixed(1)} KB
- Status: Uploaded successfully

📝 Text Extraction Note:
Automatic text extraction encountered a technical issue: "${pdfError instanceof Error ? pdfError.message : 'Unknown error'}"

This can happen with certain PDF formats, especially those with:
- Complex layouts or formatting
- Scanned images (non-searchable text)
- Special fonts or encoding
- Password protection
- Corrupted or damaged files

🔄 How to Use Your PDF Content:

Method 1 - Direct Copy & Paste (Fastest):
1. Open your PDF in any PDF viewer (browser, Adobe Reader, etc.)
2. Select and copy the text content you want to use
3. Paste it into the text area above
4. Click "Generate Playbook"

Method 2 - Convert to Text File:
1. Use an online PDF-to-text converter (like SmallPDF, ILovePDF, or Adobe's online tools)
2. Download the converted .txt file
3. Upload the .txt file instead of the PDF

Method 3 - Extract Key Sections:
1. Copy only the most relevant sections from your PDF
2. Paste them into the text area above
3. Add any additional context or instructions in your own words

💡 Pro Tip: You can also describe what's in your PDF in the text area above, and the AI will help you create a playbook based on your description.

This approach ensures your content is processed accurately for playbook generation!`
          
          console.log('Using graceful fallback for PDF processing')
        }
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
    
    // Authentication check
    const { userId } = await auth()
    if (!userId) {
      console.log('Authentication failed - no userId')
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    
    console.log('User authenticated:', userId)
    
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
