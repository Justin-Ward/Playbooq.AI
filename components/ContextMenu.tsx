'use client'

import { useState, useEffect, useRef, ReactNode } from 'react'
import { MoreHorizontal, Copy, Edit, Trash2, RefreshCw, Expand } from 'lucide-react'

interface ContextMenuProps {
  children: ReactNode
  onRegenerate?: () => void
  onExpand?: () => void
  onDuplicate?: () => void
  onEdit?: () => void
  onDelete?: () => void
  className?: string
}

interface ContextMenuState {
  visible: boolean
  x: number
  y: number
  targetElement?: HTMLElement
}

export default function ContextMenu({
  children,
  onRegenerate,
  onExpand,
  onDuplicate,
  onEdit,
  onDelete,
  className = ''
}: ContextMenuProps) {
  const [menuState, setMenuState] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0
  })
  const menuRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const showMenu = (event: React.MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return

    setMenuState({
      visible: true,
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
      targetElement: event.currentTarget as HTMLElement
    })
  }

  const hideMenu = () => {
    setMenuState({ visible: false, x: 0, y: 0 })
  }

  const handleAction = (action: () => void) => {
    action()
    hideMenu()
  }

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        hideMenu()
      }
    }

    if (menuState.visible) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [menuState.visible])

  // Close menu on escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        hideMenu()
      }
    }

    if (menuState.visible) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [menuState.visible])

  const menuItems = [
    {
      label: 'Regenerate Section',
      icon: RefreshCw,
      action: onRegenerate,
      className: 'text-blue-600 hover:bg-blue-50'
    },
    {
      label: 'Expand Section',
      icon: Expand,
      action: onExpand,
      className: 'text-green-600 hover:bg-green-50'
    },
    {
      label: 'Duplicate',
      icon: Copy,
      action: onDuplicate,
      className: 'text-gray-600 hover:bg-gray-50'
    },
    {
      label: 'Edit',
      icon: Edit,
      action: onEdit,
      className: 'text-gray-600 hover:bg-gray-50'
    },
    {
      label: 'Delete',
      icon: Trash2,
      action: onDelete,
      className: 'text-red-600 hover:bg-red-50'
    }
  ].filter(item => item.action) // Only show items that have actions

  return (
    <div 
      ref={containerRef}
      className={`relative ${className}`}
      onContextMenu={showMenu}
    >
      {children}
      
      {menuState.visible && (
        <div
          ref={menuRef}
          className="absolute z-50 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[180px]"
          style={{
            left: menuState.x,
            top: menuState.y
          }}
        >
          {menuItems.map((item, index) => {
            const Icon = item.icon
            return (
              <button
                key={index}
                onClick={() => handleAction(item.action!)}
                className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-gray-50 transition-colors ${item.className}`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

