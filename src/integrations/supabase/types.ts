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
      academy_announcements: {
        Row: {
          author_id: string
          body: string
          created_at: string
          delivery_mode: string
          id: string
          image_url: string | null
          is_pinned: boolean
          link: string | null
          replies_locked: boolean
          segment: string
          title: string
          updated_at: string
        }
        Insert: {
          author_id: string
          body?: string
          created_at?: string
          delivery_mode?: string
          id?: string
          image_url?: string | null
          is_pinned?: boolean
          link?: string | null
          replies_locked?: boolean
          segment?: string
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          delivery_mode?: string
          id?: string
          image_url?: string | null
          is_pinned?: boolean
          link?: string | null
          replies_locked?: boolean
          segment?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
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
          visible: boolean
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
          visible?: boolean
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
          visible?: boolean
        }
        Relationships: []
      }
      academy_messages: {
        Row: {
          attachments: Json | null
          body: string
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          edit_count: number
          edited_at: string | null
          id: string
          is_deleted: boolean
          original_content: string | null
          parent_message_id: string | null
          reply_count: number
          room_slug: string
          seq: number
          user_id: string
          user_name: string
          user_role: string
        }
        Insert: {
          attachments?: Json | null
          body: string
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          edit_count?: number
          edited_at?: string | null
          id?: string
          is_deleted?: boolean
          original_content?: string | null
          parent_message_id?: string | null
          reply_count?: number
          room_slug: string
          seq?: number
          user_id: string
          user_name?: string
          user_role?: string
        }
        Update: {
          attachments?: Json | null
          body?: string
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          edit_count?: number
          edited_at?: string | null
          id?: string
          is_deleted?: boolean
          original_content?: string | null
          parent_message_id?: string | null
          reply_count?: number
          room_slug?: string
          seq?: number
          user_id?: string
          user_name?: string
          user_role?: string
        }
        Relationships: [
          {
            foreignKeyName: "academy_messages_parent_message_id_fkey"
            columns: ["parent_message_id"]
            isOneToOne: false
            referencedRelation: "academy_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      academy_modules: {
        Row: {
          cover_image_url: string | null
          created_at: string
          id: string
          slug: string
          sort_order: number
          subtitle: string
          title: string
          updated_at: string
          visible: boolean
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string
          id?: string
          slug: string
          sort_order?: number
          subtitle?: string
          title: string
          updated_at?: string
          visible?: boolean
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string
          id?: string
          slug?: string
          sort_order?: number
          subtitle?: string
          title?: string
          updated_at?: string
          visible?: boolean
        }
        Relationships: []
      }
      academy_notification_reads: {
        Row: {
          id: string
          notification_id: string
          read_at: string
          user_id: string
        }
        Insert: {
          id?: string
          notification_id: string
          read_at?: string
          user_id: string
        }
        Update: {
          id?: string
          notification_id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "academy_notification_reads_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "academy_notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      academy_notifications: {
        Row: {
          body: string
          created_at: string
          id: string
          link_path: string | null
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          body?: string
          created_at?: string
          id?: string
          link_path?: string | null
          title: string
          type?: string
          user_id?: string | null
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          link_path?: string | null
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      academy_permissions: {
        Row: {
          description: string
          key: string
        }
        Insert: {
          description?: string
          key: string
        }
        Update: {
          description?: string
          key?: string
        }
        Relationships: []
      }
      academy_role_permissions: {
        Row: {
          permission_key: string
          role_id: string
        }
        Insert: {
          permission_key: string
          role_id: string
        }
        Update: {
          permission_key?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "academy_role_permissions_permission_key_fkey"
            columns: ["permission_key"]
            isOneToOne: false
            referencedRelation: "academy_permissions"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "academy_role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "academy_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      academy_roles: {
        Row: {
          created_at: string
          id: string
          name: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      academy_room_reads: {
        Row: {
          last_read_seq: number
          room_slug: string
          updated_at: string
          user_id: string
        }
        Insert: {
          last_read_seq?: number
          room_slug: string
          updated_at?: string
          user_id: string
        }
        Update: {
          last_read_seq?: number
          room_slug?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      academy_user_roles: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          id: string
          role_id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          role_id: string
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          role_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "academy_user_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "academy_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      allowed_signups: {
        Row: {
          added_by: string
          claimed: boolean
          created_at: string
          email: string
          id: string
          stripe_customer_id: string | null
        }
        Insert: {
          added_by: string
          claimed?: boolean
          created_at?: string
          email: string
          id?: string
          stripe_customer_id?: string | null
        }
        Update: {
          added_by?: string
          claimed?: boolean
          created_at?: string
          email?: string
          id?: string
          stripe_customer_id?: string | null
        }
        Relationships: []
      }
      approved_plans: {
        Row: {
          account_balance_snapshot: number
          account_level_snapshot: string | null
          approval_status: string
          cash_needed_planned: number
          contracts_planned: number
          created_at: string
          daily_left_snapshot: number | null
          direction: string
          entry_price_planned: number
          id: string
          max_loss_planned: number
          status: string
          stop_price_planned: number | null
          ticker: string | null
          tp1_planned: number | null
          tp2_planned: number | null
          trade_loss_limit_snapshot: number
          updated_at: string
          user_id: string
        }
        Insert: {
          account_balance_snapshot: number
          account_level_snapshot?: string | null
          approval_status?: string
          cash_needed_planned: number
          contracts_planned: number
          created_at?: string
          daily_left_snapshot?: number | null
          direction?: string
          entry_price_planned: number
          id?: string
          max_loss_planned: number
          status?: string
          stop_price_planned?: number | null
          ticker?: string | null
          tp1_planned?: number | null
          tp2_planned?: number | null
          trade_loss_limit_snapshot: number
          updated_at?: string
          user_id: string
        }
        Update: {
          account_balance_snapshot?: number
          account_level_snapshot?: string | null
          approval_status?: string
          cash_needed_planned?: number
          contracts_planned?: number
          created_at?: string
          daily_left_snapshot?: number | null
          direction?: string
          entry_price_planned?: number
          id?: string
          max_loss_planned?: number
          status?: string
          stop_price_planned?: number | null
          ticker?: string | null
          tp1_planned?: number | null
          tp2_planned?: number | null
          trade_loss_limit_snapshot?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          admin_id: string
          created_at: string
          id: string
          metadata: Json | null
          target_user_id: string
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string
          id?: string
          metadata?: Json | null
          target_user_id: string
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          target_user_id?: string
        }
        Relationships: []
      }
      balance_adjustments: {
        Row: {
          adjustment_date: string
          amount: number
          created_at: string
          id: string
          note: string | null
          user_id: string
        }
        Insert: {
          adjustment_date?: string
          amount: number
          created_at?: string
          id?: string
          note?: string | null
          user_id: string
        }
        Update: {
          adjustment_date?: string
          amount?: number
          created_at?: string
          id?: string
          note?: string | null
          user_id?: string
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
      broadcast_messages: {
        Row: {
          body: string
          channel: string
          created_at: string
          id: string
          metadata: Json | null
          mode: string
          recipient_type: string
          recipient_user_id: string | null
          sender_id: string
          sent_at: string | null
          status: string
          template_key: string | null
          title: string
        }
        Insert: {
          body?: string
          channel?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          mode?: string
          recipient_type?: string
          recipient_user_id?: string | null
          sender_id: string
          sent_at?: string | null
          status?: string
          template_key?: string | null
          title: string
        }
        Update: {
          body?: string
          channel?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          mode?: string
          recipient_type?: string
          recipient_user_id?: string | null
          sender_id?: string
          sent_at?: string | null
          status?: string
          template_key?: string | null
          title?: string
        }
        Relationships: []
      }
      chat_mutes: {
        Row: {
          created_at: string
          id: string
          muted_by: string
          muted_until: string
          reason: string | null
          room_slug: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          muted_by: string
          muted_until: string
          reason?: string | null
          room_slug?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          muted_by?: string
          muted_until?: string
          reason?: string | null
          room_slug?: string | null
          user_id?: string
        }
        Relationships: []
      }
      coach_answer_reads: {
        Row: {
          id: string
          read_at: string
          reply_id: string
          user_id: string
        }
        Insert: {
          id?: string
          read_at?: string
          reply_id: string
          user_id: string
        }
        Update: {
          id?: string
          read_at?: string
          reply_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_answer_reads_reply_id_fkey"
            columns: ["reply_id"]
            isOneToOne: false
            referencedRelation: "coach_ticket_replies"
            referencedColumns: ["id"]
          },
        ]
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
      device_tokens: {
        Row: {
          created_at: string
          id: string
          last_seen_at: string
          platform: string
          token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_seen_at?: string
          platform?: string
          token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_seen_at?: string
          platform?: string
          token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      dm_messages: {
        Row: {
          attachments: Json | null
          body: string
          created_at: string
          id: string
          read_at: string | null
          sender_id: string
          thread_id: string
        }
        Insert: {
          attachments?: Json | null
          body: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id: string
          thread_id: string
        }
        Update: {
          attachments?: Json | null
          body?: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dm_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "dm_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      dm_threads: {
        Row: {
          admin_id: string | null
          created_at: string
          id: string
          inbox_item_id: string | null
          last_message_at: string
          user_id: string
        }
        Insert: {
          admin_id?: string | null
          created_at?: string
          id?: string
          inbox_item_id?: string | null
          last_message_at?: string
          user_id: string
        }
        Update: {
          admin_id?: string | null
          created_at?: string
          id?: string
          inbox_item_id?: string | null
          last_message_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dm_threads_inbox_item_id_fkey"
            columns: ["inbox_item_id"]
            isOneToOne: false
            referencedRelation: "inbox_items"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_flags: {
        Row: {
          enabled: boolean
          id: string
          label: string
          page_key: string
          updated_at: string
        }
        Insert: {
          enabled?: boolean
          id?: string
          label: string
          page_key: string
          updated_at?: string
        }
        Update: {
          enabled?: boolean
          id?: string
          label?: string
          page_key?: string
          updated_at?: string
        }
        Relationships: []
      }
      inbox_dismissals: {
        Row: {
          dismissed_at: string
          inbox_item_id: string
          user_id: string
        }
        Insert: {
          dismissed_at?: string
          inbox_item_id: string
          user_id: string
        }
        Update: {
          dismissed_at?: string
          inbox_item_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inbox_dismissals_inbox_item_id_fkey"
            columns: ["inbox_item_id"]
            isOneToOne: false
            referencedRelation: "inbox_items"
            referencedColumns: ["id"]
          },
        ]
      }
      inbox_items: {
        Row: {
          body: string
          created_at: string
          dm_thread_id: string | null
          id: string
          link: string | null
          pinned: boolean
          read_at: string | null
          sender_id: string | null
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          body?: string
          created_at?: string
          dm_thread_id?: string | null
          id?: string
          link?: string | null
          pinned?: boolean
          read_at?: string | null
          sender_id?: string | null
          title: string
          type?: string
          user_id?: string | null
        }
        Update: {
          body?: string
          created_at?: string
          dm_thread_id?: string | null
          id?: string
          link?: string | null
          pinned?: boolean
          read_at?: string | null
          sender_id?: string | null
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inbox_items_dm_thread_id_fkey"
            columns: ["dm_thread_id"]
            isOneToOne: false
            referencedRelation: "dm_threads"
            referencedColumns: ["id"]
          },
        ]
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
      journal_entries: {
        Row: {
          biggest_mistake: string
          created_at: string
          entry_date: string
          followed_rules: boolean
          id: string
          lesson: string
          ticker: string | null
          user_id: string
          what_happened: string
        }
        Insert: {
          biggest_mistake?: string
          created_at?: string
          entry_date?: string
          followed_rules?: boolean
          id?: string
          lesson?: string
          ticker?: string | null
          user_id: string
          what_happened?: string
        }
        Update: {
          biggest_mistake?: string
          created_at?: string
          entry_date?: string
          followed_rules?: boolean
          id?: string
          lesson?: string
          ticker?: string | null
          user_id?: string
          what_happened?: string
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
      live_session_attendance: {
        Row: {
          clicked_at: string
          id: string
          session_id: string | null
          session_title: string
          user_id: string
        }
        Insert: {
          clicked_at?: string
          id?: string
          session_id?: string | null
          session_title?: string
          user_id: string
        }
        Update: {
          clicked_at?: string
          id?: string
          session_id?: string | null
          session_title?: string
          user_id?: string
        }
        Relationships: []
      }
      live_sessions: {
        Row: {
          created_at: string
          created_by: string | null
          description: string
          duration_minutes: number
          id: string
          is_replay: boolean
          join_url: string
          replay_url: string | null
          session_date: string
          session_type: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string
          duration_minutes?: number
          id?: string
          is_replay?: boolean
          join_url?: string
          replay_url?: string | null
          session_date: string
          session_type?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string
          duration_minutes?: number
          id?: string
          is_replay?: boolean
          join_url?: string
          replay_url?: string | null
          session_date?: string
          session_type?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      message_reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "academy_messages"
            referencedColumns: ["id"]
          },
        ]
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
      notification_log: {
        Row: {
          body: string
          created_at: string
          id: string
          seen: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string
          created_at?: string
          id?: string
          seen?: boolean
          title: string
          type?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          seen?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      onboarding_state: {
        Row: {
          claimed_role: boolean
          created_at: string
          first_lesson_completed: boolean
          first_lesson_started: boolean
          intro_posted: boolean
          role_level: string
          updated_at: string
          user_id: string
        }
        Insert: {
          claimed_role?: boolean
          created_at?: string
          first_lesson_completed?: boolean
          first_lesson_started?: boolean
          intro_posted?: boolean
          role_level?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          claimed_role?: boolean
          created_at?: string
          first_lesson_completed?: boolean
          first_lesson_started?: boolean
          intro_posted?: boolean
          role_level?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      pinned_messages: {
        Row: {
          message_id: string
          pinned_at: string
          pinned_by: string
          room_slug: string
        }
        Insert: {
          message_id: string
          pinned_at?: string
          pinned_by: string
          room_slug: string
        }
        Update: {
          message_id?: string
          pinned_at?: string
          pinned_by?: string
          room_slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "pinned_messages_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "academy_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      playbook_chapters: {
        Row: {
          action_payload: Json
          action_type: string
          checkpoint_json: Json
          created_at: string
          id: string
          minutes_estimate: number
          order_index: number
          pdf_page_end: number
          pdf_page_start: number
          title: string
          updated_at: string
        }
        Insert: {
          action_payload?: Json
          action_type?: string
          checkpoint_json?: Json
          created_at?: string
          id?: string
          minutes_estimate?: number
          order_index?: number
          pdf_page_end?: number
          pdf_page_start?: number
          title: string
          updated_at?: string
        }
        Update: {
          action_payload?: Json
          action_type?: string
          checkpoint_json?: Json
          created_at?: string
          id?: string
          minutes_estimate?: number
          order_index?: number
          pdf_page_end?: number
          pdf_page_start?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      playbook_notes: {
        Row: {
          chapter_id: string
          note_text: string
          updated_at: string
          user_id: string
        }
        Insert: {
          chapter_id: string
          note_text?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          chapter_id?: string
          note_text?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "playbook_notes_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "playbook_chapters"
            referencedColumns: ["id"]
          },
        ]
      }
      playbook_progress: {
        Row: {
          chapter_id: string
          checkpoint_passed: boolean
          checkpoint_score: number
          completed_at: string | null
          last_page_viewed: number
          status: string
          time_in_reader_seconds: number
          updated_at: string
          user_id: string
        }
        Insert: {
          chapter_id: string
          checkpoint_passed?: boolean
          checkpoint_score?: number
          completed_at?: string | null
          last_page_viewed?: number
          status?: string
          time_in_reader_seconds?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          chapter_id?: string
          checkpoint_passed?: boolean
          checkpoint_score?: number
          completed_at?: string | null
          last_page_viewed?: number
          status?: string
          time_in_reader_seconds?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "playbook_progress_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "playbook_chapters"
            referencedColumns: ["id"]
          },
        ]
      }
      post_signal: {
        Row: {
          created_at: string
          id: string
          post_id: string | null
          severity: string
          signal_type: string
          source: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id?: string | null
          severity?: string
          signal_type: string
          source: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string | null
          severity?: string
          signal_type?: string
          source?: string
          user_id?: string
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
          ai_focus_cache: Json | null
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
          is_banned: boolean
          last_seen_at: string | null
          market_type: string
          onboarding_completed: boolean
          phone_number: string | null
          profile_completed: boolean
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
          ai_focus_cache?: Json | null
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
          is_banned?: boolean
          last_seen_at?: string | null
          market_type?: string
          onboarding_completed?: boolean
          phone_number?: string | null
          profile_completed?: boolean
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
          ai_focus_cache?: Json | null
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
          is_banned?: boolean
          last_seen_at?: string | null
          market_type?: string
          onboarding_completed?: boolean
          phone_number?: string | null
          profile_completed?: boolean
          role_level?: string
          timezone?: string
          updated_at?: string
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      referrals: {
        Row: {
          created_at: string
          id: string
          referred_email: string | null
          referred_user_id: string | null
          referrer_user_id: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          referred_email?: string | null
          referred_user_id?: string | null
          referrer_user_id: string
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          referred_email?: string | null
          referred_user_id?: string | null
          referrer_user_id?: string
          status?: string
        }
        Relationships: []
      }
      room_locks: {
        Row: {
          locked_at: string
          locked_by: string
          room_slug: string
        }
        Insert: {
          locked_at?: string
          locked_by: string
          room_slug: string
        }
        Update: {
          locked_at?: string
          locked_by?: string
          room_slug?: string
        }
        Relationships: []
      }
      stripe_webhook_events: {
        Row: {
          amount: number | null
          checkout_session_id: string | null
          currency: string | null
          email: string | null
          error_message: string | null
          event_type: string
          id: string
          payload_json: Json
          processed_at: string | null
          received_at: string
          status: string
          stripe_customer_id: string | null
          stripe_event_id: string
          stripe_subscription_id: string | null
          trace_id: string
        }
        Insert: {
          amount?: number | null
          checkout_session_id?: string | null
          currency?: string | null
          email?: string | null
          error_message?: string | null
          event_type: string
          id?: string
          payload_json?: Json
          processed_at?: string | null
          received_at?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_event_id: string
          stripe_subscription_id?: string | null
          trace_id: string
        }
        Update: {
          amount?: number | null
          checkout_session_id?: string | null
          currency?: string | null
          email?: string | null
          error_message?: string | null
          event_type?: string
          id?: string
          payload_json?: Json
          processed_at?: string | null
          received_at?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_event_id?: string
          stripe_subscription_id?: string | null
          trace_id?: string
        }
        Relationships: []
      }
      student_access: {
        Row: {
          access_ended_at: string | null
          access_granted_at: string
          id: string
          last_synced_at: string
          product_key: string
          status: string
          stripe_checkout_session_id: string | null
          stripe_customer_id: string | null
          stripe_price_id: string | null
          stripe_subscription_id: string | null
          tier: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_ended_at?: string | null
          access_granted_at?: string
          id?: string
          last_synced_at?: string
          product_key?: string
          status?: string
          stripe_checkout_session_id?: string | null
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          tier?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_ended_at?: string | null
          access_granted_at?: string
          id?: string
          last_synced_at?: string
          product_key?: string
          status?: string
          stripe_checkout_session_id?: string | null
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          tier?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_access_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          auth_user_id: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          phone: string | null
          stripe_customer_id: string | null
          updated_at: string
        }
        Insert: {
          auth_user_id?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id?: string
          phone?: string | null
          stripe_customer_id?: string | null
          updated_at?: string
        }
        Update: {
          auth_user_id?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          stripe_customer_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      toolkit_items: {
        Row: {
          category: string
          created_at: string
          created_by: string
          description: string
          external_url: string | null
          file_url: string | null
          icon: string
          id: string
          sort_order: number
          title: string
          updated_at: string
          visible: boolean
        }
        Insert: {
          category?: string
          created_at?: string
          created_by: string
          description?: string
          external_url?: string | null
          file_url?: string | null
          icon?: string
          id?: string
          sort_order?: number
          title: string
          updated_at?: string
          visible?: boolean
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string
          description?: string
          external_url?: string | null
          file_url?: string | null
          icon?: string
          id?: string
          sort_order?: number
          title?: string
          updated_at?: string
          visible?: boolean
        }
        Relationships: []
      }
      trade_entries: {
        Row: {
          actual_pnl: number | null
          contracts: number | null
          created_at: string
          emotional_state: number
          entry_price: number | null
          exit_price: number | null
          followed_rules: boolean
          id: string
          instrument_type: string | null
          is_oversized: boolean
          notes: string | null
          outcome: string | null
          plan_id: string | null
          planned_risk_dollars: number | null
          risk_reward: number
          risk_used: number
          screenshot_url: string | null
          symbol: string | null
          trade_date: string
          user_id: string
          vault_verified: boolean
          vault_verified_at: string | null
        }
        Insert: {
          actual_pnl?: number | null
          contracts?: number | null
          created_at?: string
          emotional_state: number
          entry_price?: number | null
          exit_price?: number | null
          followed_rules: boolean
          id?: string
          instrument_type?: string | null
          is_oversized?: boolean
          notes?: string | null
          outcome?: string | null
          plan_id?: string | null
          planned_risk_dollars?: number | null
          risk_reward: number
          risk_used: number
          screenshot_url?: string | null
          symbol?: string | null
          trade_date?: string
          user_id: string
          vault_verified?: boolean
          vault_verified_at?: string | null
        }
        Update: {
          actual_pnl?: number | null
          contracts?: number | null
          created_at?: string
          emotional_state?: number
          entry_price?: number | null
          exit_price?: number | null
          followed_rules?: boolean
          id?: string
          instrument_type?: string | null
          is_oversized?: boolean
          notes?: string | null
          outcome?: string | null
          plan_id?: string | null
          planned_risk_dollars?: number | null
          risk_reward?: number
          risk_used?: number
          screenshot_url?: string | null
          symbol?: string | null
          trade_date?: string
          user_id?: string
          vault_verified?: boolean
          vault_verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trade_entries_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "approved_plans"
            referencedColumns: ["id"]
          },
        ]
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
      trading_sessions: {
        Row: {
          created_at: string
          cutoff_time: string
          hard_close_time: string
          id: string
          session_date: string
          start_time: string
          user_id: string
        }
        Insert: {
          created_at?: string
          cutoff_time: string
          hard_close_time: string
          id?: string
          session_date: string
          start_time: string
          user_id: string
        }
        Update: {
          created_at?: string
          cutoff_time?: string
          hard_close_time?: string
          id?: string
          session_date?: string
          start_time?: string
          user_id?: string
        }
        Relationships: []
      }
      user_activity_logs: {
        Row: {
          created_at: string
          event_name: string
          id: string
          metadata_json: Json | null
          page_key: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          event_name: string
          id?: string
          metadata_json?: Json | null
          page_key?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          event_name?: string
          id?: string
          metadata_json?: Json | null
          page_key?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_nudges_dismissed: {
        Row: {
          dismissed_until: string
          nudge_key: string
          user_id: string
        }
        Insert: {
          dismissed_until?: string
          nudge_key: string
          user_id: string
        }
        Update: {
          dismissed_until?: string
          nudge_key?: string
          user_id?: string
        }
        Relationships: []
      }
      user_playbook_state: {
        Row: {
          last_chapter_id: string | null
          last_page_viewed: number
          updated_at: string
          user_id: string
        }
        Insert: {
          last_chapter_id?: string | null
          last_page_viewed?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          last_chapter_id?: string | null
          last_page_viewed?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_playbook_state_last_chapter_id_fkey"
            columns: ["last_chapter_id"]
            isOneToOne: false
            referencedRelation: "playbook_chapters"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          default_market: string
          notifications_enabled: boolean
          notify_announcements: boolean
          notify_coach_reply: boolean
          notify_live_events: boolean
          notify_new_modules: boolean
          preferred_alert_channel: string
          risk_percent_override: number | null
          session_autopause_minutes: number
          sounds_enabled: boolean
          trading_style: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          default_market?: string
          notifications_enabled?: boolean
          notify_announcements?: boolean
          notify_coach_reply?: boolean
          notify_live_events?: boolean
          notify_new_modules?: boolean
          preferred_alert_channel?: string
          risk_percent_override?: number | null
          session_autopause_minutes?: number
          sounds_enabled?: boolean
          trading_style?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          default_market?: string
          notifications_enabled?: boolean
          notify_announcements?: boolean
          notify_coach_reply?: boolean
          notify_live_events?: boolean
          notify_new_modules?: boolean
          preferred_alert_channel?: string
          risk_percent_override?: number | null
          session_autopause_minutes?: number
          sounds_enabled?: boolean
          trading_style?: string | null
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
      user_task: {
        Row: {
          completed_at: string | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          status: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          status?: string
          title: string
          type?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          status?: string
          title?: string
          type?: string
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
      referral_stats: {
        Row: {
          current_streak_weeks: number | null
          last_referral_at: string | null
          total_paid: number | null
          total_signed_up: number | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_override_access: {
        Args: { new_status: string; reason: string; target_student_id: string }
        Returns: Json
      }
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
      cleanup_deleted_messages: { Args: never; Returns: undefined }
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
      decrement_risk_budget: {
        Args: { p_amount: number; p_user_id: string }
        Returns: undefined
      }
      detect_session_behavior: { Args: { _user_id: string }; Returns: string }
      generate_reports_for_user: {
        Args: { _period: string; _user_id: string }
        Returns: undefined
      }
      get_academy_role_name: { Args: { _user_id: string }; Returns: string }
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
      get_community_profiles: {
        Args: { _user_ids: string[] }
        Returns: {
          academy_experience: string
          avatar_url: string
          role_level: string
          user_id: string
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
      get_mention_users: {
        Args: never
        Returns: {
          avatar_url: string
          display_name: string
          user_id: string
          username: string
        }[]
      }
      get_micro_feedback: { Args: { _user_id: string }; Returns: string }
      get_my_access_state: {
        Args: never
        Returns: {
          has_access: boolean
          product_key: string
          status: string
          stripe_customer_id: string
          student_id: string
          tier: string
          updated_at: string
        }[]
      }
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
      has_academy_permission: {
        Args: { _permission_key: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_academy_ceo: { Args: { _user_id: string }; Returns: boolean }
      log_vault_event: {
        Args: { _event_context?: Json; _event_type: string; _user_id: string }
        Returns: string
      }
      nightly_memory_aggregation: { Args: never; Returns: undefined }
      promote_to_ceo: { Args: { target_user_id: string }; Returns: undefined }
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
