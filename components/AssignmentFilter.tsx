'use client'

import { useState, useEffect, useRef } from 'react'
import { Filter, X, ChevronDown } from 'lucide-react'
import { Editor } from '@tiptap/react'

interface AssignmentFilterProps {
  editor: Editor | null
  onFilterChange?: (userId: string | null) => void
}

interface AssignmentUser {
  id: string
  name: string
  count: number
}

export default function AssignmentFilter({ editor, onFilterChange }: AssignmentFilterProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<string | null>(null)
  const [assignmentUsers, setAssignmentUsers] = useState<AssignmentUser[]>([])
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Extract unique users with assignments from the document
  useEffect(() => {
    if (!editor) return

    const extractUsers = () => {
      const users: Map<string, { name: string; count: number }> = new Map()
      
      editor.state.doc.descendants((node) => {
        node.marks.forEach((mark) => {
          if (mark.type.name === 'assignment') {
            const userId = mark.attrs.assignedTo || 'unknown'
            const userName = mark.attrs.assignedToName || 'Unknown User'
            
            // Handle multiple assignees (comma-separated)
            const userIds = userId.split(',').map((id: string) => id.trim())
            const userNames = userName.split(',').map((name: string) => name.trim())
            
            userIds.forEach((id: string, index: number) => {
              const name = userNames[index] || userNames[0] || 'Unknown User'
              if (users.has(id)) {
                const existing = users.get(id)!
                users.set(id, { name: existing.name, count: existing.count + 1 })
              } else {
                users.set(id, { name, count: 1 })
              }
            })
          }
        })
      })

      const userList = Array.from(users.entries()).map(([id, data]) => ({
        id,
        name: data.name,
        count: data.count
      }))

      // Sort by count (descending) then by name
      userList.sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count
        return a.name.localeCompare(b.name)
      })

      setAssignmentUsers(userList)
    }

    extractUsers()

    // Update when content changes
    const updateHandler = () => extractUsers()
    editor.on('update', updateHandler)

    return () => {
      editor.off('update', updateHandler)
    }
  }, [editor])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Apply filter to editor
  useEffect(() => {
    if (!editor) return

    // Add/remove filter class to editor
    const editorElement = editor.view.dom
    
    if (selectedUser) {
      editorElement.setAttribute('data-assignment-filter', selectedUser)
    } else {
      editorElement.removeAttribute('data-assignment-filter')
    }

    // Notify parent component
    onFilterChange?.(selectedUser)
  }, [selectedUser, editor, onFilterChange])

  const handleSelectUser = (userId: string | null) => {
    setSelectedUser(userId)
    setIsOpen(false)
  }

  const handleClearFilter = (e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedUser(null)
  }

  const selectedUserName = selectedUser 
    ? assignmentUsers.find(u => u.id === selectedUser)?.name || 'Unknown'
    : 'All'

  const totalAssignments = assignmentUsers.reduce((sum, user) => sum + user.count, 0)

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`p-2 rounded hover:bg-gray-200 transition-colors flex items-center gap-1 ${
          selectedUser ? 'bg-blue-100 text-blue-600' : 'text-gray-600'
        }`}
        title="Filter assignments by user"
      >
        <Filter className="h-4 w-4" />
        {selectedUser && (
          <X 
            className="h-3 w-3" 
            onClick={handleClearFilter}
          />
        )}
      </button>

      {isOpen && (
        <div className="fixed bg-white border border-gray-300 rounded-lg shadow-lg z-[9999] min-w-[240px] max-h-[400px] overflow-y-auto"
          style={{
            top: dropdownRef.current ? `${dropdownRef.current.getBoundingClientRect().bottom + 4}px` : '0',
            left: dropdownRef.current ? `${dropdownRef.current.getBoundingClientRect().left}px` : '0',
          }}
        >
          {/* All Assignments Option */}
          <button
            onClick={() => handleSelectUser(null)}
            className={`w-full text-left px-4 py-2 hover:bg-gray-100 transition-colors flex items-center justify-between ${
              !selectedUser ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'
            }`}
          >
            <span>All Assignments</span>
            <span className="text-sm text-gray-500">({totalAssignments})</span>
          </button>

          {assignmentUsers.length > 0 ? (
            <>
              <div className="border-t border-gray-200 my-1"></div>
              {assignmentUsers.map((user) => (
                <button
                  key={user.id}
                  onClick={() => handleSelectUser(user.id)}
                  className={`w-full text-left px-4 py-2 hover:bg-gray-100 transition-colors flex items-center justify-between ${
                    selectedUser === user.id ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'
                  }`}
                >
                  <span className="truncate">{user.name}</span>
                  <span className="text-sm text-gray-500 ml-2 flex-shrink-0">({user.count})</span>
                </button>
              ))}
            </>
          ) : (
            <div className="px-4 py-3 text-sm text-gray-500 text-center">
              No assignments found
            </div>
          )}
        </div>
      )}
    </div>
  )
}

