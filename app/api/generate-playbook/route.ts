import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import DOMPurify from 'isomorphic-dompurify'

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

// Check if API key is available
if (!process.env.ANTHROPIC_API_KEY) {
  console.error('ANTHROPIC_API_KEY is not set in environment variables')
}

// Rate limiting storage (in production, use Redis or database)
// Uses IP addresses as keys since authentication is disabled
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

// Types
interface GeneratePlaybookRequest {
  topic: string
  documents?: string[]
  existingContent?: string
  regenerateSection?: {
    sectionId: string
    sectionTitle: string
  }
}

interface PlaybookSection {
  id: string
  title: string
  level: number
  content: string
}

interface GeneratePlaybookResponse {
  title: string
  summary: string
  content: any // Tiptap JSON
  sections: PlaybookSection[]
  rawMarkdown: string
  usage?: {
    inputTokens: number
    outputTokens: number
    totalTokens: number
  }
}

// Rate limiting function
function checkRateLimit(userId: string): boolean {
  const now = Date.now()
  const userLimit = rateLimitMap.get(userId)
  
  if (!userLimit || now > userLimit.resetTime) {
    rateLimitMap.set(userId, { count: 1, resetTime: now + 60 * 60 * 1000 }) // 1 hour
    return true
  }
  
  if (userLimit.count >= 20) {
    return false
  }
  
  userLimit.count++
  return true
}

// Token estimation (rough approximation)
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4) // Rough estimate: 4 characters per token
}

// Convert markdown to Tiptap JSON
function markdownToTiptap(markdown: string): any {
  const lines = markdown.split('\n')
  const nodes: any[] = []
  let currentList: any[] | null = null
  
  for (const line of lines) {
    const trimmedLine = line.trim()
    
    if (!trimmedLine) {
      if (currentList) {
        nodes.push({
          type: 'bulletList',
          content: currentList
        })
        currentList = null
      }
      continue
    }
    
    // Headers
    if (trimmedLine.startsWith('# ')) {
      nodes.push({
        type: 'heading',
        attrs: { level: 1 },
        content: [{ type: 'text', text: trimmedLine.substring(2) }]
      })
    } else if (trimmedLine.startsWith('## ')) {
      nodes.push({
        type: 'heading',
        attrs: { level: 2 },
        content: [{ type: 'text', text: trimmedLine.substring(3) }]
      })
    } else if (trimmedLine.startsWith('### ')) {
      nodes.push({
        type: 'heading',
        attrs: { level: 3 },
        content: [{ type: 'text', text: trimmedLine.substring(4) }]
      })
    }
    // Lists
    else if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
      if (!currentList) currentList = []
      currentList.push({
        type: 'listItem',
        content: [{
          type: 'paragraph',
          content: [{ type: 'text', text: trimmedLine.substring(2) }]
        }]
      })
    }
    // Numbered lists
    else if (/^\d+\. /.test(trimmedLine)) {
      if (!currentList) currentList = []
      currentList.push({
        type: 'listItem',
        content: [{
          type: 'paragraph',
          content: [{ type: 'text', text: trimmedLine.replace(/^\d+\. /, '') }]
        }]
      })
    }
    // Regular paragraphs
    else {
      if (currentList) {
        nodes.push({
          type: 'bulletList',
          content: currentList
        })
        currentList = null
      }
      nodes.push({
        type: 'paragraph',
        content: [{ type: 'text', text: trimmedLine }]
      })
    }
  }
  
  // Handle any remaining list
  if (currentList) {
    nodes.push({
      type: 'bulletList',
      content: currentList
    })
  }
  
  return {
    type: 'doc',
    content: nodes
  }
}

