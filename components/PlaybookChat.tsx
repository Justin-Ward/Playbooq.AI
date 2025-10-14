'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { ChevronDown, ChevronUp, Send, MoreVertical, Edit2, Trash2, Volume2, VolumeX } from 'lucide-react'

interface ChatMessage {
  id: string
  playbook_id: string
  user_id: string
  user_name: string
  user_avatar?: string | null
  message: string
  created_at: string
  edited_at?: string | null
  deleted: boolean
}

interface TypingUser {
  user_id: string
  user_name: string
  timestamp: number
}

interface PlaybookChatProps {
  playbookId: string
  currentUser: {
    id: string
    name: string
    email: string
    avatar?: string
  }
  permissionLevel: 'owner' | 'edit' | 'view'
  isOpen: boolean
  onToggle: () => void
}

export default function PlaybookChat({
  playbookId,
  currentUser,
  permissionLevel,
  isOpen,
  onToggle
}: PlaybookChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([])
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set())
  const [unreadCount, setUnreadCount] = useState(0)
  const [isTyping, setIsTyping] = useState(false)
  const [isSoundEnabled, setIsSoundEnabled] = useState(true)
  const [editingMessage, setEditingMessage] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [showMoreMessages, setShowMoreMessages] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout>()

  // Scroll to bottom of messages
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  // Load initial messages
  const loadMessages = useCallback(async (limit = 50) => {
    try {
      setIsLoading(true)
      setError(null)

      console.log('Loading messages for playbook:', playbookId)
      
      // Check if table exists first
      console.log('Checking if chat_messages table exists...')
      const { data: tableCheck, error: tableError } = await supabase
        .from('chat_messages')
        .select('id')
        .limit(1)

      if (tableError) {
        console.error('Table check error:', tableError)
        console.error('Table check error details:', {
          message: tableError.message,
          details: tableError.details,
          hint: tableError.hint,
          code: tableError.code
        })
        if (tableError.message?.includes('relation "chat_messages" does not exist')) {
          setError('Chat messages table not found. Please run the setup script in your Supabase database.')
          return
        }
        throw tableError
      }
      
      console.log('Table exists, checking structure...')

      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('playbook_id', playbookId)
        .eq('deleted', false)
        .order('created_at', { ascending: true })
        .limit(limit)

      if (error) {
        console.error('Error loading messages:', error)
        throw error
      }

      setMessages((data || []) as ChatMessage[])
      
      // Mark messages as read
      setUnreadCount(0)
      
      // Scroll to bottom after a brief delay to ensure DOM is updated
      setTimeout(scrollToBottom, 100)
    } catch (err: any) {
      console.error('Error loading messages:', err)
      setError(err.message || 'Failed to load messages')
    } finally {
      setIsLoading(false)
    }
  }, [playbookId, supabase, scrollToBottom])

  // Send message
  const sendMessage = useCallback(async (messageText: string, isEdit = false, messageId?: string) => {
    if (!messageText.trim()) return

    // Check if this is a temporary playbook (can't send messages to temp playbooks)
    if (playbookId.startsWith('temp-')) {
      setError('Cannot send messages for temporary playbooks. Please save the playbook first.')
      return
    }

    if (!playbookId) {
      setError('No playbook selected')
      return
    }

    if (!currentUser.id) {
      setError('User not authenticated')
      return
    }

    const tempId = `temp-${Date.now()}`
    const messageData = {
      playbook_id: playbookId,
      user_id: currentUser.id,
      user_name: currentUser.name,
      user_avatar: currentUser.avatar || null,
      message: messageText.trim(),
      deleted: false
    }

    if (isEdit && messageId) {
      // Edit existing message
      const optimisticMessage = {
        ...messageData,
        id: messageId,
        edited_at: new Date().toISOString()
      } as ChatMessage

      setMessages(prev => prev.map(msg => 
        msg.id === messageId ? optimisticMessage : msg
      ))

      try {
        const { error } = await supabase
          .from('chat_messages')
          .update({
            message: messageText.trim(),
            edited_at: new Date().toISOString()
          })
          .eq('id', messageId)
          .eq('user_id', currentUser.id)

        if (error) throw error

        setEditingMessage(null)
        setEditText('')
      } catch (err: any) {
        console.error('Error editing message:', err)
        // Revert optimistic update
        loadMessages()
      }
    } else {
      // Send new message
      const optimisticMessage = {
        ...messageData,
        id: tempId,
        created_at: new Date().toISOString()
      } as ChatMessage

      // Optimistic update
      setMessages(prev => [...prev, optimisticMessage as ChatMessage])
      scrollToBottom()

      try {
        console.log('Attempting to insert message:', messageData)
        console.log('Message data type:', typeof messageData)
        console.log('Message data keys:', Object.keys(messageData))
        
        const { data, error } = await supabase
          .from('chat_messages')
          .insert(messageData)
          .select()
          .single()

        console.log('Insert result - data:', data)
        console.log('Insert result - error:', error)
        console.log('Insert result - error type:', typeof error)
        console.log('Insert result - error keys:', error ? Object.keys(error) : 'no error')

        if (error) {
          console.error('Supabase insert error details:', {
            error,
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code
          })
          throw error
        }

        // Replace optimistic message with real one
        setMessages(prev => prev.map(msg => 
          msg.id === tempId ? (data as ChatMessage) : msg
        ))

        // Play notification sound for others (not for own message)
        if (isSoundEnabled) {
          playNotificationSound()
        }
      } catch (err: any) {
        console.error('Error sending message:', err)
        // Remove optimistic message
        setMessages(prev => prev.filter(msg => msg.id !== tempId))
        setError(err.message || 'Failed to send message')
      }
    }

    setNewMessage('')
  }, [playbookId, currentUser, supabase, scrollToBottom, isSoundEnabled])

  // Delete message (soft delete)
  const deleteMessage = useCallback(async (messageId: string) => {
    try {
      const { error } = await supabase
        .from('chat_messages')
        .update({ deleted: true })
        .eq('id', messageId)
        .eq('user_id', currentUser.id)

      if (error) throw error

      setMessages(prev => prev.filter(msg => msg.id !== messageId))
    } catch (err: any) {
      console.error('Error deleting message:', err)
      setError(err.message || 'Failed to delete message')
    }
  }, [supabase, currentUser.id])

  // Handle typing indicator
  const handleTyping = useCallback(() => {
    if (isTyping) return

    setIsTyping(true)
    
    // Broadcast typing event
    supabase
      .channel('typing')
      .send({
        type: 'broadcast',
        event: 'typing',
        payload: {
          user_id: currentUser.id,
          user_name: currentUser.name,
          playbook_id: playbookId
        }
      })

    // Clear typing after 3 seconds
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }
    
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false)
    }, 3000)
  }, [isTyping, currentUser, playbookId, supabase])

  // Handle input change
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewMessage(e.target.value)
    handleTyping()
  }, [handleTyping])

  // Handle key press
  const handleKeyPress = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(newMessage)
    }
  }, [newMessage, sendMessage])

  // Play notification sound
  const playNotificationSound = useCallback(() => {
    try {
      const audio = new Audio('/notification.mp3') // You'll need to add this file to public/
      audio.volume = 0.3
      audio.play().catch(() => {
        // Ignore errors if audio can't play
      })
    } catch (err) {
      // Ignore errors
    }
  }, [])

  // Format timestamp
  const formatTimestamp = useCallback((timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffMins < 1) return 'now'
    if (diffMins < 60) return `${diffMins}m`
    if (diffHours < 24) return `${diffHours}h`
    if (diffDays < 7) return `${diffDays}d`
    
    return date.toLocaleDateString()
  }, [])

  // Set up chat initialization (without realtime for now)
  useEffect(() => {
    if (!isOpen || !playbookId) return

    // Load initial messages only once
    const initializeChat = async () => {
      await loadMessages()
    }
    initializeChat()

    // TODO: Re-enable realtime subscriptions once WebSocket issues are resolved
    // For now, we'll just load messages without real-time updates

    // Cleanup
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
    }
  }, [isOpen, playbookId])

  // Clean up typing indicator
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
    }
  }, [])

  const canSendMessages = permissionLevel !== 'view'
  const onlineCount = onlineUsers.size

  return (
    <div className="border-t border-gray-200 flex-shrink-0">
      {/* Header - Always visible */}
      <button
        onClick={onToggle}
        className="w-full p-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="p-1 bg-green-100 rounded">
            <svg className="h-4 w-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-gray-900">Collaborator Chat</h3>
            {unreadCount > 0 && (
              <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5 min-w-[20px] text-center">
                {unreadCount}
              </span>
            )}
            {onlineCount > 0 && (
              <span className="text-xs text-gray-500">
                {onlineCount} online
              </span>
            )}
          </div>
        </div>
        {isOpen ? (
          <ChevronDown className="h-4 w-4 text-gray-500" />
        ) : (
          <ChevronUp className="h-4 w-4 text-gray-500" />
        )}
      </button>

      {/* Expanded Chat */}
      {isOpen && (
        <div className="flex flex-col h-80 bg-white border-t border-gray-200">
          {/* Chat Header */}
          <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-medium text-gray-900">Chat</h4>
              {unreadCount > 0 && (
                <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5">
                  {unreadCount}
                </span>
              )}
              <span className="text-xs text-gray-500">
                {onlineCount} online
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsSoundEnabled(!isSoundEnabled)}
                className="p-1 hover:bg-gray-200 rounded transition-colors"
                title={isSoundEnabled ? 'Disable sounds' : 'Enable sounds'}
              >
                {isSoundEnabled ? (
                  <Volume2 className="h-4 w-4 text-gray-600" />
                ) : (
                  <VolumeX className="h-4 w-4 text-gray-400" />
                )}
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center h-32">
                <span className="text-sm text-red-600">{error}</span>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex items-center justify-center h-32">
                <span className="text-sm text-gray-500">No messages yet. Start the conversation!</span>
              </div>
            ) : (
              <>
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.user_id === currentUser.id ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-3 py-2 rounded-lg ${
                        message.user_id === currentUser.id
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-900'
                      }`}
                    >
                      {message.user_id !== currentUser.id && (
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center">
                            <span className="text-xs font-medium text-gray-600">
                              {message.user_name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <span className="text-xs font-medium text-gray-700">{message.user_name}</span>
                        </div>
                      )}
                      
                      {editingMessage === message.id ? (
                        <div className="space-y-2">
                          <textarea
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            className="w-full p-2 text-sm border border-gray-300 rounded resize-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                            rows={2}
                            autoFocus
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => sendMessage(editText, true, message.id)}
                              className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => {
                                setEditingMessage(null)
                                setEditText('')
                              }}
                              className="px-2 py-1 bg-gray-300 text-gray-700 text-xs rounded hover:bg-gray-400 transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="group relative">
                          <p className="text-sm whitespace-pre-wrap">{message.message}</p>
                          <div className="flex items-center gap-1 mt-1">
                            <span className={`text-xs ${message.user_id === currentUser.id ? 'text-blue-200' : 'text-gray-500'}`}>
                              {formatTimestamp(message.created_at)}
                            </span>
                            {message.edited_at && (
                              <span className={`text-xs ${message.user_id === currentUser.id ? 'text-blue-200' : 'text-gray-500'}`}>
                                (edited)
                              </span>
                            )}
                          </div>
                          
                          {message.user_id === currentUser.id && (
                            <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity">
                              <div className="flex gap-1">
                                <button
                                  onClick={() => {
                                    setEditingMessage(message.id)
                                    setEditText(message.message)
                                  }}
                                  className="p-1 bg-white bg-opacity-20 hover:bg-opacity-30 rounded transition-colors"
                                  title="Edit message"
                                >
                                  <Edit2 className="h-3 w-3" />
                                </button>
                                <button
                                  onClick={() => deleteMessage(message.id)}
                                  className="p-1 bg-white bg-opacity-20 hover:bg-opacity-30 rounded transition-colors"
                                  title="Delete message"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {/* Typing indicator */}
                {typingUsers.length > 0 && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 text-gray-600 px-3 py-2 rounded-lg">
                      <div className="flex items-center gap-2">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        </div>
                        <span className="text-xs">
                          {typingUsers.map(user => user.user_name).join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Input Area */}
          {canSendMessages ? (
            <div className="p-3 border-t border-gray-200 bg-gray-50">
              <div className="flex gap-2">
                <textarea
                  value={newMessage}
                  onChange={handleInputChange}
                  onKeyPress={handleKeyPress}
                  placeholder="Type a message... (Enter to send, Shift+Enter for new line)"
                  className="flex-1 p-2 text-sm border border-gray-300 rounded resize-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 max-h-20"
                  rows={1}
                  style={{
                    minHeight: '32px',
                    maxHeight: '80px',
                    height: 'auto',
                    overflowY: newMessage.split('\n').length > 5 ? 'auto' : 'hidden'
                  }}
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement
                    target.style.height = 'auto'
                    target.style.height = Math.min(target.scrollHeight, 80) + 'px'
                  }}
                />
                <button
                  onClick={() => sendMessage(newMessage)}
                  disabled={!newMessage.trim()}
                  className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="p-3 border-t border-gray-200 bg-gray-50 text-center">
              <span className="text-sm text-gray-500">View-only users cannot send messages</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
