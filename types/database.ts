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
          short_id: string | null
          title: string
          description: string | null
          content: Json
          user_id: string
          is_public: boolean
          is_template: boolean
          tags: string[]
          category: string
          version: number
          created_at: string
          updated_at: string
          is_marketplace: boolean
          price: number
          preview_content: Json | null
          total_purchases: number
          average_rating: number
        }
        Insert: {
          id?: string
          short_id?: string | null
          title?: string
          description?: string | null
          content?: Json
          user_id: string
          is_public?: boolean
          is_template?: boolean
          tags?: string[]
          category?: string
          version?: number
          created_at?: string
          updated_at?: string
          is_marketplace?: boolean
          price?: number
          preview_content?: Json | null
          total_purchases?: number
          average_rating?: number
        }
        Update: {
          id?: string
          short_id?: string | null
          title?: string
          description?: string | null
          content?: Json
          user_id?: string
          is_public?: boolean
          is_template?: boolean
          tags?: string[]
          category?: string
          version?: number
          created_at?: string
          updated_at?: string
          is_marketplace?: boolean
          price?: number
          preview_content?: Json | null
          total_purchases?: number
          average_rating?: number
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
          short_id: string | null
          display_name: string | null
          bio: string | null
          avatar_url: string | null
          preferences: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          short_id?: string | null
          display_name?: string | null
          bio?: string | null
          avatar_url?: string | null
          preferences?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          short_id?: string | null
          display_name?: string | null
          bio?: string | null
          avatar_url?: string | null
          preferences?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      collaborators: {
        Row: {
          id: string
          playbook_id: string
          user_id: string
          user_email: string
          user_name: string | null
          permission_level: 'owner' | 'edit' | 'view'
          invited_by: string
          invited_at: string
          accepted_at: string | null
          status: 'pending' | 'accepted' | 'declined'
        }
        Insert: {
          id?: string
          playbook_id: string
          user_id: string
          user_email: string
          user_name?: string | null
          permission_level: 'owner' | 'edit' | 'view'
          invited_by: string
          invited_at?: string
          accepted_at?: string | null
          status?: 'pending' | 'accepted' | 'declined'
        }
        Update: {
          id?: string
          playbook_id?: string
          user_id?: string
          user_email?: string
          user_name?: string | null
          permission_level?: 'owner' | 'edit' | 'view'
          invited_by?: string
          invited_at?: string
          accepted_at?: string | null
          status?: 'pending' | 'accepted' | 'declined'
        }
        Relationships: [
          {
            foreignKeyName: "collaborators_playbook_id_fkey"
            columns: ["playbook_id"]
            isOneToOne: false
            referencedRelation: "playbooks"
            referencedColumns: ["id"]
          }
        ]
      }
      chat_messages: {
        Row: {
          id: string
          playbook_id: string
          user_id: string
          user_name: string
          user_avatar: string | null
          message: string
          created_at: string
          edited_at: string | null
          deleted: boolean
        }
        Insert: {
          id?: string
          playbook_id: string
          user_id: string
          user_name: string
          user_avatar?: string | null
          message: string
          created_at?: string
          edited_at?: string | null
          deleted?: boolean
        }
        Update: {
          id?: string
          playbook_id?: string
          user_id?: string
          user_name?: string
          user_avatar?: string | null
          message?: string
          created_at?: string
          edited_at?: string | null
          deleted?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_playbook_id_fkey"
            columns: ["playbook_id"]
            isOneToOne: false
            referencedRelation: "playbooks"
            referencedColumns: ["id"]
          }
        ]
      }
      marketplace_ratings: {
        Row: {
          id: string
          playbook_id: string
          user_id: string
          rating: number
          review: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          playbook_id: string
          user_id: string
          rating: number
          review?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          playbook_id?: string
          user_id?: string
          rating?: number
          review?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_ratings_playbook_id_fkey"
            columns: ["playbook_id"]
            isOneToOne: false
            referencedRelation: "playbooks"
            referencedColumns: ["id"]
          }
        ]
      }
      playbook_purchases: {
        Row: {
          id: string
          playbook_id: string
          user_id: string
          purchased_at: string
          price_paid: number | null
        }
        Insert: {
          id?: string
          playbook_id: string
          user_id: string
          purchased_at?: string
          price_paid?: number | null
        }
        Update: {
          id?: string
          playbook_id?: string
          user_id?: string
          purchased_at?: string
          price_paid?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "playbook_purchases_playbook_id_fkey"
            columns: ["playbook_id"]
            isOneToOne: false
            referencedRelation: "playbooks"
            referencedColumns: ["id"]
          }
        ]
      }
      purchases: {
        Row: {
          id: string
          playbook_id: string
          buyer_id: string
          seller_id: string
          amount_total: number
          platform_fee: number
          seller_amount: number
          stripe_payment_intent_id: string | null
          payout_status: 'pending' | 'completed' | 'failed'
          payout_date: string | null
          created_at: string
        }
        Insert: {
          id?: string
          playbook_id: string
          buyer_id: string
          seller_id: string
          amount_total: number
          platform_fee: number
          seller_amount: number
          stripe_payment_intent_id?: string | null
          payout_status?: 'pending' | 'completed' | 'failed'
          payout_date?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          playbook_id?: string
          buyer_id?: string
          seller_id?: string
          amount_total?: number
          platform_fee?: number
          seller_amount?: number
          stripe_payment_intent_id?: string | null
          payout_status?: 'pending' | 'completed' | 'failed'
          payout_date?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchases_playbook_id_fkey"
            columns: ["playbook_id"]
            isOneToOne: false
            referencedRelation: "playbooks"
            referencedColumns: ["id"]
          }
        ]
      }
      playbook_favorites: {
        Row: {
          id: string
          playbook_id: string
          user_id: string
          favorited_at: string
        }
        Insert: {
          id?: string
          playbook_id: string
          user_id: string
          favorited_at?: string
        }
        Update: {
          id?: string
          playbook_id?: string
          user_id?: string
          favorited_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "playbook_favorites_playbook_id_fkey"
            columns: ["playbook_id"]
            isOneToOne: false
            referencedRelation: "playbooks"
            referencedColumns: ["id"]
          }
        ]
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
          user_id: string
          is_public: boolean
          category: string
          tags: string[]
          created_at: string
          updated_at: string
          permission: string
        }[]
      }
      invite_collaborator: {
        Args: {
          p_playbook_id: string
          p_user_email: string
          p_user_name: string
          p_permission_level: string
        }
        Returns: string
      }
      accept_collaboration: {
        Args: {
          p_collaborator_id: string
        }
        Returns: boolean
      }
      get_playbook_collaborators: {
        Args: {
          p_playbook_id: string
        }
        Returns: {
          id: string
          user_id: string
          user_email: string
          user_name: string | null
          permission_level: string
          invited_by: string
          invited_at: string
          accepted_at: string | null
          status: string
        }[]
      }
      get_playbook_chat_messages: {
        Args: {
          p_playbook_id: string
          p_limit?: number
          p_offset?: number
        }
        Returns: {
          id: string
          user_id: string
          user_name: string
          user_avatar: string | null
          message: string
          created_at: string
          edited_at: string | null
          deleted: boolean
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

export type Collaborator = Tables<'collaborators'>
export type CollaboratorInsert = TablesInsert<'collaborators'>
export type CollaboratorUpdate = TablesUpdate<'collaborators'>

export type ChatMessage = Tables<'chat_messages'>
export type ChatMessageInsert = TablesInsert<'chat_messages'>
export type ChatMessageUpdate = TablesUpdate<'chat_messages'>

export type MarketplaceRating = Tables<'marketplace_ratings'>
export type MarketplaceRatingInsert = TablesInsert<'marketplace_ratings'>
export type MarketplaceRatingUpdate = TablesUpdate<'marketplace_ratings'>

export type PlaybookPurchase = Tables<'playbook_purchases'>
export type PlaybookPurchaseInsert = TablesInsert<'playbook_purchases'>
export type PlaybookPurchaseUpdate = TablesUpdate<'playbook_purchases'>

export type Purchase = Tables<'purchases'>
export type PurchaseInsert = TablesInsert<'purchases'>
export type PurchaseUpdate = TablesUpdate<'purchases'>

export type PlaybookFavorite = Tables<'playbook_favorites'>
export type PlaybookFavoriteInsert = TablesInsert<'playbook_favorites'>
export type PlaybookFavoriteUpdate = TablesUpdate<'playbook_favorites'>

// Extended types with relationships
export type PlaybookWithDetails = Playbook & {
  collaborators?: PlaybookCollaborator[]
  new_collaborators?: Collaborator[]
  chat_messages?: ChatMessage[]
  executions?: PlaybookExecution[]
  owner_profile?: UserProfile
}

export type PlaybookExecutionWithDetails = PlaybookExecution & {
  playbook?: Playbook
  executor_profile?: UserProfile
}

// Permission types
export type Permission = 'read' | 'write' | 'admin'
export type CollaborationPermission = 'owner' | 'edit' | 'view'
export type CollaborationStatus = 'pending' | 'accepted' | 'declined'
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

// Collaboration-specific types
export interface CollaborationInvite {
  playbookId: string
  userEmail: string
  userName: string
  permissionLevel: CollaborationPermission
}

export interface ChatMessageWithUser extends ChatMessage {
  user_profile?: UserProfile
}

export interface CollaboratorWithProfile extends Collaborator {
  user_profile?: UserProfile
  inviter_profile?: UserProfile
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

// Marketplace-specific types
export type PayoutStatus = 'pending' | 'completed' | 'failed'

export interface MarketplacePlaybook extends Playbook {
  is_marketplace: true
  price: number
  preview_content: Json | null
  total_purchases: number
  average_rating: number
}

export interface PlaybookWithRatings extends Playbook {
  ratings?: MarketplaceRating[]
  user_rating?: MarketplaceRating
  purchase_count?: number
  is_favorited?: boolean
}

export interface MarketplaceSearchFilters {
  category?: string
  minPrice?: number
  maxPrice?: number
  minRating?: number
  tags?: string[]
  sortBy?: 'price' | 'rating' | 'purchases' | 'created_at'
  sortOrder?: 'asc' | 'desc'
}

export interface PurchaseWithDetails extends Purchase {
  playbook?: Playbook
  buyer_profile?: UserProfile
  seller_profile?: UserProfile
}

export interface RatingWithUser extends MarketplaceRating {
  user_profile?: UserProfile
}

// Payment-related types
export interface PaymentIntent {
  id: string
  amount: number
  currency: string
  status: string
  client_secret: string
}

export interface CheckoutSession {
  id: string
  url: string
  amount_total: number
  currency: string
}

// Favorites-related types
export interface FavoriteWithPlaybook extends PlaybookFavorite {
  playbook?: Playbook
}

export interface MarketplacePlaybookWithStatus extends MarketplacePlaybook {
  is_favorited?: boolean
  is_purchased?: boolean
  user_rating?: MarketplaceRating
}
