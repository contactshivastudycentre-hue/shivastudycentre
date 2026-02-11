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
      notes: {
        Row: {
          class: string
          created_at: string
          created_by: string | null
          id: string
          pdf_url: string
          subject: string
          title: string
          updated_at: string
        }
        Insert: {
          class: string
          created_at?: string
          created_by?: string | null
          id?: string
          pdf_url: string
          subject: string
          title: string
          updated_at?: string
        }
        Update: {
          class?: string
          created_at?: string
          created_by?: string | null
          id?: string
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
