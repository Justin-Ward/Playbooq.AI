'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { Crown, Edit, Eye, CheckCircle, AlertCircle, UserPlus } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { Collaborator } from '@/types/database'

interface CollaboratorWithDetails extends Collaborator {
  playbook_title?: string
  inviter_name?: string
  inviter_email?: string
}

export default function InvitePage() {
  const params = useParams()
  const router = useRouter()
  const { user, isLoaded } = useUser()
  const [collaborator, setCollaborator] = useState<CollaboratorWithDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const collaboratorId = params.collaboratorId as string

  useEffect(() => {
    if (collaboratorId) {
      loadInvitationDetails()
    }
  }, [collaboratorId])

  const loadInvitationDetails = async () => {
    try {
      setLoading(true)
      setError(null)

      // Get collaborator details with playbook and inviter info
      const { data, error } = await supabase
        .from('collaborators')
        .select(`
          *,
          playbook:playbooks!collaborators_playbook_id_fkey(title),
          inviter_profile:user_profiles!collaborators_invited_by_fkey(display_name)
        `)
        .eq('id', collaboratorId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          throw new Error('Invitation not found or has expired')
        }
        throw error
      }

      if (data.status !== 'pending') {
        throw new Error('This invitation has already been processed')
      }

      setCollaborator({
        ...data,
        playbook_title: data.playbook?.title,
        inviter_name: data.inviter_profile?.display_name || data.invited_by
      })
    } catch (err: any) {
      setError(err.message || 'Failed to load invitation details')
    } finally {
      setLoading(false)
    }
  }

  const acceptInvitation = async () => {
    if (!user) {
      // Redirect to sign up with return URL
      const returnUrl = encodeURIComponent(window.location.href)
      router.push(`/sign-up?redirect_url=${returnUrl}`)
      return
    }

    try {
      setAccepting(true)
      setError(null)

      // Check if user's email matches the invitation
      if (user.primaryEmailAddress?.emailAddress !== collaborator?.user_email) {
        throw new Error('This invitation was sent to a different email address')
      }

      // Update collaborator status to accepted
      const { error: updateError } = await supabase
        .from('collaborators')
        .update({
          status: 'accepted',
          accepted_at: new Date().toISOString(),
          user_id: user.id
        })
        .eq('id', collaboratorId)

      if (updateError) throw updateError

      setSuccess(true)

      // Redirect to playbook after 3 seconds
      setTimeout(() => {
        router.push(`/playbooks?id=${collaborator?.playbook_id}`)
      }, 3000)
    } catch (err: any) {
      setError(err.message || 'Failed to accept invitation')
    } finally {
      setAccepting(false)
    }
  }

  const getPermissionIcon = (permission: string) => {
    switch (permission) {
      case 'owner': return <Crown className="h-5 w-5 text-yellow-600" />
      case 'edit': return <Edit className="h-5 w-5 text-blue-600" />
      case 'view': return <Eye className="h-5 w-5 text-gray-600" />
      default: return <Eye className="h-5 w-5 text-gray-600" />
    }
  }

  const getPermissionDescription = (permission: string) => {
    switch (permission) {
      case 'owner': return 'Full access including managing collaborators'
      case 'edit': return 'Can view and edit the playbook content'
      case 'view': return 'Can view and read the playbook content'
      default: return 'Limited access to the playbook'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading invitation details...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6 text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Invitation Error</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            Go to Homepage
          </button>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6 text-center">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Invitation Accepted!</h1>
          <p className="text-gray-600 mb-4">
            You now have access to "{collaborator?.playbook_title}". 
            Redirecting you to the playbook...
          </p>
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      </div>
    )
  }

  if (!collaborator) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6 text-center">
          <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Invitation Not Found</h1>
          <p className="text-gray-600 mb-4">This invitation may have expired or been revoked.</p>
          <button
            onClick={() => router.push('/')}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            Go to Homepage
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-lg w-full p-6">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <UserPlus className="h-8 w-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Collaboration Invitation</h1>
          <p className="text-gray-600">You've been invited to collaborate on a playbook</p>
        </div>

        {/* Invitation Details */}
        <div className="space-y-4 mb-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-2">📋 Playbook</h3>
            <p className="text-lg text-gray-800">{collaborator.playbook_title}</p>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-2">👤 Invited by</h3>
            <p className="text-gray-800">{collaborator.inviter_name}</p>
            <p className="text-sm text-gray-600">{collaborator.invited_by}</p>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-2">🔐 Permission Level</h3>
            <div className="flex items-center gap-2">
              {getPermissionIcon(collaborator.permission_level)}
              <span className="font-medium text-gray-800 capitalize">
                {collaborator.permission_level}
              </span>
            </div>
            <p className="text-sm text-gray-600 mt-1">
              {getPermissionDescription(collaborator.permission_level)}
            </p>
          </div>
        </div>

        {/* Email Mismatch Warning */}
        {isLoaded && user && user.primaryEmailAddress?.emailAddress !== collaborator.user_email && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <AlertCircle className="h-5 w-5 text-yellow-600 inline mr-2" />
            <span className="text-sm text-yellow-800">
              This invitation was sent to <strong>{collaborator.user_email}</strong>, 
              but you're signed in as <strong>{user.primaryEmailAddress?.emailAddress}</strong>.
              Please sign in with the correct account.
            </span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          {!isLoaded ? (
            <div className="animate-pulse bg-gray-200 h-12 rounded-md"></div>
          ) : user ? (
            <button
              onClick={acceptInvitation}
              disabled={accepting || (user.primaryEmailAddress?.emailAddress !== collaborator.user_email)}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {accepting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Accepting Invitation...
                </>
              ) : (
                <>
                  <CheckCircle className="h-5 w-5" />
                  Accept Invitation
                </>
              )}
            </button>
          ) : (
            <>
              <p className="text-sm text-gray-600 text-center mb-3">
                You need to sign in to accept this invitation.
              </p>
              <button
                onClick={() => {
                  const returnUrl = encodeURIComponent(window.location.href)
                  router.push(`/sign-up?redirect_url=${returnUrl}`)
                }}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 transition-colors"
              >
                Sign Up / Sign In
              </button>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 pt-6 border-t border-gray-200 text-center">
          <p className="text-xs text-gray-500">
            This invitation was sent by Playbooq.AI.<br/>
            If you didn't expect this invitation, you can safely ignore it.
          </p>
        </div>
      </div>
    </div>
  )
}

