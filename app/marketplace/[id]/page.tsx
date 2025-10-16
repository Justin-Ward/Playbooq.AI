'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import Head from 'next/head'
import { 
  Star, 
  Heart, 
  ShoppingCart, 
  ArrowLeft,
  User,
  Calendar,
  Tag,
  Eye,
  Download,
  MessageCircle,
  Share2,
  Twitter,
  Linkedin,
  Copy,
  Check,
  X
} from 'lucide-react'
import Link from 'next/link'
import { marketplaceService } from '@/lib/services/marketplaceService'
import { MarketplacePlaybookWithStatus } from '@/lib/services/marketplaceService'
import { MarketplaceRating } from '@/types/database'
import { Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'

export default function MarketplaceDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useUser()
  const playbookId = params.id as string

  const [playbook, setPlaybook] = useState<MarketplacePlaybookWithStatus | null>(null)
  const [ratings, setRatings] = useState<MarketplaceRating[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isFavorited, setIsFavorited] = useState(false)
  const [isPurchased, setIsPurchased] = useState(false)
  const [description, setDescription] = useState<string>('')
  const [tableOfContents, setTableOfContents] = useState<string[]>([])
  const [previewContent, setPreviewContent] = useState<any>(null)
  const [showWriteReview, setShowWriteReview] = useState(false)
  const [newReview, setNewReview] = useState({ rating: 5, text: '' })
  const [copied, setCopied] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const reviewsPerPage = 5

  useEffect(() => {
    const fetchPlaybook = async () => {
      try {
        setLoading(true)
        setError(null)

        const [playbookData, ratingsData] = await Promise.all([
          marketplaceService.getPlaybookById(playbookId),
          marketplaceService.getPlaybookRatings(playbookId).catch(() => []) // Handle ratings error gracefully
        ])

        if (!playbookData) {
          setError('Playbook not found')
          return
        }

        setPlaybook(playbookData)
        setRatings(ratingsData)

        // Generate description, table of contents, and preview content
        // Use stored description if available, otherwise generate from content
        const finalDescription = playbookData.description || generateDescription(playbookData.content)
        const toc = extractTableOfContents(playbookData.content)
        const preview = generatePreviewContent(playbookData.content, playbookData.price === 0)
        
        
        setDescription(finalDescription)
        setTableOfContents(toc)
        setPreviewContent(preview)

        // Check if user has favorited or purchased this playbook
        if (user?.id) {
          const [favorites, purchases] = await Promise.all([
            marketplaceService.getUserFavorites(user.id),
            marketplaceService.getUserPurchases(user.id)
          ])

          setIsFavorited(favorites.has(playbookId))
          setIsPurchased(purchases.has(playbookId))
        }
      } catch (err) {
        console.error('Error fetching playbook:', err)
        setError('Failed to load playbook')
      } finally {
        setLoading(false)
      }
    }

    if (playbookId) {
      fetchPlaybook()
    }
  }, [playbookId, user?.id])

  const handleToggleFavorite = async () => {
    if (!user?.id) {
      router.push('/sign-in')
      return
    }

    try {
      await marketplaceService.toggleFavorite(playbookId, user.id, isFavorited)
      setIsFavorited(!isFavorited)
    } catch (err) {
      console.error('Error toggling favorite:', err)
    }
  }

  const handlePurchase = () => {
    if (!user?.id) {
      router.push('/sign-in')
      return
    }

    // Check if user is trying to purchase their own playbook
    if (playbook && user.id === playbook.owner_id) {
      alert('You cannot purchase your own playbook.')
      return
    }

    // TODO: Implement purchase flow
    console.log('Purchase playbook:', playbookId)
  }

  const handleMessageSeller = () => {
    if (!user?.id) {
      router.push('/sign-in')
      return
    }
    
    // TODO: Implement messaging functionality
    console.log('Message seller:', playbook?.owner_id)
  }

  const handleShare = async (platform: 'twitter' | 'linkedin' | 'copy') => {
    const url = window.location.href
    const title = playbook?.title || 'Check out this playbook'
    
    if (platform === 'copy') {
      try {
        await navigator.clipboard.writeText(url)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch (err) {
        console.error('Failed to copy:', err)
      }
    } else if (platform === 'twitter') {
      const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`
      window.open(twitterUrl, '_blank')
    } else if (platform === 'linkedin') {
      const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`
      window.open(linkedinUrl, '_blank')
    }
  }

  const handleSubmitReview = async () => {
    if (!user?.id || !playbook) return
    
    try {
      await marketplaceService.submitRating(playbookId, user.id, newReview.rating, newReview.text)
      setShowWriteReview(false)
      setNewReview({ rating: 5, text: '' })
      // Refresh ratings
      const updatedRatings = await marketplaceService.getPlaybookRatings(playbookId)
      setRatings(updatedRatings)
    } catch (err) {
      console.error('Error submitting review:', err)
    }
  }

  const formatPrice = (price: number) => {
    if (price === 0) return 'Free'
    return `$${(price / 100).toFixed(2)}`
  }

  // Generate automatic description from content
  const generateDescription = (content: any): string => {
    if (!content) return 'No description available.'
    
    try {
      // Use the same text extraction logic as the preview
      const textContent = renderContentAsText(content)
      
      if (!textContent) return 'No description available.'
      
      // Extract first meaningful paragraph or first 200 characters
      const sentences = textContent.split(/[.!?]+/).filter(s => s.trim().length > 10)
      if (sentences.length > 0) {
        const firstSentence = sentences[0].trim()
        return firstSentence.length > 200 ? firstSentence.substring(0, 200) + '...' : firstSentence
      }
      
      return textContent.length > 200 ? textContent.substring(0, 200) + '...' : textContent
    } catch {
      return 'No description available.'
    }
  }

  // Extract table of contents from content
  const extractTableOfContents = (content: any): string[] => {
    if (!content) return []
    
    try {
      const contentObj = typeof content === 'string' ? JSON.parse(content) : content
      const headings: string[] = []
      
      const extractHeadings = (node: any) => {
        if (node.type === 'heading' && node.content) {
          const headingText = node.content.map((c: any) => c.text || '').join('')
          if (headingText.trim()) {
            headings.push(headingText.trim())
          }
        }
        if (node.content) {
          node.content.forEach(extractHeadings)
        }
      }
      
      if (contentObj.content) {
        contentObj.content.forEach(extractHeadings)
      }
      
      return headings // Show all headings
    } catch {
      return []
    }
  }

  // Generate preview content (first 15% or all if free)
  const generatePreviewContent = (content: any, isFree: boolean): any => {
    if (!content) return null
    
    try {
      const contentObj = typeof content === 'string' ? JSON.parse(content) : content
      
      if (isFree) {
        return contentObj // Show all content for free playbooks
      }
      
      // For paid playbooks, show first 15% of content
      if (contentObj.content && Array.isArray(contentObj.content)) {
        const totalNodes = contentObj.content.length
        const previewCount = Math.max(1, Math.floor(totalNodes * 0.15))
        
        return {
          ...contentObj,
          content: contentObj.content.slice(0, previewCount)
        }
      }
      
      return contentObj
    } catch {
      return null
    }
  }

  // Render content as HTML to preserve formatting
  const renderContentAsHTML = (content: any): string => {
    if (!content) return ''
    
    try {
      const contentObj = typeof content === 'string' ? JSON.parse(content) : content
      
      const renderNode = (node: any): string => {
        if (!node) return ''
        
        switch (node.type) {
          case 'doc':
            if (node.content) {
              return node.content.map(renderNode).join('')
            }
            return ''
            
          case 'paragraph':
            if (node.content) {
              const text = node.content.map(renderNode).join('')
              const align = node.attrs?.textAlign || 'left'
              return `<p style="text-align: ${align}">${text}</p>`
            }
            return '<p></p>'
            
          case 'heading':
            const level = node.attrs?.level || 1
            if (node.content) {
              const text = node.content.map(renderNode).join('')
              const align = node.attrs?.textAlign || 'left'
              return `<h${level} style="text-align: ${align}">${text}</h${level}>`
            }
            return `<h${level}></h${level}>`
            
          case 'bulletList':
            if (node.content) {
              const items = node.content.map(renderNode).join('')
              return `<ul>${items}</ul>`
            }
            return '<ul></ul>'
            
          case 'orderedList':
            if (node.content) {
              const items = node.content.map(renderNode).join('')
              return `<ol>${items}</ol>`
            }
            return '<ol></ol>'
            
          case 'listItem':
            if (node.content) {
              const text = node.content.map(renderNode).join('')
              return `<li>${text}</li>`
            }
            return '<li></li>'
            
          case 'text':
            let text = node.text || ''
            let style = ''
            
            // Apply text marks
            if (node.marks) {
              node.marks.forEach((mark: any) => {
                switch (mark.type) {
                  case 'bold':
                    text = `<strong>${text}</strong>`
                    break
                  case 'italic':
                    text = `<em>${text}</em>`
                    break
                  case 'underline':
                    text = `<u>${text}</u>`
                    break
                  case 'highlight':
                    text = `<mark>${text}</mark>`
                    break
                  case 'code':
                    text = `<code>${text}</code>`
                    break
                  case 'link':
                    const href = mark.attrs?.href || '#'
                    text = `<a href="${href}" target="_blank" rel="noopener noreferrer">${text}</a>`
                    break
                  case 'textStyle':
                    if (mark.attrs?.color) {
                      style += `color: ${mark.attrs.color}; `
                    }
                    if (mark.attrs?.fontFamily) {
                      style += `font-family: ${mark.attrs.fontFamily}; `
                    }
                    break
                }
              })
            }
            
            if (style) {
              text = `<span style="${style}">${text}</span>`
            }
            
            return text
            
          case 'hardBreak':
            return '<br>'
            
          case 'codeBlock':
            if (node.content) {
              const text = node.content.map(renderNode).join('')
              return `<pre><code>${text}</code></pre>`
            }
            return '<pre><code></code></pre>'
            
          case 'blockquote':
            if (node.content) {
              const text = node.content.map(renderNode).join('')
              return `<blockquote>${text}</blockquote>`
            }
            return '<blockquote></blockquote>'
            
          default:
            // For unknown node types, try to render content if it exists
            if (node.content && Array.isArray(node.content)) {
              return node.content.map(renderNode).join('')
            }
            return ''
        }
      }
      
      return renderNode(contentObj)
    } catch (error) {
      console.error('Error rendering content as HTML:', error)
      return ''
    }
  }

  // Render content as readable text (for description generation)
  const renderContentAsText = (content: any): string => {
    if (!content) return ''
    
    try {
      const contentObj = typeof content === 'string' ? JSON.parse(content) : content
      let text = ''
      
      const extractText = (node: any) => {
        if (node.type === 'text' && node.text) {
          text += node.text
        } else if (node.type === 'heading' && node.content) {
          node.content.forEach(extractText)
          text += '\n\n'
        } else if (node.type === 'paragraph' && node.content) {
          node.content.forEach(extractText)
          text += '\n\n'
        } else if (node.content && Array.isArray(node.content)) {
          node.content.forEach(extractText)
        }
      }
      
      if (contentObj.content && Array.isArray(contentObj.content)) {
        contentObj.content.forEach(extractText)
      }
      
      return text.trim()
    } catch {
      return ''
    }
  }

  const renderStars = (rating: number) => {
    const stars = []
    const fullStars = Math.floor(rating)
    const hasHalfStar = rating % 1 >= 0.5

    for (let i = 0; i < fullStars; i++) {
      stars.push(<Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />)
    }

    if (hasHalfStar) {
      stars.push(<Star key="half" className="h-5 w-5 fill-yellow-400/50 text-yellow-400" />)
    }

    const emptyStars = 5 - Math.ceil(rating)
    for (let i = 0; i < emptyStars; i++) {
      stars.push(<Star key={`empty-${i}`} className="h-5 w-5 text-gray-300" />)
    }

    return stars
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading playbook...</p>
        </div>
      </div>
    )
  }

  if (error || !playbook) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Playbook Not Found</h1>
          <p className="text-gray-600 mb-6">{error || 'The playbook you are looking for does not exist.'}</p>
          <Link
            href="/marketplace"
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Back to Marketplace
          </Link>
        </div>
      </div>
    )
  }

  return (
    <>
      <Head>
        <title>{playbook ? `${playbook.title} - Playbooq Marketplace` : 'Playbook - Playbooq Marketplace'}</title>
        <meta name="description" content={playbook ? description : 'Discover professional playbooks on Playbooq Marketplace'} />
        <meta name="keywords" content={playbook ? `${playbook.title}, playbook, business, strategy, ${playbook.tags?.join(', ') || ''}` : 'playbook, business, strategy, marketplace'} />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="product" />
        <meta property="og:title" content={playbook ? playbook.title : 'Playbook - Playbooq Marketplace'} />
        <meta property="og:description" content={playbook ? description : 'Discover professional playbooks on Playbooq Marketplace'} />
        <meta property="og:url" content={typeof window !== 'undefined' ? window.location.href : ''} />
        <meta property="og:site_name" content="Playbooq" />
        {playbook?.creator_avatar && (
          <meta property="og:image" content={playbook.creator_avatar} />
        )}
        <meta property="og:image:alt" content={playbook ? `${playbook.title} by ${playbook.creator_name}` : 'Playbooq Playbook'} />
        
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={playbook ? playbook.title : 'Playbook - Playbooq Marketplace'} />
        <meta name="twitter:description" content={playbook ? description : 'Discover professional playbooks on Playbooq Marketplace'} />
        {playbook?.creator_avatar && (
          <meta name="twitter:image" content={playbook.creator_avatar} />
        )}
        <meta name="twitter:image:alt" content={playbook ? `${playbook.title} by ${playbook.creator_name}` : 'Playbooq Playbook'} />
        
        {/* Additional meta tags */}
        <meta name="author" content={playbook?.creator_name || 'Playbooq'} />
        <meta name="robots" content="index, follow" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        
        {/* Product-specific meta tags */}
        {playbook && (
          <>
            <meta property="product:price:amount" content={playbook.price.toString()} />
            <meta property="product:price:currency" content="USD" />
            <meta property="product:availability" content="in stock" />
            <meta property="product:condition" content="new" />
            <meta property="product:brand" content="Playbooq" />
            <meta property="product:category" content="Digital Products" />
          </>
        )}
        
        {/* Structured data for rich snippets */}
        {playbook && (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "Product",
                "name": playbook.title,
                "description": description,
                "image": playbook.creator_avatar || "",
                "brand": {
                  "@type": "Brand",
                  "name": "Playbooq"
                },
                "offers": {
                  "@type": "Offer",
                  "price": playbook.price / 100,
                  "priceCurrency": "USD",
                  "availability": "https://schema.org/InStock",
                  "seller": {
                    "@type": "Person",
                    "name": playbook.creator_name
                  }
                },
                "aggregateRating": playbook.average_rating > 0 ? {
                  "@type": "AggregateRating",
                  "ratingValue": playbook.average_rating,
                  "reviewCount": ratings.length
                } : undefined,
                "author": {
                  "@type": "Person",
                  "name": playbook.creator_name
                }
              })
            }}
          />
        )}
      </Head>
      
      <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-4 mb-6">
            <Link
              href="/marketplace"
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
              Back to Marketplace
            </Link>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2">
              <h1 className="text-3xl font-bold text-gray-900 mb-6">{playbook.title}</h1>
              
              {/* Header with ratings, seller, and message button */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  {/* Star Ratings */}
                  <div className="flex items-center gap-1">
                    {renderStars(playbook.average_rating)}
                    <span className="text-sm text-gray-600 ml-1">
                      ({ratings.length} reviews)
                    </span>
                  </div>
                  
                  {/* Seller Info */}
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                      {playbook.creator_avatar ? (
                        <img
                          src={playbook.creator_avatar}
                          alt={playbook.creator_name}
                          className="w-8 h-8 rounded-full"
                        />
                      ) : (
                        <span className="text-sm font-medium text-gray-600">
                          {playbook.creator_name?.[0] || 'A'}
                        </span>
                      )}
                    </div>
                    <Link 
                      href={`/profile/${playbook.owner_id}`}
                      className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                      by {playbook.creator_name}
                    </Link>
                  </div>
                </div>
                
                {/* Message Seller Button */}
                <button
                  onClick={handleMessageSeller}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <MessageCircle className="h-4 w-4" />
                  Message Seller
                </button>
              </div>

              {/* Description */}
              <div className="prose max-w-none mb-8">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Description</h3>
                <p className="text-lg text-gray-700 leading-relaxed">
                  {description || 'No description available.'}
                  {description && !description.endsWith('...') && '...'}
                </p>
              </div>

              {/* Preview Section */}
              <div className="mb-8">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Preview</h3>
                
                {/* Table of Contents */}
                {tableOfContents.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-sm font-medium text-gray-900 mb-3">Table of Contents</h4>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100" style={{ direction: 'rtl' }}>
                        <ul className="space-y-2" style={{ direction: 'ltr' }}>
                          {tableOfContents.map((heading, index) => (
                            <li key={index} className="text-sm text-gray-700">
                              {index + 1}. {heading}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {/* Content Preview */}
                {previewContent && (
                  <div className="border border-gray-200 rounded-lg p-6">
                    <div className="prose max-w-none">
                      <div 
                        className="text-gray-700 leading-relaxed [&_strong]:font-bold [&_em]:italic [&_u]:underline [&_mark]:bg-yellow-200 [&_code]:bg-gray-100 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-sm [&_pre]:bg-gray-100 [&_pre]:p-4 [&_pre]:rounded [&_pre]:overflow-x-auto [&_ul]:list-disc [&_ul]:ml-6 [&_ul]:my-2 [&_ol]:list-decimal [&_ol]:ml-6 [&_ol]:my-2 [&_li]:my-1 [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:my-4 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:my-3 [&_h3]:text-lg [&_h3]:font-bold [&_h3]:my-2 [&_h4]:text-base [&_h4]:font-bold [&_h4]:my-2 [&_h5]:text-sm [&_h5]:font-bold [&_h5]:my-1 [&_h6]:text-xs [&_h6]:font-bold [&_h6]:my-1 [&_p]:my-2 [&_blockquote]:border-l-4 [&_blockquote]:border-gray-300 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:my-4 [&_a]:text-blue-600 [&_a]:underline [&_a]:hover:text-blue-800"
                        dangerouslySetInnerHTML={{ __html: renderContentAsHTML(previewContent) }}
                      />
                    </div>
                    
                    {playbook.price > 0 && !isPurchased && (
                      <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
                        <div className="text-center">
                          <div className="text-lg font-semibold text-gray-900 mb-2">
                            Purchase to unlock full content
                          </div>
                          <p className="text-sm text-gray-600 mb-4">
                            This preview shows the first 15% of the playbook. Purchase to access the complete content.
                          </p>
                          <button
                            onClick={handlePurchase}
                            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                          >
                            Purchase for {formatPrice(playbook.price)}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Tags */}
              {playbook.tags && playbook.tags.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-sm font-medium text-gray-900 mb-3">Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {playbook.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Reviews Section */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold text-gray-900">
                    Reviews ({ratings.length})
                  </h3>
                  {isPurchased && (
                    <button
                      onClick={() => setShowWriteReview(true)}
                      className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      Write a Review
                    </button>
                  )}
                </div>

                {/* Average Rating */}
                {ratings.length > 0 && (
                  <div className="flex items-center gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
                    <div className="text-3xl font-bold text-gray-900">
                      {playbook.average_rating.toFixed(1)}
                    </div>
                    <div className="flex items-center gap-1">
                      {renderStars(playbook.average_rating)}
                    </div>
                    <div className="text-sm text-gray-600">
                      Based on {ratings.length} review{ratings.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                )}

                {/* Reviews List */}
                {ratings.length > 0 ? (
                  <div className="space-y-4">
                    {ratings.slice((currentPage - 1) * reviewsPerPage, currentPage * reviewsPerPage).map((rating) => (
                      <div key={rating.id} className="bg-white p-4 rounded-lg border border-gray-200">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="flex items-center gap-1">
                            {renderStars(rating.rating)}
                          </div>
                          <span className="text-sm text-gray-600">
                            {new Date(rating.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        {rating.review && (
                          <p className="text-gray-700">{rating.review}</p>
                        )}
                      </div>
                    ))}
                    
                    {/* Pagination */}
                    {ratings.length > reviewsPerPage && (
                      <div className="flex justify-center mt-6">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                            disabled={currentPage === 1}
                            className="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                          >
                            Previous
                          </button>
                          <span className="px-3 py-1 text-sm text-gray-600">
                            Page {currentPage} of {Math.ceil(ratings.length / reviewsPerPage)}
                          </span>
                          <button
                            onClick={() => setCurrentPage(Math.min(Math.ceil(ratings.length / reviewsPerPage), currentPage + 1))}
                            disabled={currentPage >= Math.ceil(ratings.length / reviewsPerPage)}
                            className="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No reviews yet. Be the first to review this playbook!
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg border border-gray-200 p-6 sticky top-6">
                <div className="text-center mb-6">
                  <div className="text-3xl font-bold text-gray-900 mb-2">
                    {formatPrice(playbook.price)}
                  </div>
                  {playbook.price > 0 && (
                    <p className="text-sm text-gray-600">
                      One-time purchase • Lifetime access
                    </p>
                  )}
                </div>

                <div className="space-y-4 mb-6">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Created</span>
                    <span className="font-medium">
                      {new Date(playbook.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Updated</span>
                    <span className="font-medium">
                      {new Date(playbook.updated_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  <button
                    onClick={handleToggleFavorite}
                    className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg border transition-colors ${
                      isFavorited
                        ? 'border-red-500 text-red-500 hover:bg-red-50'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Heart className={`h-5 w-5 ${isFavorited ? 'fill-current' : ''}`} />
                    {isFavorited ? 'Favorited' : 'Add to Favorites'}
                  </button>

                  {isPurchased ? (
                    <div className="w-full py-3 px-4 bg-green-100 text-green-800 rounded-lg text-center font-medium">
                      ✓ Owned
                    </div>
                  ) : (
                    <button
                      onClick={handlePurchase}
                      className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                    >
                      <ShoppingCart className="h-5 w-5" />
                      {playbook.price === 0 ? 'Get Free' : 'Purchase'}
                    </button>
                  )}
                </div>

                {/* Share Buttons */}
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Share</h4>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleShare('twitter')}
                      className="flex-1 flex items-center justify-center gap-2 py-2 px-3 text-sm text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      <Twitter className="h-4 w-4" />
                      Twitter
                    </button>
                    <button
                      onClick={() => handleShare('linkedin')}
                      className="flex-1 flex items-center justify-center gap-2 py-2 px-3 text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      <Linkedin className="h-4 w-4" />
                      LinkedIn
                    </button>
                    <button
                      onClick={() => handleShare('copy')}
                      className="flex items-center justify-center gap-2 py-2 px-3 text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-gray-200">
                  <p className="text-xs text-gray-500 text-center">
                    Secure payment powered by Stripe
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Write Review Modal */}
      {showWriteReview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Write a Review</h2>
              <button
                onClick={() => setShowWriteReview(false)}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rating
                </label>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setNewReview({ ...newReview, rating: star })}
                      className="p-1"
                    >
                      <Star 
                        className={`h-6 w-6 ${
                          star <= newReview.rating 
                            ? 'fill-yellow-400 text-yellow-400' 
                            : 'text-gray-300'
                        }`} 
                      />
                    </button>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Review (optional)
                </label>
                <textarea
                  value={newReview.text}
                  onChange={(e) => setNewReview({ ...newReview, text: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={4}
                  placeholder="Share your thoughts about this playbook..."
                />
              </div>
            </div>
            
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
              <button
                onClick={() => setShowWriteReview(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitReview}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Submit Review
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  )
}
