'use client'

interface LoadingSkeletonProps {
  type?: 'playbook-list' | 'playbook-content' | 'sidebar' | 'editor'
  className?: string
}

export default function LoadingSkeleton({ 
  type = 'playbook-content', 
  className = '' 
}: LoadingSkeletonProps) {
  
  const SkeletonPlaybookList = () => (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="bg-gray-200 h-4 rounded w-3/4 mb-2"></div>
          <div className="bg-gray-200 h-3 rounded w-1/2"></div>
        </div>
      ))}
    </div>
  )

  const SkeletonPlaybookContent = () => (
    <div className="space-y-6 animate-pulse">
      {/* Title */}
      <div className="bg-gray-200 h-8 rounded w-2/3"></div>
      
      {/* Summary */}
      <div className="space-y-2">
        <div className="bg-gray-200 h-4 rounded w-full"></div>
        <div className="bg-gray-200 h-4 rounded w-5/6"></div>
        <div className="bg-gray-200 h-4 rounded w-4/6"></div>
      </div>
      
      {/* Section headers */}
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="space-y-3">
          <div className="bg-gray-200 h-6 rounded w-1/2"></div>
          <div className="space-y-2 ml-4">
            <div className="bg-gray-200 h-4 rounded w-full"></div>
            <div className="bg-gray-200 h-4 rounded w-11/12"></div>
            <div className="bg-gray-200 h-4 rounded w-10/12"></div>
          </div>
        </div>
      ))}
    </div>
  )

  const SkeletonSidebar = () => (
    <div className="space-y-4 animate-pulse">
      {/* Logo area */}
      <div className="bg-gray-200 h-8 rounded w-3/4"></div>
      
      {/* Search */}
      <div className="bg-gray-200 h-10 rounded"></div>
      
      {/* Playbook list */}
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-gray-200 h-12 rounded"></div>
        ))}
      </div>
    </div>
  )

  const SkeletonEditor = () => (
    <div className="space-y-4 animate-pulse">
      {/* Toolbar */}
      <div className="bg-gray-200 h-12 rounded w-full"></div>
      
      {/* Editor content */}
      <div className="space-y-4">
        <div className="bg-gray-200 h-6 rounded w-1/3"></div>
        <div className="space-y-2">
          <div className="bg-gray-200 h-4 rounded w-full"></div>
          <div className="bg-gray-200 h-4 rounded w-5/6"></div>
          <div className="bg-gray-200 h-4 rounded w-4/6"></div>
        </div>
        <div className="bg-gray-200 h-6 rounded w-1/4"></div>
        <div className="space-y-2">
          <div className="bg-gray-200 h-4 rounded w-full"></div>
          <div className="bg-gray-200 h-4 rounded w-11/12"></div>
        </div>
      </div>
    </div>
  )

  const renderSkeleton = () => {
    switch (type) {
      case 'playbook-list':
        return <SkeletonPlaybookList />
      case 'playbook-content':
        return <SkeletonPlaybookContent />
      case 'sidebar':
        return <SkeletonSidebar />
      case 'editor':
        return <SkeletonEditor />
      default:
        return <SkeletonPlaybookContent />
    }
  }

  return (
    <div className={`${className}`}>
      {renderSkeleton()}
    </div>
  )
}

// Specific skeleton components for different use cases
export function PlaybookListItemSkeleton() {
  return (
    <div className="p-3 border-b border-gray-100 animate-pulse">
      <div className="bg-gray-200 h-4 rounded w-3/4 mb-2"></div>
      <div className="bg-gray-200 h-3 rounded w-1/2 mb-2"></div>
      <div className="flex gap-2">
        <div className="bg-gray-200 h-5 rounded-full w-16"></div>
        <div className="bg-gray-200 h-5 rounded-full w-12"></div>
      </div>
    </div>
  )
}

export function EditorToolbarSkeleton() {
  return (
    <div className="flex items-center gap-2 p-2 border-b border-gray-200 animate-pulse">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="bg-gray-200 h-8 w-8 rounded"></div>
      ))}
      <div className="ml-auto bg-gray-200 h-6 rounded w-20"></div>
    </div>
  )
}

export function TableOfContentsSkeleton() {
  return (
    <div className="space-y-2 animate-pulse">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className={`bg-gray-200 h-4 rounded ${i % 3 === 0 ? 'w-3/4' : 'w-5/6 ml-4'}`}></div>
      ))}
    </div>
  )
}

