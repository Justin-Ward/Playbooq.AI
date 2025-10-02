export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      playbooks: {
        Row: {
          id: string
          title: string
          description: string | null
          content: Json
          owner_id: string
          is_public: boolean
          is_template: boolean
          tags: string[]
          category: string
          version: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title?: string
          description?: string | null
          content?: Json
          owner_id: string
          is_public?: boolean
          is_template?: boolean
          tags?: string[]
          category?: string
          version?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          content?: Json
          owner_id?: string
          is_public?: boolean
          is_template?: boolean
          tags?: string[]
          category?: string
          version?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      playbook_collaborators: {
        Row: {
          id: string
          playbook_id: string
          user_id: string
          permission: 'read' | 'write' | 'admin'
          created_at: string
        }
        Insert: {
          id?: string
          playbook_id: string
          user_id: string
          permission: 'read' | 'write' | 'admin'
          created_at?: string
        }
        Update: {
          id?: string
          playbook_id?: string
          user_id?: string
          permission?: 'read' | 'write' | 'admin'
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "playbook_collaborators_playbook_id_fkey"
            columns: ["playbook_id"]
            isOneToOne: false
            referencedRelation: "playbooks"
            referencedColumns: ["id"]
          }
        ]
      }
      playbook_executions: {
        Row: {
          id: string
          playbook_id: string
          executor_id: string
          status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
          input_data: Json
          output_data: Json
          error_message: string | null
          started_at: string
          completed_at: string | null
          execution_time_ms: number | null
        }
        Insert: {
          id?: string
          playbook_id: string
          executor_id: string
          status?: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
          input_data?: Json
          output_data?: Json
          error_message?: string | null
          started_at?: string
          completed_at?: string | null
          execution_time_ms?: number | null
        }
        Update: {
          id?: string
          playbook_id?: string
          executor_id?: string
          status?: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
          input_data?: Json
          output_data?: Json
          error_message?: string | null
          started_at?: string
          completed_at?: string | null
          execution_time_ms?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "playbook_executions_playbook_id_fkey"
            columns: ["playbook_id"]
            isOneToOne: false
            referencedRelation: "playbooks"
            referencedColumns: ["id"]
          }
        ]
      }
      user_profiles: {
        Row: {
          id: string
          display_name: string | null
          bio: string | null
          avatar_url: string | null
          preferences: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          display_name?: string | null
          bio?: string | null
          avatar_url?: string | null
          preferences?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          display_name?: string | null
          bio?: string | null
          avatar_url?: string | null
          preferences?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_playbooks: {
        Args: {
          user_id: string
        }
        Returns: {
          id: string
          title: string
          description: string
          owner_id: string
          is_public: boolean
          category: string
          tags: string[]
          created_at: string
          updated_at: string
          permission: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

// Convenience types for common operations
export type Playbook = Tables<'playbooks'>
export type PlaybookInsert = TablesInsert<'playbooks'>
export type PlaybookUpdate = TablesUpdate<'playbooks'>

export type PlaybookCollaborator = Tables<'playbook_collaborators'>
export type PlaybookCollaboratorInsert = TablesInsert<'playbook_collaborators'>
export type PlaybookCollaboratorUpdate = TablesUpdate<'playbook_collaborators'>

export type PlaybookExecution = Tables<'playbook_executions'>
export type PlaybookExecutionInsert = TablesInsert<'playbook_executions'>
export type PlaybookExecutionUpdate = TablesUpdate<'playbook_executions'>

export type UserProfile = Tables<'user_profiles'>
export type UserProfileInsert = TablesInsert<'user_profiles'>
export type UserProfileUpdate = TablesUpdate<'user_profiles'>

// Extended types with relationships
export type PlaybookWithDetails = Playbook & {
  collaborators?: PlaybookCollaborator[]
  executions?: PlaybookExecution[]
  owner_profile?: UserProfile
}

export type PlaybookExecutionWithDetails = PlaybookExecution & {
  playbook?: Playbook
  executor_profile?: UserProfile
}

// Permission types
export type Permission = 'read' | 'write' | 'admin'
export type ExecutionStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'

// Playbook content structure (can be extended)
export interface PlaybookContent {
  steps?: PlaybookStep[]
  variables?: Record<string, any>
  metadata?: Record<string, any>
}

export interface PlaybookStep {
  id: string
  type: 'text' | 'input' | 'ai_prompt' | 'condition' | 'action' | 'output'
  title?: string
  description?: string
  content: any
  config?: Record<string, any>
  next_step_id?: string | null
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T = any> extends ApiResponse<T[]> {
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}
