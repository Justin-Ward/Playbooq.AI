import { supabase } from '@/lib/supabase'

export interface Assignment {
  id: string
  playbook_id: string
  assigned_to: string
  assigned_to_name: string
  assigned_by: string
  assigned_by_name: string
  due_date: string
  assignment_color: string
  content_range?: any
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  created_at: string
  updated_at: string
}

export interface AssignmentComment {
  id: string
  assignment_id: string
  user_id: string
  user_name: string
  comment: string
  created_at: string
  updated_at: string
}

export interface AssignmentNotification {
  id: string
  assignment_id: string
  user_id: string
  notification_type: 'assigned' | 'due_soon' | 'overdue' | 'completed' | 'commented'
  is_read: boolean
  created_at: string
}

export interface AssignmentAssignee {
  id: string
  assignment_id: string
  user_id: string
  user_name: string
  user_email?: string
  created_at: string
}

export interface CreateAssignmentData {
  playbook_id: string
  assigned_to: string
  assigned_to_name: string
  assigned_by: string
  assigned_by_name: string
  due_date: string
  assignment_color: string
  content_range?: any
}

export interface UpdateAssignmentData {
  status?: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  due_date?: string
  assignment_color?: string
  content_range?: any
}

export class AssignmentService {
  // Get all assignments for a playbook
  async getPlaybookAssignments(playbookId: string): Promise<Assignment[]> {
    const { data, error } = await supabase
      .from('assignments')
      .select('*')
      .eq('playbook_id', playbookId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching playbook assignments:', error)
      throw error
    }

    return data || []
  }

  // Get assignments assigned to a specific user
  async getUserAssignments(userId: string): Promise<Assignment[]> {
    const { data, error } = await supabase
      .from('assignments')
      .select(`
        *,
        playbooks!inner(title, description)
      `)
      .eq('assigned_to', userId)
      .order('due_date', { ascending: true })

    if (error) {
      console.error('Error fetching user assignments:', error)
      throw error
    }

    return data || []
  }

  // Get overdue assignments for a user
  async getOverdueAssignments(userId: string): Promise<Assignment[]> {
    const { data, error } = await supabase
      .from('assignments')
      .select(`
        *,
        playbooks!inner(title, description)
      `)
      .eq('assigned_to', userId)
      .eq('status', 'pending')
      .lt('due_date', new Date().toISOString())
      .order('due_date', { ascending: true })

    if (error) {
      console.error('Error fetching overdue assignments:', error)
      throw error
    }

    return data || []
  }

  // Create a new assignment
  async createAssignment(assignmentData: CreateAssignmentData): Promise<Assignment> {
    const { data, error } = await supabase
      .from('assignments')
      .insert([assignmentData])
      .select()
      .single()

    if (error) {
      console.error('Error creating assignment:', error)
      throw error
    }

    // Create notification for the assigned user
    await this.createNotification({
      assignment_id: data.id,
      user_id: assignmentData.assigned_to,
      notification_type: 'assigned'
    })

    return data
  }

  // Update an assignment
  async updateAssignment(assignmentId: string, updateData: UpdateAssignmentData): Promise<Assignment> {
    const { data, error } = await supabase
      .from('assignments')
      .update(updateData)
      .eq('id', assignmentId)
      .select()
      .single()

    if (error) {
      console.error('Error updating assignment:', error)
      throw error
    }

    // Create notification if status changed to completed
    if (updateData.status === 'completed') {
      const assignment = await this.getAssignment(assignmentId)
      if (assignment) {
        await this.createNotification({
          assignment_id: assignmentId,
          user_id: assignment.assigned_by,
          notification_type: 'completed'
        })
      }
    }

    return data
  }

  // Delete an assignment
  async deleteAssignment(assignmentId: string): Promise<void> {
    const { error } = await supabase
      .from('assignments')
      .delete()
      .eq('id', assignmentId)

    if (error) {
      console.error('Error deleting assignment:', error)
      throw error
    }
  }

  // Get a specific assignment
  async getAssignment(assignmentId: string): Promise<Assignment | null> {
    const { data, error } = await supabase
      .from('assignments')
      .select('*')
      .eq('id', assignmentId)
      .single()

    if (error) {
      console.error('Error fetching assignment:', error)
      return null
    }

    return data
  }

  // Get comments for an assignment
  async getAssignmentComments(assignmentId: string): Promise<AssignmentComment[]> {
    const { data, error } = await supabase
      .from('assignment_comments')
      .select('*')
      .eq('assignment_id', assignmentId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching assignment comments:', error)
      throw error
    }

    return data || []
  }