// Parse playbook sections from markdown
function parsePlaybookSections(markdown: string): PlaybookSection[] {
  const lines = markdown.split('\n')
  const sections: PlaybookSection[] = []
  let currentSection: PlaybookSection | null = null
  let sectionCounter = 0
  
  for (const line of lines) {
    const trimmedLine = line.trim()
    
    if (trimmedLine.startsWith('#')) {
      // Save previous section
      if (currentSection) {
        sections.push(currentSection)
      }
      
      // Start new section
      const level = trimmedLine.match(/^#+/)?.[0].length || 1
      const title = trimmedLine.replace(/^#+\s*/, '')
      sectionCounter++
      
      currentSection = {
        id: `section-${sectionCounter}`,
        title,
        level,
        content: ''
      }
    } else if (currentSection && trimmedLine) {
      currentSection.content += trimmedLine + '\n'
    }
  }
  
  // Add final section
  if (currentSection) {
    sections.push(currentSection)
  }
  
  return sections
}

// Main API handler
export async function POST(request: NextRequest) {
  try {
    // Check API key availability
    if (!process.env.ANTHROPIC_API_KEY) {
      console.error('ANTHROPIC_API_KEY is not set')
      return NextResponse.json(
        { error: 'API configuration error. Please contact support.' },
        { status: 500 }
      )
    }
    
    // Rate limiting check (using IP address since no auth)
    const clientIP = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     request.headers.get('cf-connecting-ip') ||
                     'anonymous'
    if (!checkRateLimit(clientIP)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Maximum 20 playbook generations per hour.' },
        { status: 429 }
      )
    }
    
    // Parse request body
    const body: GeneratePlaybookRequest = await request.json()
    const { topic, documents = [], existingContent, regenerateSection } = body
    
    // Validation
    if (!topic || topic.trim().length === 0) {
      return NextResponse.json(
        { error: 'Topic is required' },
        { status: 400 }
      )
    }
    
    // Sanitize inputs
    const sanitizedTopic = DOMPurify.sanitize(topic.trim())
    const sanitizedDocuments = documents.map(doc => DOMPurify.sanitize(doc))
    
    // Build system prompt
    const systemPrompt = `You are an expert playbook creator specializing in producing highly practical, step-by-step instructions. Your role is to create comprehensive playbooks that are:

1. **Highly Practical**: Every instruction should be immediately actionable
2. **Well-Structured**: Use clear hierarchies with H1, H2, H3 headings
3. **Detailed but Scannable**: Provide depth while maintaining readability
4. **Comprehensive**: Include best practices, common pitfalls, and pro tips
5. **Tool-Oriented**: For each step, list required tools/equipment/software including listing popular vendors if important
6. **Purpose-Driven**: For each action, explain the "why" - why each step is necessary
7. **Actionable**: Always provide clear next steps

**Format Requirements:**
- Start with a descriptive title (H1)
- Include an Executive Summary (2-3 paragraphs)
- Create main sections with subsections as needed
- End with a Conclusion containing key takeaways
- Use markdown formatting
- Include numbered lists for sequential steps
- Use bullet points for parallel items or tips

**Content Integration (CRITICAL):**
- If existing content is provided, you MUST preserve ALL existing content without exception
- NEVER delete, remove, replace, or omit any existing sections, steps, or information
- Enhance and expand existing content by adding new insights, examples, or details
- Create new sections for content that doesn't relate to existing sections
- Merge redundant content intelligently by combining similar points into enhanced versions
- Maintain consistency in tone and structure throughout
- Build upon previous content to create a comprehensive, cohesive playbook
- Think of this as combining two complete playbooks into one comprehensive resource

Your playbooks should be professional, comprehensive, and immediately usable by someone wanting to execute the described process.`

    // Build user prompt
    let userPrompt = `Create a comprehensive playbook for: "${sanitizedTopic}"\n\n`
    
    if (existingContent) {
      userPrompt += `**EXISTING PLAYBOOK CONTENT (MUST BE PRESERVED):**\n${existingContent}\n\n`
      userPrompt += `**🚨 CRITICAL REQUIREMENT - ZERO CONTENT DELETION 🚨**\n`
      userPrompt += `You are FORBIDDEN from deleting, removing, replacing, or omitting ANY content from the existing playbook above. Every single word, section, step, and piece of information MUST be preserved.\n\n`
      userPrompt += `**Your ONLY allowed actions are:**\n`
      userPrompt += `1. **ADD NEW SECTIONS** - Create entirely new sections based on document content\n`
      userPrompt += `2. **EXPAND EXISTING SECTIONS** - Add additional details, examples, or steps to existing sections\n`
      userPrompt += `3. **INTELLIGENT MERGING** - When document content relates to existing content, enhance the existing content by adding new insights, examples, or details\n`
      userPrompt += `4. **MAINTAIN ALL EXISTING STRUCTURE** - Keep all existing headings, sections, and organization\n`
      userPrompt += `5. **PRESERVE ALL EXISTING INFORMATION** - Every bullet point, step, tip, and piece of advice must remain\n\n`
      userPrompt += `**Think of this as creating a comprehensive playbook that combines TWO separate playbooks:**\n`
      userPrompt += `- Playbook 1: The existing content (which must remain 100% intact)\n`
      userPrompt += `- Playbook 2: New content from the uploaded documents\n`
      userPrompt += `- Final Result: A merged playbook that contains ALL content from both playbooks\n\n`
      userPrompt += `**Quality Check:** Before submitting your response, verify that every piece of information from the existing playbook is still present in your enhanced version.\n\n`
    }
    
    if (documents.length > 0) {
      userPrompt += `**IMPORTANT: Use the following document content as the PRIMARY SOURCE for creating this playbook. Base your playbook directly on the information provided in these documents:**\n\n`
      documents.forEach((doc, index) => {
        userPrompt += `**Document ${index + 1} Content:**\n${doc}\n\n`
      })
      userPrompt += `**INSTRUCTIONS:** Create a playbook that directly uses and organizes the information from the documents above. Extract the key concepts, techniques, and processes from the document content and structure them into a comprehensive, actionable playbook. Do not create a generic playbook about the topic - instead, create a playbook that teaches the specific content found in the uploaded documents.\n\n`
    }
    
    if (regenerateSection) {
      userPrompt += `**REGENERATE SECTION:** Please regenerate the section "${regenerateSection.sectionTitle}" with enhanced content.\n\n`
    }
    
    if (existingContent && documents.length > 0) {
      userPrompt += `**FINAL INSTRUCTION:** Create an enhanced, comprehensive playbook that combines ALL existing content with the new document content. This is essentially merging two complete playbooks into one comprehensive guide.\n\n`
      userPrompt += `**MANDATORY APPROACH:**\n`
      userPrompt += `1. **Start with ALL existing content** - Include every section, step, and piece of information from the existing playbook\n`
      userPrompt += `2. **Add new sections** - Create new sections for content from the documents that doesn't relate to existing content\n`
      userPrompt += `3. **Enhance existing sections** - When document content relates to existing sections, add the new insights, examples, or details to those sections\n`
      userPrompt += `4. **Maintain comprehensive coverage** - The final playbook should contain EVERYTHING from both the existing playbook AND the document content\n`
      userPrompt += `5. **Organize logically** - Structure the combined content in a logical, easy-to-follow format\n\n`
      userPrompt += `**Remember:** You are creating a comprehensive resource that contains the complete knowledge from both sources. Nothing should be lost or omitted.`
    } else if (documents.length > 0) {
      userPrompt += `Create a comprehensive, actionable playbook that teaches the specific content from the uploaded documents. Organize the information into logical sections with clear steps, include the techniques and processes described in the documents, and provide practical guidance based on the document content.`
    } else {
      userPrompt += `Please create a comprehensive, actionable playbook that covers all aspects of "${sanitizedTopic}". Include practical steps, required tools, explanations of why each step matters, and actionable next steps.`
    }
    
    // Estimate tokens for rate limiting
    const estimatedTokens = estimateTokens(systemPrompt + userPrompt)
    
    // Make API call to Claude - try different model names
    console.log('Making Claude API call with prompt length:', userPrompt.length)
    console.log('User prompt content:', userPrompt)
    console.log('Documents being sent:', documents.length, 'documents')
    console.log('First document preview:', documents[0]?.substring(0, 200) + '...')
    
    // List of model names to try in order
    const modelNames = [
      'claude-sonnet-4-20250514',
      'claude-3-5-sonnet-20241022',
      'claude-3-5-sonnet-20240620', 
      'claude-3-opus-20240229',
      'claude-3-sonnet-20240229'
    ]
    
    let message
    let lastError
    
    for (const modelName of modelNames) {
      try {
        console.log(`Trying model: ${modelName}`)
        message = await anthropic.messages.create({
          model: modelName,
          max_tokens: 8000,
          temperature: 1.0,
          system: systemPrompt,
          messages: [
            {
              role: 'user',
              content: userPrompt
            }
          ]
        })
        console.log(`Successfully used model: ${modelName}`)
        break
      } catch (error) {
        console.log(`Model ${modelName} failed:`, error)
        lastError = error
        continue
      }
    }
    
    if (!message) {
      throw lastError || new Error('All Claude models failed')
    }
    console.log('Claude API response received')
    
    // Extract response
    const responseText = message.content[0].type === 'text' ? message.content[0].text : ''
    
    // Parse the response
    const sections = parsePlaybookSections(responseText)
    const tiptapContent = markdownToTiptap(responseText)
    
    // Extract title and summary
    const lines = responseText.split('\n')
    const title = lines.find(line => line.startsWith('# '))?.replace('# ', '') || sanitizedTopic
    const summaryStart = lines.findIndex(line => line.toLowerCase().includes('executive summary'))
    const summaryEnd = lines.findIndex((line, index) => 
      index > summaryStart && (line.startsWith('## ') || line.startsWith('### '))
    )
    const summary = lines.slice(summaryStart, summaryEnd > 0 ? summaryEnd : summaryStart + 3)
      .join('\n')
      .replace(/^#+\s*executive summary\s*/i, '')
      .trim()
    
    // Prepare response
    const response: GeneratePlaybookResponse = {
      title,
      summary,
      content: tiptapContent,
      sections,
      rawMarkdown: responseText,
      usage: {
        inputTokens: message.usage.input_tokens,
        outputTokens: message.usage.output_tokens,
        totalTokens: message.usage.input_tokens + message.usage.output_tokens
      }
    }
    
    return NextResponse.json(response)
    
  } catch (error) {
    console.error('Playbook generation error:', error)
    
    // Handle specific Anthropic errors
    if (error instanceof Anthropic.APIError) {
      console.error('Anthropic API Error:', error.status, error.message)
      switch (error.status) {
        case 401:
          return NextResponse.json(
            { error: 'Invalid API key. Please check your Anthropic API key.' },
            { status: 500 }
          )
        case 429:
          return NextResponse.json(
            { error: 'Claude API rate limit exceeded. Please try again later.' },
            { status: 429 }
          )
        case 400:
          return NextResponse.json(
            { error: `Invalid request to Claude API: ${error.message}` },
            { status: 400 }
          )
        default:
          return NextResponse.json(
            { error: `Claude API error: ${error.message}` },
            { status: 500 }
          )
      }
    }
    
    // Handle other errors
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Other error:', errorMessage)
    return NextResponse.json(
      { error: `Internal server error: ${errorMessage}` },
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
