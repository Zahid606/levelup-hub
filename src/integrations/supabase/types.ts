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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      gift_history: {
        Row: {
          action: string
          changed_at: string
          changed_by: string | null
          description: string | null
          gift_id: string | null
          gift_name: string | null
          id: string
          user_id: string
        }
        Insert: {
          action: string
          changed_at?: string
          changed_by?: string | null
          description?: string | null
          gift_id?: string | null
          gift_name?: string | null
          id?: string
          user_id: string
        }
        Update: {
          action?: string
          changed_at?: string
          changed_by?: string | null
          description?: string | null
          gift_id?: string | null
          gift_name?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      gifts: {
        Row: {
          created_at: string
          description: string | null
          gift_name: string
          given_by: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          gift_name: string
          given_by?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          gift_name?: string
          given_by?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      lesson_content: {
        Row: {
          content_type: string
          created_at: string
          id: string
          lesson_id: string
          sort_order: number
          title: string | null
          video_points: number
          youtube_url: string | null
        }
        Insert: {
          content_type?: string
          created_at?: string
          id?: string
          lesson_id: string
          sort_order?: number
          title?: string | null
          video_points?: number
          youtube_url?: string | null
        }
        Update: {
          content_type?: string
          created_at?: string
          id?: string
          lesson_id?: string
          sort_order?: number
          title?: string | null
          video_points?: number
          youtube_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lesson_content_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          created_at: string
          description: string | null
          description_bn: string | null
          description_ur: string | null
          id: string
          is_published: boolean
          lesson_number: number | null
          sort_order: number
          title: string
          title_bn: string | null
          title_ur: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          description_bn?: string | null
          description_ur?: string | null
          id?: string
          is_published?: boolean
          lesson_number?: number | null
          sort_order?: number
          title: string
          title_bn?: string | null
          title_ur?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          description_bn?: string | null
          description_ur?: string | null
          id?: string
          is_published?: boolean
          lesson_number?: number | null
          sort_order?: number
          title?: string
          title_bn?: string | null
          title_ur?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          body: string
          created_at: string
          id: string
          read_at: string | null
          recipient_id: string
          sender_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          read_at?: string | null
          recipient_id: string
          sender_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          read_at?: string | null
          recipient_id?: string
          sender_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          dedupe_key: string | null
          id: string
          lesson_id: string | null
          link: string | null
          message: string | null
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          dedupe_key?: string | null
          id?: string
          lesson_id?: string | null
          link?: string | null
          message?: string | null
          read_at?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          dedupe_key?: string | null
          id?: string
          lesson_id?: string | null
          link?: string | null
          message?: string | null
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          age: number | null
          avatar_url: string | null
          city: string | null
          country: string | null
          created_at: string
          email: string | null
          full_name: string | null
          gender: string | null
          id: string
          language: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          age?: number | null
          avatar_url?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          gender?: string | null
          id?: string
          language?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          age?: number | null
          avatar_url?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          gender?: string | null
          id?: string
          language?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      quiz_answers: {
        Row: {
          created_at: string
          id: string
          is_correct: boolean
          points_earned: number
          question_id: string
          selected_answer: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_correct?: boolean
          points_earned?: number
          question_id: string
          selected_answer: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_correct?: boolean
          points_earned?: number
          question_id?: string
          selected_answer?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "quiz_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_questions: {
        Row: {
          correct_answer: number
          created_at: string
          id: string
          lesson_id: string
          options: Json
          options_bn: Json
          options_ur: Json
          points: number
          question: string
          question_bn: string | null
          question_ur: string | null
          sort_order: number
        }
        Insert: {
          correct_answer?: number
          created_at?: string
          id?: string
          lesson_id: string
          options?: Json
          options_bn?: Json
          options_ur?: Json
          points?: number
          question: string
          question_bn?: string | null
          question_ur?: string | null
          sort_order?: number
        }
        Update: {
          correct_answer?: number
          created_at?: string
          id?: string
          lesson_id?: string
          options?: Json
          options_bn?: Json
          options_ur?: Json
          points?: number
          question?: string
          question_bn?: string | null
          question_ur?: string | null
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "quiz_questions_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      student_basic_profiles: {
        Row: {
          age: number | null
          avatar_url: string | null
          city: string | null
          country: string | null
          created_at: string
          full_name: string | null
          gender: string | null
          language: string
          updated_at: string
          user_id: string
        }
        Insert: {
          age?: number | null
          avatar_url?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          full_name?: string | null
          gender?: string | null
          language?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          age?: number | null
          avatar_url?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          full_name?: string | null
          gender?: string | null
          language?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      student_feedback: {
        Row: {
          created_at: string
          id: string
          lesson_id: string | null
          message: string | null
          rating: number | null
          reviewed: boolean
          student_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          lesson_id?: string | null
          message?: string | null
          rating?: number | null
          reviewed?: boolean
          student_id: string
        }
        Update: {
          created_at?: string
          id?: string
          lesson_id?: string | null
          message?: string | null
          rating?: number | null
          reviewed?: boolean
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_feedback_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      student_questions: {
        Row: {
          answer: string | null
          answered_at: string | null
          answered_by: string | null
          created_at: string
          id: string
          lesson_id: string | null
          question: string
          status: string
          student_id: string
          updated_at: string
        }
        Insert: {
          answer?: string | null
          answered_at?: string | null
          answered_by?: string | null
          created_at?: string
          id?: string
          lesson_id?: string | null
          question: string
          status?: string
          student_id: string
          updated_at?: string
        }
        Update: {
          answer?: string | null
          answered_at?: string | null
          answered_by?: string | null
          created_at?: string
          id?: string
          lesson_id?: string | null
          question?: string
          status?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_questions_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      student_reports: {
        Row: {
          created_at: string
          details: string | null
          escalated: boolean
          handled_by: string | null
          id: string
          severity: string
          status: string
          student_id: string
          subject: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          details?: string | null
          escalated?: boolean
          handled_by?: string | null
          id?: string
          severity?: string
          status?: string
          student_id: string
          subject: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          details?: string | null
          escalated?: boolean
          handled_by?: string | null
          id?: string
          severity?: string
          status?: string
          student_id?: string
          subject?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_points: {
        Row: {
          created_at: string
          id: string
          points: number
          reason: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          points?: number
          reason?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          points?: number
          reason?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_progress: {
        Row: {
          completed: boolean
          completed_at: string | null
          id: string
          lesson_id: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          id?: string
          lesson_id: string
          user_id: string
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          id?: string
          lesson_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          is_active: boolean
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          is_active?: boolean
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          is_active?: boolean
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      video_completions: {
        Row: {
          completed_at: string
          content_id: string
          id: string
          user_id: string
        }
        Insert: {
          completed_at?: string
          content_id: string
          id?: string
          user_id: string
        }
        Update: {
          completed_at?: string
          content_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_completions_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "lesson_content"
            referencedColumns: ["id"]
          },
        ]
      }
      volunteer_assignments: {
        Row: {
          assigned_by: string | null
          created_at: string
          id: string
          student_id: string
          volunteer_id: string
        }
        Insert: {
          assigned_by?: string | null
          created_at?: string
          id?: string
          student_id: string
          volunteer_id: string
        }
        Update: {
          assigned_by?: string | null
          created_at?: string
          id?: string
          student_id?: string
          volunteer_id?: string
        }
        Relationships: []
      }
      volunteer_reports: {
        Row: {
          behaviour: string | null
          created_at: string
          has_problem: boolean
          id: string
          notes: string | null
          present: boolean
          problem: string | null
          progress: string | null
          rating: number
          report_date: string
          student_id: string
          updated_at: string
          volunteer_id: string
        }
        Insert: {
          behaviour?: string | null
          created_at?: string
          has_problem?: boolean
          id?: string
          notes?: string | null
          present?: boolean
          problem?: string | null
          progress?: string | null
          rating?: number
          report_date?: string
          student_id: string
          updated_at?: string
          volunteer_id: string
        }
        Update: {
          behaviour?: string | null
          created_at?: string
          has_problem?: boolean
          id?: string
          notes?: string | null
          present?: boolean
          problem?: string | null
          progress?: string | null
          rating?: number
          report_date?: string
          student_id?: string
          updated_at?: string
          volunteer_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_admin_dashboard_summary: {
        Args: never
        Returns: {
          completions_count: number
          student_count: number
          total_accounts: number
          total_points: number
        }[]
      }
      get_message_contacts: {
        Args: never
        Returns: {
          full_name: string
          role: string
          user_id: string
        }[]
      }
      get_student_dashboard_summary: {
        Args: { _user_id: string }
        Returns: {
          completed_count: number
          gift_count: number
          total_points: number
        }[]
      }
      get_volunteer_dashboard_summary: {
        Args: { _volunteer_id: string }
        Returns: {
          inactive_students: number
          new_feedback: number
          open_questions: number
          open_reports: number
          student_count: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "student" | "employee" | "volunteer" | "manager"
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
      app_role: ["admin", "student", "employee", "volunteer", "manager"],
    },
  },
} as const
