'use client'

import { useState, useEffect } from 'react'
import { X, Calendar, User, Palette, Plus } from 'lucide-react'
import { AssignmentAttributes } from '@/lib/extensions/Assignment'

interface AssignmentModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (attributes: AssignmentAttributes) => void
  currentAttributes?: AssignmentAttributes | null
  availableUsers?: Array<{ id: string; name: string; email: string }>
}

interface Assignee {
  id: string
  name: string
  email?: string
}

const ASSIGNMENT_COLORS = [
  { name: 'Yellow', value: '#fef3c7' },
  { name: 'Blue', value: '#dbeafe' },
  { name: 'Green', value: '#dcfce7' },
  { name: 'Red', value: '#fee2e2' },
  { name: 'Purple', value: '#e9d5ff' },
  { name: 'Pink', value: '#fce7f3' },
  { name: 'Orange', value: '#fed7aa' },
  { name: 'Gray', value: '#f3f4f6' },
]

export default function AssignmentModal({
  isOpen,
  onClose,
  onSave,
  currentAttributes,
  availableUsers = [],
}: AssignmentModalProps) {
  const [selectedAssignees, setSelectedAssignees] = useState<Assignee[]>([])
  const [manualAssigneeName, setManualAssigneeName] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [assignmentColor, setAssignmentColor] = useState('#fef3c7')

  useEffect(() => {
    if (currentAttributes && currentAttributes.assignedTo && currentAttributes.assignedToName) {
      // Parse existing assignees from comma-separated string
      const assigneeIds = currentAttributes.assignedTo.split(',')
      const assigneeNames = currentAttributes.assignedToName.split(',')
      
      const assignees: Assignee[] = assigneeIds.map((id, index) => ({
        id: id.trim(),
        name: assigneeNames[index]?.trim() || '',
        email: availableUsers.find(u => u.id === id.trim())?.email
      }))
      
      setSelectedAssignees(assignees)
      setDueDate(currentAttributes.dueDate || '')
      setAssignmentColor(currentAttributes.assignmentColor || '#fef3c7')
    } else {
      // Reset form for new assignment
      setSelectedAssignees([])
      setManualAssigneeName('')
      setDueDate('')
      setAssignmentColor('#fef3c7')
    }
  }, [currentAttributes, isOpen, availableUsers])

  const handleToggleUser = (user: { id: string; name: string; email: string }) => {
    setSelectedAssignees(prev => {
      const isSelected = prev.some(a => a.id === user.id)
      if (isSelected) {
        return prev.filter(a => a.id !== user.id)
      } else {
        return [...prev, { id: user.id, name: user.name, email: user.email }]
      }
    })
  }

  const handleAddManualAssignee = () => {
    if (!manualAssigneeName.trim()) {
      alert('Please enter a name')
      return
    }

    const manualId = `manual_${Date.now()}`
    setSelectedAssignees(prev => [
      ...prev,
      { id: manualId, name: manualAssigneeName.trim() }
    ])
    setManualAssigneeName('')
  }

  const handleRemoveAssignee = (assigneeId: string) => {
    setSelectedAssignees(prev => prev.filter(a => a.id !== assigneeId))
  }

  const handleSave = () => {
    if (selectedAssignees.length === 0 || !dueDate) {
      alert('Please select at least one assignee and a due date')
      return
    }

    // Combine all assignees into comma-separated strings
    const assignedTo = selectedAssignees.map(a => a.id).join(',')
    const assignedToName = selectedAssignees.map(a => a.name).join(', ')

    const attributes: AssignmentAttributes = {
      assignedTo,
      assignedToName,
      dueDate,
      assignmentColor,
    }

    onSave(attributes)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            {currentAttributes ? 'Edit Assignment' : 'Create Assignment'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Assign to - Collaborators with checkboxes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <User className="h-4 w-4 inline mr-1" />
              Assign to Collaborators
            </label>
            {availableUsers.length > 0 ? (
              <div className="border border-gray-300 rounded-md max-h-48 overflow-y-auto">
                {availableUsers.map((user) => {
                  const isSelected = selectedAssignees.some(a => a.id === user.id)
                  return (
                    <label
                      key={user.id}
                      className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleUser(user)}
                        className="mr-3 h-4 w-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                      />
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">{user.name}</div>
                        <div className="text-xs text-gray-500">{user.email}</div>
                      </div>
                    </label>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic">No collaborators available</p>
            )}
          </div>

          {/* Manual assignee input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <User className="h-4 w-4 inline mr-1" />
              Or Assign to Someone Else
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={manualAssigneeName}
                onChange={(e) => setManualAssigneeName(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleAddManualAssignee()
                  }
                }}
                placeholder="Enter name..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleAddManualAssignee}
                className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                title="Add assignee"
              >
                <Plus className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Selected assignees */}
          {selectedAssignees.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Selected Assignees ({selectedAssignees.length})
              </label>
              <div className="flex flex-wrap gap-2">
                {selectedAssignees.map((assignee) => (
                  <div
                    key={assignee.id}
                    className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                  >
                    <span>{assignee.name}</span>
                    <button
                      onClick={() => handleRemoveAssignee(assignee.id)}
                      className="text-blue-600 hover:text-blue-800"
                      title="Remove"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}


          {/* Due Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="h-4 w-4 inline mr-1" />
              Due Date *
            </label>
            <input
              type="datetime-local"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* Assignment Color */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Palette className="h-4 w-4 inline mr-1" />
              Assignment Color
            </label>
            <div className="grid grid-cols-4 gap-2">
              {ASSIGNMENT_COLORS.map((color) => (
                <button
                  key={color.value}
                  onClick={() => setAssignmentColor(color.value)}
                  className={`w-full h-10 rounded-md border-2 ${
                    assignmentColor === color.value
                      ? 'border-gray-800'
                      : 'border-gray-300'
                  }`}
                  style={{ backgroundColor: color.value }}
                  title={color.name}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            {currentAttributes ? 'Update Assignment' : 'Create Assignment'}
          </button>
        </div>
      </div>
    </div>
  )
}
