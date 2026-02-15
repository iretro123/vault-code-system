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
      academy_lessons: {
        Row: {
          created_at: string
          id: string
          lesson_title: string
          module_slug: string
          module_title: string
          notes: string
          sort_order: number
          updated_at: string
          video_url: string
        }
        Insert: {
          created_at?: string
          id?: string
          lesson_title: string
          module_slug: string
          module_title: string
          notes?: string
          sort_order?: number
          updated_at?: string
          video_url: string
        }
        Update: {
          created_at?: string
          id?: string
          lesson_title?: string
          module_slug?: string
          module_title?: string
          notes?: string
          sort_order?: number
          updated_at?: string
          video_url?: string
        }
        Relationships: []
      }
      academy_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          room_slug: string
          user_id: string
          user_name: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          room_slug: string
          user_id: string
          user_name?: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          room_slug?: string
          user_id?: string
          user_name?: string
        }
        Relationships: []
      }
      academy_modules: {
        Row: {
          created_at: string
          id: string
          slug: string
          sort_order: number
          subtitle: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          slug: string
          sort_order?: number
          subtitle?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          slug?: string
          sort_order?: number
          subtitle?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      behavior_stats: {
        Row: {
          avg_trades_per_day: number
          block_rate: number
          id: string
          most_common_block: string | null
          red_day_rate: number
          total_blocks: number
          total_days_tracked: number
          total_red_days: number
          total_trades: number
          updated_at: string
          user_id: string
        }
        Insert: {
          avg_trades_per_day?: number
          block_rate?: number
          id?: string
          most_common_block?: string | null
          red_day_rate?: number
          total_blocks?: number
          total_days_tracked?: number
          total_red_days?: number
          total_trades?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          avg_trades_per_day?: number
          block_rate?: number
          id?: string
          most_common_block?: string | null
          red_day_rate?: number
          total_blocks?: number
          total_days_tracked?: number
          total_red_days?: number
          total_trades?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      coach_requests: {
        Row: {
          category: string
          created_at: string
          id: string
          message: string
          status: string
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          message: string
          status?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          message?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      coach_ticket_replies: {
        Row: {
          body: string
          created_at: string
          id: string
          is_admin: boolean
          ticket_id: string
          user_id: string
          user_name: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          is_admin?: boolean
          ticket_id: string
          user_id: string
          user_name?: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          is_admin?: boolean
          ticket_id?: string
          user_id?: string
          user_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_ticket_replies_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "coach_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_tickets: {
        Row: {
          category: string
          created_at: string
          id: string
          question: string
          screenshot_url: string | null
          status: string
          updated_at: string
          urgency: string
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          question: string
          screenshot_url?: string | null
          status?: string
          updated_at?: string
          urgency?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          question?: string
          screenshot_url?: string | null
          status?: string
          updated_at?: string
          urgency?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_memory: {
        Row: {
          account_balance: number
          created_at: string
          date: string
          final_vault_status: string
          id: string
          risk_mode: string
          risk_used: number
          session_paused: boolean
          trades_blocked: number
          trades_taken: number
          user_id: string
        }
        Insert: {
          account_balance?: number
          created_at?: string
          date?: string
          final_vault_status?: string
          id?: string
          risk_mode?: string
          risk_used?: number
          session_paused?: boolean
          trades_blocked?: number
          trades_taken?: number
          user_id: string
        }
        Update: {
          account_balance?: number
          created_at?: string
          date?: string
          final_vault_status?: string
          id?: string
          risk_mode?: string
          risk_used?: number
          session_paused?: boolean
          trades_blocked?: number
          trades_taken?: number
          user_id?: string
        }
        Relationships: []
      }
      instant_answers: {
        Row: {
          answer: string
          created_at: string
          id: string
          question: string
          user_id: string
        }
        Insert: {
          answer: string
          created_at?: string
          id?: string
          question: string
          user_id: string
        }
        Update: {
          answer?: string
          created_at?: string
          id?: string
          question?: string
          user_id?: string
        }
        Relationships: []
      }
      lesson_progress: {
        Row: {
          completed: boolean
          completed_at: string | null
          created_at: string
          id: string
          lesson_id: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          lesson_id: string
          user_id: string
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          lesson_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "academy_lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      live_sessions: {
        Row: {
          created_at: string
          description: string
          id: string
          join_url: string
          session_date: string
          session_type: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string
          id?: string
          join_url?: string
          session_date: string
          session_type?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          join_url?: string
          session_date?: string
          session_type?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      monthly_report: {
        Row: {
          avg_risk_per_trade: number
          avg_trades_per_day: number
          block_rate: number
          created_at: string
          days_traded: number
          green_days: number
          id: string
          insight_text: string | null
          mode_fit: string | null
          most_common_block_reason: string | null
          period_end: string
          period_start: string
          red_days: number
          risk_saved: number
          risk_used: number
          stability_score: number
          trades_blocked: number
          trades_taken: number
          user_id: string
          yellow_days: number
        }
        Insert: {
          avg_risk_per_trade?: number
          avg_trades_per_day?: number
          block_rate?: number
          created_at?: string
          days_traded?: number
          green_days?: number
          id?: string
          insight_text?: string | null
          mode_fit?: string | null
          most_common_block_reason?: string | null
          period_end: string
          period_start: string
          red_days?: number
          risk_saved?: number
          risk_used?: number
          stability_score?: number
          trades_blocked?: number
          trades_taken?: number
          user_id: string
          yellow_days?: number
        }
        Update: {
          avg_risk_per_trade?: number
          avg_trades_per_day?: number
          block_rate?: number
          created_at?: string
          days_traded?: number
          green_days?: number
          id?: string
          insight_text?: string | null
          mode_fit?: string | null
          most_common_block_reason?: string | null
          period_end?: string
          period_start?: string
          red_days?: number
          risk_saved?: number
          risk_used?: number
          stability_score?: number
          trades_blocked?: number
          trades_taken?: number
          user_id?: string
          yellow_days?: number
        }
        Relationships: []
      }
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
          academy_experience: string
          access_status: string
          account_balance: number
          avatar_url: string | null
          created_at: string
          default_trading_style: string
          discipline_score: number
          discipline_status: string
          display_name: string | null
          email: string | null
          first_lesson_started: boolean
          id: string
          initialized_at: string | null
          intro_posted: boolean
          market_type: string
          onboarding_completed: boolean
          phone_number: string | null
          role_level: string
          timezone: string
          updated_at: string
          user_id: string
          username: string | null
        }
        Insert: {
          academy_experience?: string
          access_status?: string
          account_balance?: number
          avatar_url?: string | null
          created_at?: string
          default_trading_style?: string
          discipline_score?: number
          discipline_status?: string
          display_name?: string | null
          email?: string | null
          first_lesson_started?: boolean
          id?: string
          initialized_at?: string | null
          intro_posted?: boolean
          market_type?: string
          onboarding_completed?: boolean
          phone_number?: string | null
          role_level?: string
          timezone?: string
          updated_at?: string
          user_id: string
          username?: string | null
        }
        Update: {
          academy_experience?: string
          access_status?: string
          account_balance?: number
          avatar_url?: string | null
          created_at?: string
          default_trading_style?: string
          discipline_score?: number
          discipline_status?: string
          display_name?: string | null
          email?: string | null
          first_lesson_started?: boolean
          id?: string
          initialized_at?: string | null
          intro_posted?: boolean
          market_type?: string
          onboarding_completed?: boolean
          phone_number?: string | null
          role_level?: string
          timezone?: string
          updated_at?: string
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      trade_entries: {
        Row: {
          created_at: string
          emotional_state: number
          followed_rules: boolean
          id: string
          instrument_type: string | null
          notes: string | null
          outcome: string | null
          risk_reward: number
          risk_used: number
          symbol: string | null
          trade_date: string
          user_id: string
          vault_verified: boolean
          vault_verified_at: string | null
        }
        Insert: {
          created_at?: string
          emotional_state: number
          followed_rules: boolean
          id?: string
          instrument_type?: string | null
          notes?: string | null
          outcome?: string | null
          risk_reward: number
          risk_used: number
          symbol?: string | null
          trade_date?: string
          user_id: string
          vault_verified?: boolean
          vault_verified_at?: string | null
        }
        Update: {
          created_at?: string
          emotional_state?: number
          followed_rules?: boolean
          id?: string
          instrument_type?: string | null
          notes?: string | null
          outcome?: string | null
          risk_reward?: number
          risk_used?: number
          symbol?: string | null
          trade_date?: string
          user_id?: string
          vault_verified?: boolean
          vault_verified_at?: string | null
        }
        Relationships: []
      }
      trade_intents: {
        Row: {
          actual_pnl: number | null
          block_reason: string | null
          closed_at: string | null
          contracts: number
          created_at: string
          direction: string
          estimated_risk: number
          id: string
          status: string
          user_id: string
        }
        Insert: {
          actual_pnl?: number | null
          block_reason?: string | null
          closed_at?: string | null
          contracts: number
          created_at?: string
          direction: string
          estimated_risk: number
          id?: string
          status?: string
          user_id: string
        }
        Update: {
          actual_pnl?: number | null
          block_reason?: string | null
          closed_at?: string | null
          contracts?: number
          created_at?: string
          direction?: string
          estimated_risk?: number
          id?: string
          status?: string
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
      vault_focus_sessions: {
        Row: {
          cooldown_after_loss_minutes: number
          created_at: string
          duration_minutes: number
          ends_at: string
          goals: string | null
          id: string
          max_trades: number
          started_at: string
          status: string
          trades_taken: number
          user_id: string
        }
        Insert: {
          cooldown_after_loss_minutes?: number
          created_at?: string
          duration_minutes: number
          ends_at: string
          goals?: string | null
          id?: string
          max_trades?: number
          started_at?: string
          status?: string
          trades_taken?: number
          user_id: string
        }
        Update: {
          cooldown_after_loss_minutes?: number
          created_at?: string
          duration_minutes?: number
          ends_at?: string
          goals?: string | null
          id?: string
          max_trades?: number
          started_at?: string
          status?: string
          trades_taken?: number
          user_id?: string
        }
        Relationships: []
      }
      vault_state: {
        Row: {
          account_balance: number
          created_at: string
          current_session_behavior: string
          daily_loss_limit: number
          date: string
          id: string
          last_activity_at: string | null
          last_block_reason: string | null
          loss_streak: number
          max_contracts_allowed: number
          max_trades_per_day: number
          open_trade: boolean
          risk_mode: string
          risk_remaining_today: number
          session_paused: boolean
          trades_remaining_today: number
          updated_at: string
          user_id: string
          vault_status: string
        }
        Insert: {
          account_balance?: number
          created_at?: string
          current_session_behavior?: string
          daily_loss_limit?: number
          date?: string
          id?: string
          last_activity_at?: string | null
          last_block_reason?: string | null
          loss_streak?: number
          max_contracts_allowed?: number
          max_trades_per_day?: number
          open_trade?: boolean
          risk_mode?: string
          risk_remaining_today?: number
          session_paused?: boolean
          trades_remaining_today?: number
          updated_at?: string
          user_id: string
          vault_status?: string
        }
        Update: {
          account_balance?: number
          created_at?: string
          current_session_behavior?: string
          daily_loss_limit?: number
          date?: string
          id?: string
          last_activity_at?: string | null
          last_block_reason?: string | null
          loss_streak?: number
          max_contracts_allowed?: number
          max_trades_per_day?: number
          open_trade?: boolean
          risk_mode?: string
          risk_remaining_today?: number
          session_paused?: boolean
          trades_remaining_today?: number
          updated_at?: string
          user_id?: string
          vault_status?: string
        }
        Relationships: []
      }
      weekly_report: {
        Row: {
          avg_risk_per_trade: number
          avg_trades_per_day: number
          block_rate: number
          created_at: string
          days_traded: number
          green_days: number
          id: string
          insight_text: string | null
          mode_fit: string | null
          most_common_block_reason: string | null
          period_end: string
          period_start: string
          red_days: number
          risk_saved: number
          risk_used: number
          stability_score: number
          trades_blocked: number
          trades_taken: number
          user_id: string
          yellow_days: number
        }
        Insert: {
          avg_risk_per_trade?: number
          avg_trades_per_day?: number
          block_rate?: number
          created_at?: string
          days_traded?: number
          green_days?: number
          id?: string
          insight_text?: string | null
          mode_fit?: string | null
          most_common_block_reason?: string | null
          period_end: string
          period_start: string
          red_days?: number
          risk_saved?: number
          risk_used?: number
          stability_score?: number
          trades_blocked?: number
          trades_taken?: number
          user_id: string
          yellow_days?: number
        }
        Update: {
          avg_risk_per_trade?: number
          avg_trades_per_day?: number
          block_rate?: number
          created_at?: string
          days_traded?: number
          green_days?: number
          id?: string
          insight_text?: string | null
          mode_fit?: string | null
          most_common_block_reason?: string | null
          period_end?: string
          period_start?: string
          red_days?: number
          risk_saved?: number
          risk_used?: number
          stability_score?: number
          trades_blocked?: number
          trades_taken?: number
          user_id?: string
          yellow_days?: number
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
      close_trade_intent: {
        Args: { _trade_result: number; _user_id: string }
        Returns: {
          message: string
          new_vault_status: string
          success: boolean
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
      complete_onboarding: {
        Args: {
          _balance: number
          _default_style: string
          _market_type: string
          _user_id: string
        }
        Returns: boolean
      }
      daily_vault_reset: { Args: never; Returns: undefined }
      detect_session_behavior: { Args: { _user_id: string }; Returns: string }
      generate_reports_for_user: {
        Args: { _period: string; _user_id: string }
        Returns: undefined
      }
      get_adaptive_risk_limit: {
        Args: { _user_id: string }
        Returns: {
          adaptive_risk_limit: number
          adjustment_factor: number
          consistency_modifier: number
          final_risk_limit: number
          protection_modifier: number
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
      get_eod_review: {
        Args: { _user_id: string }
        Returns: {
          final_vault_status: string
          risk_saved: number
          risk_used: number
          total_result: number
          trades_blocked: number
          trades_taken: number
        }[]
      }
      get_micro_feedback: { Args: { _user_id: string }; Returns: string }
      get_or_create_vault_state: {
        Args: { _user_id: string }
        Returns: {
          account_balance: number
          created_at: string
          current_session_behavior: string
          daily_loss_limit: number
          date: string
          id: string
          last_activity_at: string | null
          last_block_reason: string | null
          loss_streak: number
          max_contracts_allowed: number
          max_trades_per_day: number
          open_trade: boolean
          risk_mode: string
          risk_remaining_today: number
          session_paused: boolean
          trades_remaining_today: number
          updated_at: string
          user_id: string
          vault_status: string
        }[]
        SetofOptions: {
          from: "*"
          to: "vault_state"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      get_vault_consistency_status: {
        Args: { _user_id: string }
        Returns: {
          consistency_level: string
          consistency_score: number
          discipline_velocity: number
          emotional_stability: number
          intervention_required: boolean
          recommended_risk_modifier: number
          risk_velocity: number
          trend_direction: string
          violation_trend: number
        }[]
      }
      get_vault_execution_permission: {
        Args: { _user_id: string }
        Returns: {
          block_reason: string
          consistency_level: string
          cooldown_active: boolean
          cooldown_remaining_minutes: number
          discipline_status: string
          effective_risk_limit: number
          execution_allowed: boolean
          intervention_required: boolean
          protection_level: string
          vault_open: boolean
        }[]
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
      get_vault_focus_status: { Args: { _user_id: string }; Returns: Json }
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
      get_vault_protection_status: {
        Args: { _user_id: string }
        Returns: {
          discipline_deterioration_risk: boolean
          emotional_risk: boolean
          overtrading_risk: boolean
          protection_active: boolean
          protection_level: string
          protection_reason: string
          revenge_trading_risk: boolean
          risk_restriction_factor: number
          trade_cooldown_minutes: number
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
      get_vault_session_integrity: {
        Args: { _user_id: string }
        Returns: {
          integrity_percent: number
          trades_today: number
          verified_trades_today: number
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
      nightly_memory_aggregation: { Args: never; Returns: undefined }
      set_account_balance: {
        Args: { _balance: number; _user_id: string }
        Returns: {
          account_balance: number
          created_at: string
          current_session_behavior: string
          daily_loss_limit: number
          date: string
          id: string
          last_activity_at: string | null
          last_block_reason: string | null
          loss_streak: number
          max_contracts_allowed: number
          max_trades_per_day: number
          open_trade: boolean
          risk_mode: string
          risk_remaining_today: number
          session_paused: boolean
          trades_remaining_today: number
          updated_at: string
          user_id: string
          vault_status: string
        }[]
        SetofOptions: {
          from: "*"
          to: "vault_state"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      start_vault_focus_session: {
        Args: {
          cooldown_after_loss_minutes?: number
          duration_minutes: number
          goals?: string
          max_trades?: number
        }
        Returns: string
      }
      submit_trade_intent: {
        Args: {
          _contracts: number
          _direction: string
          _estimated_risk: number
          _user_id: string
        }
        Returns: {
          intent_id: string
          message: string
          success: boolean
        }[]
      }
      update_vault_risk_mode: {
        Args: { _risk_mode: string; _user_id: string }
        Returns: {
          account_balance: number
          created_at: string
          current_session_behavior: string
          daily_loss_limit: number
          date: string
          id: string
          last_activity_at: string | null
          last_block_reason: string | null
          loss_streak: number
          max_contracts_allowed: number
          max_trades_per_day: number
          open_trade: boolean
          risk_mode: string
          risk_remaining_today: number
          session_paused: boolean
          trades_remaining_today: number
          updated_at: string
          user_id: string
          vault_status: string
        }[]
        SetofOptions: {
          from: "*"
          to: "vault_state"
          isOneToOne: false
          isSetofReturn: true
        }
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
