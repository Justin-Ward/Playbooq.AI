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

// Since there are no foreign key relationships, just use the basic Collaborator type
// The user_name, user_email are already stored directly in the collaborators table
type CollaboratorWithProfile = Collaborator

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

      // Check if this is a temporary playbook (should not have collaborators)
      if (playbookId.startsWith('temp-')) {
        setError('Collaborators are not available for temporary playbooks. Please save the playbook first.')
        setCollaborators([])
        return
      }

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

      console.log('Loading collaborators for playbook:', playbookId, 'current user:', currentUserId, 'current user email:', currentUserEmail)
      console.log('Raw collaborators data from database:', JSON.stringify(data, null, 2))

      // Process collaborators to use profile information (include ALL collaborators)
      const processedCollaborators = (data || [])
        .map((collab: any) => {
          // Ensure email is available - use current user email if this is the current user and email is missing
          let userEmail = collab.user_email
          if (!userEmail && collab.user_id === currentUserId) {
            userEmail = currentUserEmail
          }
          
          console.log('Processing collaborator:', JSON.stringify({
            id: collab.id,
            user_id: collab.user_id,
            user_email: collab.user_email,
            user_name: collab.user_name,
            profile_display_name: collab.user_profile?.display_name,
            final_email: userEmail,
            is_current_user: collab.user_id === currentUserId,
            full_collaborator_object: collab
          }, null, 2))
          
          return {
            ...collab,
            user_email: userEmail, // Ensure email is set
            user_name: collab.user_profile?.display_name || collab.user_name || collab.user_email,
            inviter_name: collab.inviter_profile?.display_name || collab.invited_by
          }
        })

      // Get the actual playbook owner from the playbooks table
      const { data: playbookData, error: playbookError } = await supabase
        .from('playbooks')
        .select('user_id')
        .eq('id', playbookId)
        .single()

      if (playbookError) {
        console.error('Error fetching playbook owner:', playbookError)
      }

      const actualOwnerId = playbookData?.user_id

      // Check if owner is already in the collaborators list
      const ownerInCollaborators = processedCollaborators.find((c: any) => c.user_id === actualOwnerId)
      
      if (ownerInCollaborators) {
        // Owner is in collaborators table, mark them as owner and ensure they have the right permission
        ownerInCollaborators.permission_level = 'owner'
        console.log('Owner found in collaborators table:', ownerInCollaborators)
        console.log('Final collaborators with emails (owner in table):', JSON.stringify(processedCollaborators.map(c => ({
          name: c.user_name,
          email: c.user_email,
          permission: c.permission_level
        })), null, 2))
        setCollaborators(processedCollaborators)
      } else {
        // Owner is not in collaborators table, add them manually
        const { data: ownerProfile } = await supabase
          .from('user_profiles')
          .select('display_name, avatar_url')
          .eq('id', actualOwnerId)
          .single()

        // Try to get owner's email from the collaborators table (they might be listed as an inviter)
        let ownerEmail = actualOwnerId === currentUserId ? currentUserEmail : ''
        
        // If we still don't have the owner's email, try to find it in the collaborators table
        if (!ownerEmail) {
          const { data: ownerFromCollaborators } = await supabase
            .from('collaborators')
            .select('user_email')
            .eq('user_id', actualOwnerId)
            .single()
          
          if (ownerFromCollaborators?.user_email) {
            ownerEmail = ownerFromCollaborators.user_email
          }
        }
        
        // If we still don't have the owner's email, try to find it from any collaborator where this user is the inviter
        if (!ownerEmail) {
          const { data: inviterData } = await supabase
            .from('collaborators')
            .select('invited_by, user_email')
            .eq('invited_by', actualOwnerId)
            .single()
          
          // If we still don't have the owner's email, we'll leave it empty
          // The UI should handle displaying this gracefully
        }
        
        console.log('Owner email resolution:', {
          actualOwnerId,
          currentUserId,
          currentUserEmail,
          ownerEmail,
          ownerProfile
        })
        
        // Try to update the owner's collaborator record with their profile information
        if (actualOwnerId && ownerProfile) {
          try {
            const { error: updateError } = await supabase
              .from('collaborators')
              .update({
                user_name: ownerProfile.display_name,
                user_email: ownerEmail || ''
              })
              .eq('playbook_id', playbookId)
              .eq('user_id', actualOwnerId)
            
            if (updateError) {
              console.warn('Failed to update owner collaborator info:', updateError)
            } else {
              console.log('Updated owner collaborator info:', ownerProfile.display_name, ownerEmail)
            }
          } catch (updateError) {
            console.warn('Error updating owner collaborator info:', updateError)
          }
        }

        const ownerCollaborator: CollaboratorWithProfile = {
          id: 'owner',
          playbook_id: playbookId,
          user_id: actualOwnerId || currentUserId,
          user_email: ownerEmail,
          user_name: ownerProfile?.display_name || 'Unknown Owner',
          permission_level: 'owner',
          invited_by: actualOwnerId || currentUserId,
          invited_at: new Date().toISOString(),
          accepted_at: new Date().toISOString(),
          status: 'accepted',
          user_profile: ownerProfile ? { id: actualOwnerId, display_name: ownerProfile.display_name, avatar_url: ownerProfile.avatar_url } : undefined
        }

        const finalCollaborators = [ownerCollaborator, ...processedCollaborators]
        setCollaborators(finalCollaborators)
        console.log('Final collaborators list (owner added manually):', finalCollaborators)
        console.log('Final collaborators with emails:', JSON.stringify(finalCollaborators.map(c => ({
          name: c.user_name,
          email: c.user_email,
          permission: c.permission_level
        })), null, 2))
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load collaborators')
    } finally {
      setLoading(false)
    }
  }

  const sendInvitation = async () => {
    // Check if this is a temporary playbook (cannot send invitations)
    if (playbookId.startsWith('temp-')) {
      setInviteError('Cannot send invitations for temporary playbooks. Please save the playbook first.')
      return
    }

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
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse bg-gray-200 h-12 rounded-lg"></div>
                  ))}
                </div>
              ) : error ? (
                <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm">{error}</span>
                </div>
              ) : (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  {/* Scrollable area for collaborators */}
                  <div className="max-h-48 overflow-y-auto">
                    <div className="space-y-1 p-2">
                      {collaborators.map((collaborator) => (
                        <div key={collaborator.id} className="flex items-center justify-between p-3 hover:bg-gray-50 transition-colors">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                              {collaborator.user_profile?.avatar_url ? (
                                <img 
                                  src={collaborator.user_profile.avatar_url} 
                                  alt={collaborator.user_name || 'User'} 
                                  className="w-8 h-8 rounded-full"
                                />
                              ) : (
                                <span className="text-xs font-medium text-gray-600">
                                  {(collaborator.user_name || collaborator.user_email).charAt(0).toUpperCase()}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <span className="font-medium text-gray-900 truncate">
                                {collaborator.user_profile?.display_name || collaborator.user_name || collaborator.user_email}
                              </span>
                              <span className="text-sm text-gray-500 truncate">
                                {collaborator.user_email || 'Email not available'}
                              </span>
                              <div className="flex items-center gap-1">
                                {getPermissionIcon(collaborator.permission_level)}
                                {getStatusBadge(collaborator)}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 flex-shrink-0">
                            {/* Permission selector - allow if current user is owner and not managing themselves */}
                            {collaborators.some(c => c.permission_level === 'owner' && c.user_id === currentUserId) && collaborator.user_id !== currentUserId && (
                              <select
                                value={collaborator.permission_level}
                                onChange={(e) => updatePermission(collaborator.id, e.target.value)}
                                className="text-xs border border-gray-300 rounded px-2 py-1 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                              >
                                <option value="view">View</option>
                                <option value="edit">Edit</option>
                                <option value="owner">Owner</option>
                              </select>
                            )}

                            {/* Remove button - allow if current user is owner and not removing themselves */}
                            {collaborators.some(c => c.permission_level === 'owner' && c.user_id === currentUserId) && collaborator.user_id !== currentUserId && (
                              <button
                                onClick={() => removeCollaborator(collaborator.id)}
                                className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                                title="Remove collaborator"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
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
