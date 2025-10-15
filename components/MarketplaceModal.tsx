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
  } | null
  onSave: (data: { isInMarketplace: boolean; price: number }) => Promise<void>
}

export default function MarketplaceModal({
  isOpen,
  onClose,
  playbook,
  onSave
}: MarketplaceModalProps) {
  const [isInMarketplace, setIsInMarketplace] = useState(false)
  const [price, setPrice] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Initialize form data when modal opens or playbook changes
  useEffect(() => {
    if (isOpen && playbook) {
      // If playbook is already in marketplace, checkbox should be unchecked (meaning "remove from marketplace")
      // If playbook is not in marketplace, checkbox should be unchecked initially (meaning "add to marketplace")
      setIsInMarketplace(false) // Always start with unchecked
      // Convert cents to dollars for display (divide by 100)
      setPrice((playbook.price || 0) / 100)
      setError(null)
    }
  }, [isOpen, playbook])

  const handleSave = async () => {
    if (!playbook) return

    setIsLoading(true)
    setError(null)

    try {
      // Determine the final marketplace status based on current state and checkbox
      let finalMarketplaceStatus: boolean
      if (playbook.is_marketplace) {
        // If currently in marketplace, checkbox checked means remove (false), unchecked means keep (true)
        finalMarketplaceStatus = !isInMarketplace
      } else {
        // If not currently in marketplace, checkbox checked means add (true), unchecked means keep out (false)
        finalMarketplaceStatus = isInMarketplace
      }

      console.log('Marketplace save:', {
        currentMarketplaceStatus: playbook.is_marketplace,
        checkboxChecked: isInMarketplace,
        finalMarketplaceStatus: finalMarketplaceStatus,
        priceInDollars: price,
        priceInCents: Math.round(price * 100)
      })

      await onSave({
        isInMarketplace: finalMarketplaceStatus,
        price: Math.round(price * 100) // Convert dollars to cents
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save marketplace settings')
    } finally {
      setIsLoading(false)
    }
  }

  const handlePriceChange = (value: string) => {
    const numValue = parseFloat(value) || 0
    setPrice(Math.max(0, numValue)) // Ensure price is not negative
  }

  if (!isOpen || !playbook) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
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

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Warning */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-yellow-800">
                If you have confidential content in this playbook, we recommend creating a duplicate and removing that confidential content before posting to the Marketplace.
              </p>
            </div>
          </div>

          {/* Marketplace Toggle */}
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isInMarketplace}
                onChange={(e) => setIsInMarketplace(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="text-sm font-medium text-gray-900">
                {playbook.is_marketplace ? 'Remove from Marketplace' : 'Add to Marketplace'}
              </span>
            </label>
          </div>

          {/* Price Input - Always Visible */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Price
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <DollarSign className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={(e) => handlePriceChange(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                placeholder="0.00"
              />
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
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
