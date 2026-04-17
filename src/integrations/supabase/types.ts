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
      banners: {
        Row: {
          background_color: string | null
          created_at: string
          cta_link: string | null
          cta_text: string | null
          description: string | null
          event_id: string | null
          id: string
          image_url: string | null
          is_active: boolean
          is_universal: boolean
          priority: number
          subtitle: string | null
          target_class: string | null
          template: string
          title: string
          updated_at: string
        }
        Insert: {
          background_color?: string | null
          created_at?: string
          cta_link?: string | null
          cta_text?: string | null
          description?: string | null
          event_id?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_universal?: boolean
          priority?: number
          subtitle?: string | null
          target_class?: string | null
          template?: string
          title: string
          updated_at?: string
        }
        Update: {
          background_color?: string | null
          created_at?: string
          cta_link?: string | null
          cta_text?: string | null
          description?: string | null
          event_id?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_universal?: boolean
          priority?: number
          subtitle?: string | null
          target_class?: string | null
          template?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "banners_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "test_events"
            referencedColumns: ["id"]
          },
        ]
      }
      class_change_requests: {
        Row: {
          admin_response: string | null
          created_at: string
          current_class: string
          id: string
          reason: string | null
          requested_class: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_response?: string | null
          created_at?: string
          current_class: string
          id?: string
          reason?: string | null
          requested_class: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_response?: string | null
          created_at?: string
          current_class?: string
          id?: string
          reason?: string | null
          requested_class?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      event_prizes: {
        Row: {
          created_at: string
          event_id: string
          extra_reward: string | null
          first_prize: string | null
          id: string
          second_prize: string | null
          third_prize: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          event_id: string
          extra_reward?: string | null
          first_prize?: string | null
          id?: string
          second_prize?: string | null
          third_prize?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          event_id?: string
          extra_reward?: string | null
          first_prize?: string | null
          id?: string
          second_prize?: string | null
          third_prize?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_prizes_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "test_events"
            referencedColumns: ["id"]
          },
        ]
      }
      last_activity: {
        Row: {
          content_id: string
          content_subtitle: string | null
          content_title: string | null
          content_type: string
          created_at: string
          id: string
          last_opened: string
          user_id: string
        }
        Insert: {
          content_id: string
          content_subtitle?: string | null
          content_title?: string | null
          content_type: string
          created_at?: string
          id?: string
          last_opened?: string
          user_id: string
        }
        Update: {
          content_id?: string
          content_subtitle?: string | null
          content_title?: string | null
          content_type?: string
          created_at?: string
          id?: string
          last_opened?: string
          user_id?: string
        }
        Relationships: []
      }
      notes: {
        Row: {
          chapter_number: number | null
          class: string
          created_at: string
          created_by: string | null
          id: string
          is_solution: boolean
          pdf_url: string
          subject: string
          title: string
          updated_at: string
        }
        Insert: {
          chapter_number?: number | null
          class: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_solution?: boolean
          pdf_url: string
          subject: string
          title: string
          updated_at?: string
        }
        Update: {
          chapter_number?: number | null
          class?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_solution?: boolean
          pdf_url?: string
          subject?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      password_reset_requests: {
        Row: {
          admin_notes: string | null
          created_at: string
          email: string | null
          id: string
          mobile: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
          user_id: string | null
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          email?: string | null
          id?: string
          mobile?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          user_id?: string | null
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          email?: string | null
          id?: string
          mobile?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          class: string | null
          created_at: string
          full_name: string
          id: string
          mobile: string
          status: Database["public"]["Enums"]["student_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          class?: string | null
          created_at?: string
          full_name: string
          id?: string
          mobile: string
          status?: Database["public"]["Enums"]["student_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          class?: string | null
          created_at?: string
          full_name?: string
          id?: string
          mobile?: string
          status?: Database["public"]["Enums"]["student_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      questions: {
        Row: {
          correct_answers: Json | null
          correct_option_index: number
          created_at: string
          id: string
          marks: number
          options: Json
          question_text: string
          question_type: Database["public"]["Enums"]["question_type"]
          test_id: string
        }
        Insert: {
          correct_answers?: Json | null
          correct_option_index: number
          created_at?: string
          id?: string
          marks?: number
          options?: Json
          question_text: string
          question_type?: Database["public"]["Enums"]["question_type"]
          test_id: string
        }
        Update: {
          correct_answers?: Json | null
          correct_option_index?: number
          created_at?: string
          id?: string
          marks?: number
          options?: Json
          question_text?: string
          question_type?: Database["public"]["Enums"]["question_type"]
          test_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "questions_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
        ]
      }
      test_attempts: {
        Row: {
          answers: Json
          evaluated_at: string | null
          evaluated_by: string | null
          evaluation_status: string | null
          id: string
          is_banned: boolean
          manual_score: number | null
          mcq_score: number | null
          score: number | null
          started_at: string
          submitted_at: string | null
          test_id: string
          user_id: string
        }
        Insert: {
          answers?: Json
          evaluated_at?: string | null
          evaluated_by?: string | null
          evaluation_status?: string | null
          id?: string
          is_banned?: boolean
          manual_score?: number | null
          mcq_score?: number | null
          score?: number | null
          started_at?: string
          submitted_at?: string | null
          test_id: string
          user_id: string
        }
        Update: {
          answers?: Json
          evaluated_at?: string | null
          evaluated_by?: string | null
          evaluation_status?: string | null
          id?: string
          is_banned?: boolean
          manual_score?: number | null
          mcq_score?: number | null
          score?: number | null
          started_at?: string
          submitted_at?: string | null
          test_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_attempts_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
        ]
      }
      test_events: {
        Row: {
          banner_image: string | null
          created_at: string
          description: string | null
          end_date: string
          event_name: string
          id: string
          is_universal: boolean
          results_approved: boolean
          start_date: string
          status: string
          target_class: string | null
          test_id: string | null
          updated_at: string
        }
        Insert: {
          banner_image?: string | null
          created_at?: string
          description?: string | null
          end_date: string
          event_name: string
          id?: string
          is_universal?: boolean
          results_approved?: boolean
          start_date: string
          status?: string
          target_class?: string | null
          test_id?: string | null
          updated_at?: string
        }
        Update: {
          banner_image?: string | null
          created_at?: string
          description?: string | null
          end_date?: string
          event_name?: string
          id?: string
          is_universal?: boolean
          results_approved?: boolean
          start_date?: string
          status?: string
          target_class?: string | null
          test_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_events_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
        ]
      }
      tests: {
        Row: {
          class: string
          created_at: string
          created_by: string | null
          description: string | null
          duration_minutes: number
          id: string
          is_published: boolean
          subject: string
          title: string
          total_marks: number | null
          updated_at: string
        }
        Insert: {
          class: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_minutes?: number
          id?: string
          is_published?: boolean
          subject: string
          title: string
          total_marks?: number | null
          updated_at?: string
        }
        Update: {
          class?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_minutes?: number
          id?: string
          is_published?: boolean
          subject?: string
          title?: string
          total_marks?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      video_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          is_approved: boolean
          updated_at: string
          user_id: string
          video_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_approved?: boolean
          updated_at?: string
          user_id: string
          video_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_approved?: boolean
          updated_at?: string
          user_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_comments_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      video_likes: {
        Row: {
          created_at: string
          id: string
          user_id: string
          video_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_id: string
          video_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_likes_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      videos: {
        Row: {
          class: string
          comments_enabled: boolean
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          subject: string
          thumbnail_url: string | null
          title: string
          updated_at: string
          video_url: string
        }
        Insert: {
          class: string
          comments_enabled?: boolean
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          subject: string
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          video_url: string
        }
        Update: {
          class?: string
          comments_enabled?: boolean
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          subject?: string
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          video_url?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_student: { Args: { student_user_id: string }; Returns: boolean }
      get_email_by_user_id: {
        Args: { target_user_id: string }
        Returns: string
      }
      get_student_status: {
        Args: { check_user_id?: string }
        Returns: Database["public"]["Enums"]["student_status"]
      }
      get_video_like_count: { Args: { video_uuid: string }; Returns: number }
      is_admin: { Args: { check_user_id?: string }; Returns: boolean }
      is_student_approved: {
        Args: { check_user_id?: string }
        Returns: boolean
      }
      process_class_change_request: {
        Args: {
          admin_note?: string
          next_status: string
          override_class?: string
          request_id: string
        }
        Returns: boolean
      }
      promote_students_class: {
        Args: {
          from_class: string
          include_pending?: boolean
          to_class: string
        }
        Returns: number
      }
      submit_test_attempt: {
        Args: {
          p_answers: Json
          p_attempt_id: string
          p_has_descriptive: boolean
          p_mcq_score: number
          p_score: number
        }
        Returns: Json
      }
      track_activity: {
        Args: {
          p_content_id: string
          p_content_type: string
          p_subtitle?: string
          p_title?: string
        }
        Returns: undefined
      }
      user_has_liked_video: {
        Args: { check_user_id?: string; video_uuid: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "student"
      question_type:
        | "mcq_single"
        | "mcq_multiple"
        | "true_false"
        | "short_answer"
        | "long_answer"
      student_status: "pending" | "approved" | "inactive"
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
      app_role: ["admin", "student"],
      question_type: [
        "mcq_single",
        "mcq_multiple",
        "true_false",
        "short_answer",
        "long_answer",
      ],
      student_status: ["pending", "approved", "inactive"],
    },
  },
} as const
