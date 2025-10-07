// API Types for Playbooq.AI

export interface GeneratePlaybookRequest {
  topic: string
  documents?: string[]
  existingContent?: string
  regenerateSection?: {
    sectionId: string
    sectionTitle: string
  }
}

export interface PlaybookSection {
  id: string
  title: string
  level: number
  content: string
}

export interface GeneratePlaybookResponse {
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

export interface ApiError {
  error: string
  details?: string
}

// Rate limiting types
export interface RateLimitInfo {
  count: number
  resetTime: number
  limit: number
}

// File upload types
export interface UploadedFile {
  id: string
  name: string
  size: number
  type: string
  content?: string // Extracted text content
  error?: string // Error message if processing failed
}

// Playbook generation status
export type GenerationStatus = 'idle' | 'generating' | 'completed' | 'error'

export interface GenerationProgress {
  status: GenerationStatus
  progress?: number
  message?: string
  error?: string
}
