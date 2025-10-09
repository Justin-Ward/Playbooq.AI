'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, UserPlus, Mail, Crown, Edit, Eye, Trash2, AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { Collaborator } from '@/types/database'

interface CollaboratorsModalProps {
  isOpen: boolean
  onClose: () => void
  playbookId: string
  playbookTitle: string
  currentUserId: string
  currentUserEmail: string
  currentUserName: string
}

interface CollaboratorWithProfile extends Collaborator {
  user_profile?: {
    display_name?: string
    avatar_url?: string
  }
  inviter_profile?: {
    display_name?: string
  }
}

export default function CollaboratorsModal({
  isOpen,
  onClose,
  playbookId,
  playbookTitle,
  currentUserId,
  currentUserEmail,
  currentUserName
}: CollaboratorsModalProps) {
  console.log('CollaboratorsModal rendered with:', { isOpen, playbookId, playbookTitle, currentUserId })
  const [collaborators, setCollaborators] = useState<CollaboratorWithProfile[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Add new collaborator form
  const [newEmail, setNewEmail] = useState('')
  const [newPermission, setNewPermission] = useState<'edit' | 'view' | 'owner'>('edit')
  const [sendingInvite, setSendingInvite] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)

  // Load collaborators
  useEffect(() => {
    if (isOpen && playbookId) {
      loadCollaborators()
    }
  }, [isOpen, playbookId])

  const loadCollaborators = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from('collaborators')
        .select(`
          *,
          user_profile:user_profiles!collaborators_user_id_fkey(id, display_name, avatar_url),
          inviter_profile:user_profiles!collaborators_invited_by_fkey(id, display_name)
        `)
        .eq('playbook_id', playbookId)
        .order('invited_at', { ascending: false })

      if (error) throw error

      // Add the owner to the list
      const ownerCollaborator: CollaboratorWithProfile = {
        id: 'owner',
        playbook_id: playbookId,
        user_id: currentUserId,
        user_email: currentUserEmail,
        user_name: currentUserName,
        permission_level: 'owner',
        invited_by: currentUserId,
        invited_at: new Date().toISOString(),
        accepted_at: new Date().toISOString(),
        status: 'accepted'
      }

      setCollaborators([ownerCollaborator, ...(data || [])])
    } catch (err: any) {
      setError(err.message || 'Failed to load collaborators')
    } finally {
      setLoading(false)
    }
  }

  const sendInvitation = async () => {
    if (!newEmail.trim()) {
      setInviteError('Email is required')
      return
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(newEmail)) {
      setInviteError('Please enter a valid email address')
      return
    }

    // Check if already invited
    const existingCollaborator = collaborators.find(
      c => c.user_email.toLowerCase() === newEmail.toLowerCase()
    )
    if (existingCollaborator) {
      setInviteError('This user has already been invited')
      return
    }

    try {
      setSendingInvite(true)
      setInviteError(null)

      // Create collaborator record
      const { data: collaboratorData, error: collaboratorError } = await supabase
        .from('collaborators')
        .insert({
          playbook_id: playbookId,
          user_email: newEmail.toLowerCase(),
          user_name: newEmail.split('@')[0], // Use email prefix as name
          permission_level: newPermission,
          invited_by: currentUserId,
          status: 'pending'
        })
        .select()
        .single()

      if (collaboratorError) throw collaboratorError

      // Send invitation email
      const response = await fetch('/api/send-invitation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          collaboratorId: collaboratorData.id,
          inviterName: currentUserName,
          inviterEmail: currentUserEmail,
          playbookTitle,
          permissionLevel: newPermission,
          invitedEmail: newEmail
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to send invitation')
      }

      // Clear form and reload
      setNewEmail('')
      setNewPermission('edit')
      await loadCollaborators()
    } catch (err: any) {
      setInviteError(err.message || 'Failed to send invitation')
    } finally {
      setSendingInvite(false)
    }
  }

  const updatePermission = async (collaboratorId: string, newPermission: string) => {
    try {
      const { error } = await supabase
        .from('collaborators')
        .update({ permission_level: newPermission })
        .eq('id', collaboratorId)

      if (error) throw error

      await loadCollaborators()
    } catch (err: any) {
      setError(err.message || 'Failed to update permission')
    }
  }

  const removeCollaborator = async (collaboratorId: string) => {
    if (!confirm('Are you sure you want to remove this collaborator?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('collaborators')
        .delete()
        .eq('id', collaboratorId)

      if (error) throw error

      await loadCollaborators()
    } catch (err: any) {
      setError(err.message || 'Failed to remove collaborator')
    }
  }

  const getPermissionIcon = (permission: string) => {
    switch (permission) {
      case 'owner': return <Crown className="h-4 w-4 text-yellow-600" />
      case 'edit': return <Edit className="h-4 w-4 text-blue-600" />
      case 'view': return <Eye className="h-4 w-4 text-gray-600" />
      default: return <Eye className="h-4 w-4 text-gray-600" />
    }
  }

  const getStatusBadge = (collaborator: CollaboratorWithProfile) => {
    if (collaborator.permission_level === 'owner') {
      return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">Owner</span>
    }
    
    switch (collaborator.status) {
      case 'pending':
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">Pending</span>
      case 'accepted':
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">Active</span>
      case 'declined':
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">Declined</span>
      default:
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">Unknown</span>
    }
  }

  if (!isOpen) return null

  // Show message if no playbook is selected
  if (!playbookId) {
    return createPortal(
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <UserPlus className="h-8 w-8 text-gray-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No Playbook Selected</h2>
            <p className="text-gray-600 mb-6">
              Please create or select a playbook to manage collaborators.
            </p>
            <button
              onClick={onClose}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>,
      document.body
    )
  }

  return createPortal(
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Manage Collaborators</h2>
            <p className="text-sm text-gray-600 mt-1">{playbookTitle}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-md transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
          <div className="p-6 space-y-6">
            {/* Current Collaborators */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Current Collaborators</h3>
              
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse bg-gray-200 h-16 rounded-lg"></div>
                  ))}
                </div>
              ) : error ? (
                <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm">{error}</span>
                </div>
              ) : (
                <div className="space-y-3">
                  {collaborators.map((collaborator) => (
                    <div key={collaborator.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                          {collaborator.user_profile?.avatar_url ? (
                            <img 
                              src={collaborator.user_profile.avatar_url} 
                              alt={collaborator.user_name || 'User'} 
                              className="w-10 h-10 rounded-full"
                            />
                          ) : (
                            <span className="text-sm font-medium text-gray-600">
                              {(collaborator.user_name || collaborator.user_email).charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900">
                              {collaborator.user_profile?.display_name || collaborator.user_name || collaborator.user_email}
                            </span>
                            {getPermissionIcon(collaborator.permission_level)}
                          </div>
                          <div className="text-sm text-gray-600">{collaborator.user_email}</div>
                          <div className="flex items-center gap-2 mt-1">
                            {getStatusBadge(collaborator)}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Permission selector - only for non-owners or if current user is owner */}
                        {collaborator.permission_level !== 'owner' && (
                          <select
                            value={collaborator.permission_level}
                            onChange={(e) => updatePermission(collaborator.id, e.target.value)}
                            className="text-sm border border-gray-300 rounded px-2 py-1 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="view">View</option>
                            <option value="edit">Edit</option>
                            {collaborator.permission_level === 'owner' || collaborators.some(c => c.permission_level === 'owner' && c.user_id === currentUserId) ? (
                              <option value="owner">Owner</option>
                            ) : null}
                          </select>
                        )}

                        {/* Remove button - not for owners */}
                        {collaborator.permission_level !== 'owner' && (
                          <button
                            onClick={() => removeCollaborator(collaborator.id)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Remove collaborator"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add New Collaborator */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Add New Collaborator
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="Enter email address"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Permission Level
                  </label>
                  <select
                    value={newPermission}
                    onChange={(e) => setNewPermission(e.target.value as 'edit' | 'view' | 'owner')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="view">View - Can view the playbook</option>
                    <option value="edit">Edit - Can view and edit the playbook</option>
                    <option value="owner">Owner - Full access including managing collaborators</option>
                  </select>
                </div>

                {inviteError && (
                  <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm">{inviteError}</span>
                  </div>
                )}

                <button
                  onClick={sendInvitation}
                  disabled={sendingInvite || !newEmail.trim()}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  <Mail className="h-4 w-4" />
                  {sendingInvite ? 'Sending Invitation...' : 'Send Invitation'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
