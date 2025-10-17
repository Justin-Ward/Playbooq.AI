import { useState, useEffect, useCallback } from 'react'
import { assignmentService, Assignment, AssignmentComment, AssignmentNotification } from '@/lib/services/assignmentService'

export function useAssignments(playbookId?: string, userId?: string) {
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchAssignments = useCallback(async () => {
    if (!playbookId && !userId) return

    setLoading(true)
    setError(null)

    try {
      let data: Assignment[]
      if (playbookId) {
        data = await assignmentService.getPlaybookAssignments(playbookId)
      } else if (userId) {
        data = await assignmentService.getUserAssignments(userId)
      } else {
        data = []
      }
      setAssignments(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch assignments')
      console.error('Error fetching assignments:', err)
    } finally {
      setLoading(false)
    }
  }, [playbookId, userId])

  const createAssignment = useCallback(async (assignmentData: {
    playbook_id: string
    assigned_to: string
    assigned_to_name: string
    assigned_by: string
    assigned_by_name: string
    due_date: string
    assignment_color: string
    content_range?: any
  }) => {
    try {
      const newAssignment = await assignmentService.createAssignment(assignmentData)
      setAssignments(prev => [newAssignment, ...prev])
      return newAssignment
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create assignment')
      throw err
    }
  }, [])

  const updateAssignment = useCallback(async (assignmentId: string, updateData: {
    status?: 'pending' | 'in_progress' | 'completed' | 'cancelled'
    due_date?: string
    assignment_color?: string
    content_range?: any
  }) => {
    try {
      const updatedAssignment = await assignmentService.updateAssignment(assignmentId, updateData)
      setAssignments(prev => 
        prev.map(assignment => 
          assignment.id === assignmentId ? updatedAssignment : assignment
        )
      )
      return updatedAssignment
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update assignment')
      throw err
    }
  }, [])

  const deleteAssignment = useCallback(async (assignmentId: string) => {
    try {
      await assignmentService.deleteAssignment(assignmentId)
      setAssignments(prev => prev.filter(assignment => assignment.id !== assignmentId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete assignment')
      throw err
    }
  }, [])

  useEffect(() => {
    fetchAssignments()
  }, [fetchAssignments])

  return {
    assignments,
    loading,
    error,
    fetchAssignments,
    createAssignment,
    updateAssignment,
    deleteAssignment
  }
}

export function useAssignmentComments(assignmentId: string) {
  const [comments, setComments] = useState<AssignmentComment[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchComments = useCallback(async () => {
    if (!assignmentId) return

    setLoading(true)
    setError(null)

    try {
      const data = await assignmentService.getAssignmentComments(assignmentId)
      setComments(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch comments')
      console.error('Error fetching assignment comments:', err)
    } finally {
      setLoading(false)
    }
  }, [assignmentId])

  const addComment = useCallback(async (comment: string, userId: string, userName: string) => {
    try {
      const newComment = await assignmentService.addAssignmentComment(assignmentId, comment, userId, userName)
      setComments(prev => [...prev, newComment])
      return newComment
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add comment')
      throw err
    }
  }, [assignmentId])

  useEffect(() => {
    fetchComments()
  }, [fetchComments])

  return {
    comments,
    loading,
    error,
    fetchComments,
    addComment
  }
}

export function useAssignmentNotifications(userId: string) {
  const [notifications, setNotifications] = useState<AssignmentNotification[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)

  const fetchNotifications = useCallback(async () => {
    if (!userId) return

    setLoading(true)
    setError(null)

    try {
      const data = await assignmentService.getUserNotifications(userId)
      setNotifications(data)
      setUnreadCount(data.filter(n => !n.is_read).length)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch notifications')
      console.error('Error fetching assignment notifications:', err)
    } finally {
      setLoading(false)
    }
  }, [userId])

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      await assignmentService.markNotificationAsRead(notificationId)
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === notificationId 
            ? { ...notification, is_read: true }
            : notification
        )
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark notification as read')
      throw err
    }
  }, [])

  const markAllAsRead = useCallback(async () => {
    try {
      await assignmentService.markAllNotificationsAsRead(userId)
      setNotifications(prev => 
        prev.map(notification => ({ ...notification, is_read: true }))
      )
      setUnreadCount(0)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark all notifications as read')
      throw err
    }
  }, [userId])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  return {
    notifications,
    unreadCount,
    loading,
    error,
    fetchNotifications,
    markAsRead,
    markAllAsRead
  }
}

export function useAssignmentStats(userId: string) {
  const [stats, setStats] = useState<{
    total: number
    pending: number
    in_progress: number
    completed: number
    overdue: number
  }>({
    total: 0,
    pending: 0,
    in_progress: 0,
    completed: 0,
    overdue: 0
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = useCallback(async () => {
    if (!userId) return

    setLoading(true)
    setError(null)

    try {
      const data = await assignmentService.getUserAssignmentStats(userId)
      setStats(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch assignment stats')
      console.error('Error fetching assignment stats:', err)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  return {
    stats,
    loading,
    error,
    fetchStats
  }
}
