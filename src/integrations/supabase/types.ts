export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      pre_trade_checks: {
        Row: {
          can_trade: boolean
          created_at: string
          daily_loss_remaining: number
          discipline_score: number
          id: string
          is_cleared: boolean
          max_risk_allowed: number
          planned_risk: number
          trades_remaining: number
          user_id: string
          violation_reason: string | null
        }
        Insert: {
          can_trade: boolean
          created_at?: string
          daily_loss_remaining: number
          discipline_score: number
          id?: string
          is_cleared: boolean
          max_risk_allowed: number
          planned_risk: number
          trades_remaining: number
          user_id: string
          violation_reason?: string | null
        }
        Update: {
          can_trade?: boolean
          created_at?: string
          daily_loss_remaining?: number
          discipline_score?: number
          id?: string
          is_cleared?: boolean
          max_risk_allowed?: number
          planned_risk?: number
          trades_remaining?: number
          user_id?: string
          violation_reason?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          discipline_score: number
          discipline_status: string
          display_name: string | null
          email: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          discipline_score?: number
          discipline_status?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          discipline_score?: number
          discipline_status?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      trade_entries: {
        Row: {
          created_at: string
          emotional_state: number
          followed_rules: boolean
          id: string
          notes: string | null
          risk_reward: number
          risk_used: number
          trade_date: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emotional_state: number
          followed_rules: boolean
          id?: string
          notes?: string | null
          risk_reward: number
          risk_used: number
          trade_date?: string
          user_id: string
        }
        Update: {
          created_at?: string
          emotional_state?: number
          followed_rules?: boolean
          id?: string
          notes?: string | null
          risk_reward?: number
          risk_used?: number
          trade_date?: string
          user_id?: string
        }
        Relationships: []
      }
      trading_rules: {
        Row: {
          allowed_sessions: string[]
          created_at: string
          forbidden_behaviors: string[]
          id: string
          max_daily_loss: number
          max_risk_per_trade: number
          max_trades_per_day: number
          updated_at: string
          user_id: string
        }
        Insert: {
          allowed_sessions?: string[]
          created_at?: string
          forbidden_behaviors?: string[]
          id?: string
          max_daily_loss?: number
          max_risk_per_trade?: number
          max_trades_per_day?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          allowed_sessions?: string[]
          created_at?: string
          forbidden_behaviors?: string[]
          id?: string
          max_daily_loss?: number
          max_risk_per_trade?: number
          max_trades_per_day?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          subscription_expires_at: string | null
          subscription_started_at: string | null
          subscription_status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          subscription_expires_at?: string | null
          subscription_started_at?: string | null
          subscription_status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          subscription_expires_at?: string | null
          subscription_started_at?: string | null
          subscription_status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      vault_daily_checklist: {
        Row: {
          completed: boolean
          created_at: string
          date: string
          emotional_control: number
          id: string
          mental_state: number
          plan_reviewed: boolean
          risk_confirmed: boolean
          sleep_quality: number
          user_id: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          date?: string
          emotional_control: number
          id?: string
          mental_state: number
          plan_reviewed?: boolean
          risk_confirmed?: boolean
          sleep_quality: number
          user_id: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          date?: string
          emotional_control?: number
          id?: string
          mental_state?: number
          plan_reviewed?: boolean
          risk_confirmed?: boolean
          sleep_quality?: number
          user_id?: string
        }
        Relationships: []
      }
      vault_events: {
        Row: {
          created_at: string
          event_context: Json | null
          event_type: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_context?: Json | null
          event_type: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_context?: Json | null
          event_type?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_discipline_metrics: {
        Args: { _user_id: string }
        Returns: {
          can_trade: boolean
          discipline_score: number
          discipline_status: string
          streak_days: number
          trades_today: number
          violations_today: number
        }[]
      }
      calculate_position_size: {
        Args: {
          _account_size: number
          _risk_percent: number
          _stop_loss_percent: number
          _user_id: string
        }
        Returns: {
          adaptive_risk_limit: number
          allowed: boolean
          max_loss_amount: number
          position_size: number
          reason: string
          requested_risk: number
        }[]
      }
      calculate_vault_level: {
        Args: { _user_id: string }
        Returns: {
          level_rank: string
          level_title: string
          next_level_title: string
          progress_percent: number
          vault_level: number
          vault_xp: number
          xp_to_next_level: number
        }[]
      }
      calculate_vault_score: {
        Args: { _user_id: string }
        Returns: {
          adherence_component: number
          discipline_component: number
          emotion_component: number
          risk_component: number
          score: number
          tier: string
          trend: string
          violation_component: number
        }[]
      }
      check_trade_permission: {
        Args: { _user_id: string }
        Returns: {
          can_trade: boolean
          daily_loss_remaining: number
          discipline_score: number
          discipline_status: string
          max_risk_per_trade: number
          reason: string
          trades_remaining: number
        }[]
      }
      complete_daily_checklist: {
        Args: {
          _emotional_control: number
          _mental_state: number
          _plan_reviewed: boolean
          _risk_confirmed: boolean
          _sleep_quality: number
          _user_id: string
        }
        Returns: {
          checklist_id: string
          message: string
          success: boolean
        }[]
      }
      get_adaptive_risk_limit: {
        Args: { _user_id: string }
        Returns: {
          adaptive_risk_limit: number
          adjustment_factor: number
          risk_level: string
        }[]
      }
      get_daily_vault_status: {
        Args: { _user_id: string }
        Returns: {
          checklist_id: string
          daily_checklist_completed: boolean
          discipline_score: number
          max_trades_allowed: number
          required_actions_remaining: number
          trades_taken_today: number
          vault_level: number
          vault_open: boolean
          vault_score: number
        }[]
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      get_vault_feedback: {
        Args: { _user_id: string }
        Returns: {
          feedback_message: string
          feedback_type: string
          priority: number
          recommended_action: string
        }[]
      }
      get_vault_identity: {
        Args: { _user_id: string }
        Returns: {
          next_rank: string
          progress_percent: number
          rank_color: string
          vault_level: number
          vault_rank: string
          vault_score: number
          vault_title: string
        }[]
      }
      get_vault_mistake_analysis: {
        Args: { _user_id: string }
        Returns: {
          description: string
          impact_score: number
          mistake_type: string
          recommended_fix: string
          severity: string
        }[]
      }
      get_vault_recovery_plan: {
        Args: { _user_id: string }
        Returns: {
          estimated_unlock_time: string
          is_locked: boolean
          lock_reason: string
          next_required_action: string
          recovery_progress_percent: number
          recovery_tasks_completed: number
          recovery_tasks_required: number
          tasks: Json
        }[]
      }
      get_vault_state: {
        Args: { _user_id: string }
        Returns: {
          can_trade: boolean
          discipline_rank: string
          discipline_score: number
          risk_level: string
          state_reason: string
          vault_state: string
        }[]
      }
      get_vault_status: {
        Args: { _user_id: string }
        Returns: {
          can_trade: boolean
          daily_loss_remaining: number
          daily_loss_used: number
          discipline_rank: string
          discipline_score: number
          discipline_status: string
          max_daily_loss: number
          max_risk_per_trade: number
          max_trades_per_day: number
          reason: string
          streak_days: number
          trades_remaining: number
          trades_today: number
        }[]
      }
      get_vault_timeline: {
        Args: { _limit?: number; _user_id: string }
        Returns: {
          created_at: string
          event_context: Json
          event_id: string
          event_type: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      log_vault_event: {
        Args: { _event_context?: Json; _event_type: string; _user_id: string }
        Returns: string
      }
    }
    Enums: {
      app_role:
        | "free"
        | "vault_os_owner"
        | "vault_access"
        | "vault_intelligence"
        | "operator"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "free",
        "vault_os_owner",
        "vault_access",
        "vault_intelligence",
        "operator",
      ],
    },
  },
} as const