  // Add a comment to an assignment
  async addAssignmentComment(assignmentId: string, comment: string, userId: string, userName: string): Promise<AssignmentComment> {
    const { data, error } = await supabase
      .from('assignment_comments')
      .insert([{
        assignment_id: assignmentId,
        user_id: userId,
        user_name: userName,
        comment
      }])
      .select()
      .single()

    if (error) {
      console.error('Error adding assignment comment:', error)
      throw error
    }

    // Create notification for assignment participants
    const assignment = await this.getAssignment(assignmentId)
    if (assignment) {
      const notificationUserIds = [assignment.assigned_to, assignment.assigned_by].filter(id => id !== userId)
      
      for (const notificationUserId of notificationUserIds) {
        await this.createNotification({
          assignment_id: assignmentId,
          user_id: notificationUserId,
          notification_type: 'commented'
        })
      }
    }

    return data
  }

  // Get notifications for a user
  async getUserNotifications(userId: string): Promise<AssignmentNotification[]> {
    const { data, error } = await supabase
      .from('assignment_notifications')
      .select(`
        *,
        assignments!inner(
          id,
          playbook_id,
          assigned_to_name,
          due_date,
          status,
          playbooks!inner(title)
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching user notifications:', error)
      throw error
    }

    return data || []
  }

  // Mark notification as read
  async markNotificationAsRead(notificationId: string): Promise<void> {
    const { error } = await supabase
      .from('assignment_notifications')
      .update({ is_read: true })
      .eq('id', notificationId)

    if (error) {
      console.error('Error marking notification as read:', error)
      throw error
    }
  }

  // Mark all notifications as read for a user
  async markAllNotificationsAsRead(userId: string): Promise<void> {
    const { error } = await supabase
      .from('assignment_notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false)

    if (error) {
      console.error('Error marking all notifications as read:', error)
      throw error
    }
  }

  // Create a notification (internal method)
  private async createNotification(notificationData: {
    assignment_id: string
    user_id: string
    notification_type: 'assigned' | 'due_soon' | 'overdue' | 'completed' | 'commented'
  }): Promise<void> {
    const { error } = await supabase
      .from('assignment_notifications')
      .insert([notificationData])

    if (error) {
      console.error('Error creating notification:', error)
      // Don't throw here as notifications are not critical
    }
  }

  // Get assignment statistics for a user
  async getUserAssignmentStats(userId: string): Promise<{
    total: number
    pending: number
    in_progress: number
    completed: number
    overdue: number
  }> {
    const { data, error } = await supabase
      .from('assignments')
      .select('status, due_date')
      .eq('assigned_to', userId)

    if (error) {
      console.error('Error fetching assignment stats:', error)
      throw error
    }

    const now = new Date()
    const stats = {
      total: data.length,
      pending: 0,
      in_progress: 0,
      completed: 0,
      overdue: 0
    }

    data.forEach(assignment => {
      switch (assignment.status) {
        case 'pending':
          stats.pending++
          if (new Date(assignment.due_date) < now) {
            stats.overdue++
          }
          break
        case 'in_progress':
          stats.in_progress++
          break
        case 'completed':
          stats.completed++
          break
      }
    })

    return stats
  }

  // Get all assignees for an assignment
  async getAssignmentAssignees(assignmentId: string): Promise<AssignmentAssignee[]> {
    const { data, error } = await supabase
      .from('assignment_assignees')
      .select('*')
      .eq('assignment_id', assignmentId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching assignment assignees:', error)
      throw error
    }

    return data || []
  }

  // Add multiple assignees to an assignment
  async addAssignees(assignmentId: string, assignees: Array<{
    user_id: string
    user_name: string
    user_email?: string
  }>): Promise<void> {
    const assigneesData = assignees.map(assignee => ({
      assignment_id: assignmentId,
      user_id: assignee.user_id,
      user_name: assignee.user_name,
      user_email: assignee.user_email
    }))

    const { error } = await supabase
      .from('assignment_assignees')
      .insert(assigneesData)

    if (error) {
      console.error('Error adding assignment assignees:', error)
      throw error
    }

    // Create notifications for all assignees
    for (const assignee of assignees) {
      // Only create notification for real user IDs (not manual entries)
      if (!assignee.user_id.startsWith('manual_')) {
        await this.createNotification({
          assignment_id: assignmentId,
          user_id: assignee.user_id,
          notification_type: 'assigned'
        })
      }
    }
  }

  // Remove an assignee from an assignment
  async removeAssignee(assignmentId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('assignment_assignees')
      .delete()
      .eq('assignment_id', assignmentId)
      .eq('user_id', userId)

    if (error) {
      console.error('Error removing assignment assignee:', error)
      throw error
    }
  }

  // Update assignees for an assignment (replaces all existing assignees)
  async updateAssignees(assignmentId: string, assignees: Array<{
    user_id: string
    user_name: string
    user_email?: string
  }>): Promise<void> {
    // First, get current assignees
    const currentAssignees = await this.getAssignmentAssignees(assignmentId)
    
    // Delete all current assignees
    if (currentAssignees.length > 0) {
      const { error } = await supabase
        .from('assignment_assignees')
        .delete()
        .eq('assignment_id', assignmentId)

      if (error) {
        console.error('Error removing current assignees:', error)
        throw error
      }
    }

    // Add new assignees
    await this.addAssignees(assignmentId, assignees)
  }
}

export const assignmentService = new AssignmentService()
