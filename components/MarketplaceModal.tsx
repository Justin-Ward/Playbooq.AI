'use client'

import { useState, useEffect } from 'react'
import { X, DollarSign, AlertTriangle } from 'lucide-react'

interface MarketplaceModalProps {
  isOpen: boolean
  onClose: () => void
  playbook: {
    id?: string
    title: string
    is_marketplace?: boolean
    price?: number
    description?: string
    content?: any
  } | null
  onSave: (data: { isInMarketplace: boolean; price: number; description?: string }) => Promise<void>
}

export default function MarketplaceModal({
  isOpen,
  onClose,
  playbook,
  onSave
}: MarketplaceModalProps) {
  const [price, setPrice] = useState(0)
  const [description, setDescription] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isRemoving, setIsRemoving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Function to extract first 60 words from playbook content
  const extractFirst60Words = (content: any): string => {
    if (!content) return ''
    
    try {
      const contentObj = typeof content === 'string' ? JSON.parse(content) : content
      
      const extractText = (node: any): string => {
        if (!node) return ''
        
        switch (node.type) {
          case 'doc':
            if (node.content) {
              return node.content.map(extractText).join(' ')
            }
            return ''
            
          case 'paragraph':
          case 'heading':
          case 'text':
            if (node.content) {
              return node.content.map(extractText).join(' ')
            }
            return node.text || ''
            
          case 'bulletList':
          case 'orderedList':
          case 'listItem':
            if (node.content) {
              return node.content.map(extractText).join(' ')
            }
            return ''
            
          default:
            if (node.content && Array.isArray(node.content)) {
              return node.content.map(extractText).join(' ')
            }
            return ''
        }
      }
      
      const fullText = extractText(contentObj)
      const words = fullText.trim().split(/\s+/)
      return words.slice(0, 60).join(' ')
    } catch (error) {
      console.error('Error extracting text from content:', error)
      return ''
    }
  }

  // Initialize form data when modal opens or playbook changes
  useEffect(() => {
    if (isOpen && playbook) {
      // Convert cents to dollars for display (divide by 100)
      setPrice((playbook.price || 0) / 100)
      // Initialize description - use existing description or generate from content
      setDescription(playbook.description || extractFirst60Words(playbook.content || ''))
      setError(null)
    }
  }, [isOpen, playbook])

  const handleSave = async () => {
    if (!playbook) return

    setIsLoading(true)
    setError(null)

    try {
      console.log('Marketplace save:', {
        currentMarketplaceStatus: playbook.is_marketplace,
        priceInDollars: price,
        priceInCents: Math.round(price * 100)
      })

      await onSave({
        isInMarketplace: true, // Always add to marketplace when using Save button
        price: Math.round(price * 100), // Convert dollars to cents
        description: description.trim() || undefined // Only include if not empty
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save marketplace settings')
    } finally {
      setIsLoading(false)
    }
  }


  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    const numValue = parseFloat(value) || 0
    setPrice(Math.max(0, numValue)) // Ensure price is not negative
  }

  const handleRemoveFromMarketplace = async () => {
    if (!playbook) return

    setIsRemoving(true)
    setError(null)

    try {
      await onSave({
        isInMarketplace: false, // Remove from marketplace
        price: Math.round(price * 100), // Keep current price
        description: description.trim() || undefined // Keep current description
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove from marketplace')
    } finally {
      setIsRemoving(false)
    }
  }

  if (!isOpen || !playbook) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {playbook.is_marketplace ? 'Marketplace Settings' : 'Add to Marketplace'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        {/* Playbook Title */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <h3 className="text-base font-medium text-gray-900 truncate" title={playbook.title}>
            {playbook.title}
          </h3>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Warning */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-yellow-800">
                If you'd like to remove certain content from your playbook before publishing to the Marketplace, we recommend creating a new version by clicking 'Duplicate' in the toolbar and editing that version before publishing.
              </p>
            </div>
          </div>

          {/* Auto Update Notice */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-blue-800">
                Any changes you make to your playbook content will automatically update in the Marketplace.
              </p>
            </div>
          </div>


          {/* Description Input */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
              placeholder="Enter a compelling description for your playbook..."
            />
            <p className="text-xs text-gray-500">
              Write a compelling description to attract buyers. If left empty, the first 60 words from your playbook will be used automatically.
            </p>
          </div>

          {/* Price Input - Always Visible */}
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                Price
              </label>
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <DollarSign className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={price}
                  onChange={handlePriceChange}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0.00"
                />
              </div>
            </div>
            <p className="text-xs text-gray-500">
              We recommend a price of $0-$10. If Free, input $0.
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200">
          {/* Remove from Marketplace button (only show if already in marketplace) */}
          {playbook.is_marketplace && (
            <button
              onClick={handleRemoveFromMarketplace}
              disabled={isRemoving || isLoading}
              className="px-4 py-2 text-sm font-medium text-red-700 bg-white border border-red-300 rounded-md hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isRemoving ? 'Removing...' : 'Remove from Marketplace'}
            </button>
          )}
          
          {/* Right side buttons */}
          <div className="flex items-center gap-3 ml-auto">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isLoading || isRemoving}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Updating...' : 'Update'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
