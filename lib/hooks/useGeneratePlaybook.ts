import { useState, useCallback } from 'react'
import { GeneratePlaybookRequest, GeneratePlaybookResponse, ApiError } from '@/types/api'

interface UseGeneratePlaybookReturn {
  generatePlaybook: (request: GeneratePlaybookRequest) => Promise<GeneratePlaybookResponse>
  isGenerating: boolean
  error: string | null
  clearError: () => void
}

export function useGeneratePlaybook(): UseGeneratePlaybookReturn {
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const generatePlaybook = useCallback(async (request: GeneratePlaybookRequest): Promise<GeneratePlaybookResponse> => {
    setIsGenerating(true)
    setError(null)

    try {
      const response = await fetch('/api/generate-playbook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      })

      if (!response.ok) {
        const errorData: ApiError = await response.json()
        throw new Error(errorData.error || 'Failed to generate playbook')
      }

      const data: GeneratePlaybookResponse = await response.json()
      return data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred'
      setError(errorMessage)
      throw err
    } finally {
      setIsGenerating(false)
    }
  }, [])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return {
    generatePlaybook,
    isGenerating,
    error,
    clearError,
  }
}
