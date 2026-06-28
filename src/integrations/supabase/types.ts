export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      admin_audit_log: {
        Row: {
          action: string
          admin_id: string
          created_at: string
          details: Json | null
          id: string
          ip_address: unknown
          resource_id: string | null
          resource_type: string
          user_agent: string | null
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: unknown
          resource_id?: string | null
          resource_type: string
          user_agent?: string | null
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: unknown
          resource_id?: string | null
          resource_type?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_audit_log_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "admins"
            referencedColumns: ["id"]
          },
        ]
      }
      admins: {
        Row: {
          created_at: string
          created_by: string | null
          full_name: string
          id: string
          is_active: boolean
          is_super_admin: boolean
          permissions: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          full_name: string
          id?: string
          is_active?: boolean
          is_super_admin?: boolean
          permissions?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          full_name?: string
          id?: string
          is_active?: boolean
          is_super_admin?: boolean
          permissions?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admins_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admins"
            referencedColumns: ["id"]
          },
        ]
      }
      competitions: {
        Row: {
          class_year: string
          created_at: string
          created_by: string | null
          description: string | null
          end_date: string
          id: string
          start_date: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          class_year?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date: string
          id?: string
          start_date: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          class_year?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string
          id?: string
          start_date?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "competitions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admins"
            referencedColumns: ["id"]
          },
        ]
      }
      flagged_questions: {
        Row: {
          class_year: string
          created_at: string | null
          details: string | null
          id: string
          question_id: string
          question_text: string
          reason: string
          resolved_at: string | null
          resolved_by: string | null
          status: string | null
          student_id: string
          subject: string
          topic: string | null
        }
        Insert: {
          class_year: string
          created_at?: string | null
          details?: string | null
          id?: string
          question_id: string
          question_text: string
          reason: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string | null
          student_id: string
          subject: string
          topic?: string | null
        }
        Update: {
          class_year?: string
          created_at?: string | null
          details?: string | null
          id?: string
          question_id?: string
          question_text?: string
          reason?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string | null
          student_id?: string
          subject?: string
          topic?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "flagged_questions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flagged_questions_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      comprehension_passages_year6: {
        Row: {
          created_at: string | null
          id: string
          passage_text: string
          subject: string | null
          title: string | null
          topic: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          passage_text: string
          subject?: string | null
          title?: string | null
          topic?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          passage_text?: string
          subject?: string | null
          title?: string | null
          topic?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      comprehension_passages_year9: {
        Row: {
          created_at: string | null
          id: string
          passage_text: string
          subject: string | null
          title: string | null
          topic: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          passage_text: string
          subject?: string | null
          title?: string | null
          topic?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          passage_text?: string
          subject?: string | null
          title?: string | null
          topic?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      email_verification_codes: {
        Row: {
          code: string
          created_at: string
          expires_at: string
          failed_attempts: number | null
          id: string
          user_id: string
          verified: boolean | null
        }
        Insert: {
          code: string
          created_at?: string
          expires_at: string
          failed_attempts?: number | null
          id?: string
          user_id: string
          verified?: boolean | null
        }
        Update: {
          code?: string
          created_at?: string
          expires_at?: string
          failed_attempts?: number | null
          id?: string
          user_id?: string
          verified?: boolean | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          metadata: Json | null
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          metadata?: Json | null
          read?: boolean
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          metadata?: Json | null
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      parent_child_link_requests: {
        Row: {
          created_at: string
          id: string
          parent_id: string
          status: string
          student_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          parent_id: string
          status?: string
          student_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          parent_id?: string
          status?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "parent_child_link_requests_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "parents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parent_child_link_requests_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      practice_assignments: {
        Row: {
          completed_at: string | null
          created_at: string
          duration: number
          id: string
          num_questions: number
          parent_id: string
          score: number | null
          status: string
          student_id: string
          subject: string
          topics: string[]
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          duration: number
          id?: string
          num_questions: number
          parent_id: string
          score?: number | null
          status?: string
          student_id: string
          subject: string
          topics?: string[]
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          duration?: number
          id?: string
          num_questions?: number
          parent_id?: string
          score?: number | null
          status?: string
          student_id?: string
          subject?: string
          topics?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "practice_assignments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "parents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "practice_assignments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      parents: {
        Row: {
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          email: string
          email_verified: boolean | null
          full_name: string | null
          id: string
          unique_id: string
          username: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email: string
          email_verified?: boolean | null
          full_name?: string | null
          id: string
          unique_id?: string
          username?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string
          email_verified?: boolean | null
          full_name?: string | null
          id?: string
          unique_id?: string
          username?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      quiz_options_year6: {
        Row: {
          created_at: string | null
          display_order: number | null
          id: string
          image_url: string | null
          is_correct: boolean | null
          option_text: string
          question_id: string
        }
        Insert: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          image_url?: string | null
          is_correct?: boolean | null
          option_text: string
          question_id: string
        }
        Update: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          image_url?: string | null
          is_correct?: boolean | null
          option_text?: string
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_options_year6_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "quiz_questions_year6"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_options_year9: {
        Row: {
          created_at: string | null
          display_order: number | null
          id: string
          image_url: string | null
          is_correct: boolean | null
          option_text: string
          question_id: string
        }
        Insert: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          image_url?: string | null
          is_correct?: boolean | null
          option_text: string
          question_id: string
        }
        Update: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          image_url?: string | null
          is_correct?: boolean | null
          option_text?: string
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_options_year9_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "quiz_questions_year9"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_questions_year6: {
        Row: {
          correct_answer: string
          created_at: string | null
          difficulty: string | null
          explanation: string | null
          id: string
          image_url: string | null
          passage_id: string | null
          question_text: string
          subject: string
          topic: string | null
          updated_at: string | null
        }
        Insert: {
          correct_answer: string
          created_at?: string | null
          difficulty?: string | null
          explanation?: string | null
          id?: string
          image_url?: string | null
          passage_id?: string | null
          question_text: string
          subject: string
          topic?: string | null
          updated_at?: string | null
        }
        Update: {
          correct_answer?: string
          created_at?: string | null
          difficulty?: string | null
          explanation?: string | null
          id?: string
          image_url?: string | null
          passage_id?: string | null
          question_text?: string
          subject?: string
          topic?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_questions_year6_passage_id_fkey"
            columns: ["passage_id"]
            isOneToOne: false
            referencedRelation: "comprehension_passages_year6"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_questions_year9: {
        Row: {
          correct_answer: string
          created_at: string | null
          difficulty: string | null
          explanation: string | null
          id: string
          image_url: string | null
          passage_id: string | null
          question_text: string
          subject: string
          topic: string | null
          updated_at: string | null
        }
        Insert: {
          correct_answer: string
          created_at?: string | null
          difficulty?: string | null
          explanation?: string | null
          id?: string
          image_url?: string | null
          passage_id?: string | null
          question_text: string
          subject: string
          topic?: string | null
          updated_at?: string | null
        }
        Update: {
          correct_answer?: string
          created_at?: string | null
          difficulty?: string | null
          explanation?: string | null
          id?: string
          image_url?: string | null
          passage_id?: string | null
          question_text?: string
          subject?: string
          topic?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_questions_year9_passage_id_fkey"
            columns: ["passage_id"]
            isOneToOne: false
            referencedRelation: "comprehension_passages_year9"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_results: {
        Row: {
          completed_at: string
          correct_answers: number
          created_at: string
          id: string
          score: number
          student_id: string
          subject: string
          total_questions: number
        }
        Insert: {
          completed_at?: string
          correct_answers: number
          created_at?: string
          id?: string
          score: number
          student_id: string
          subject: string
          total_questions: number
        }
        Update: {
          completed_at?: string
          correct_answers?: number
          created_at?: string
          id?: string
          score?: number
          student_id?: string
          subject?: string
          total_questions?: number
        }
        Relationships: [
          {
            foreignKeyName: "quiz_results_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      schools: {
        Row: {
          created_at: string
          id: string
          school_code: string
          school_name: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          school_code?: string
          school_name?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          school_code?: string
          school_name?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          amount: number
          created_at: string
          currency: string
          expires_at: string | null
          id: string
          metadata: Json
          parent_id: string
          plan: string
          started_at: string
          status: string
          student_id: string
          updated_at: string
        }
        Insert: {
          amount?: number
          created_at?: string
          currency?: string
          expires_at?: string | null
          id?: string
          metadata?: Json
          parent_id: string
          plan?: string
          started_at?: string
          status?: string
          student_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          expires_at?: string | null
          id?: string
          metadata?: Json
          parent_id?: string
          plan?: string
          started_at?: string
          status?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "parents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_streaks: {
        Row: {
          created_at: string
          current_streak: number
          id: string
          last_activity_date: string | null
          longest_streak: number
          student_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_streak?: number
          id?: string
          last_activity_date?: string | null
          longest_streak?: number
          student_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_streak?: number
          id?: string
          last_activity_date?: string | null
          longest_streak?: number
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_streaks_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: true
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          class_year: Database["public"]["Enums"]["class_year"] | null
          created_at: string
          date_of_birth: string | null
          id: string
          onboarding_completed: boolean | null
          parent_id: string | null
          school_id: string | null
          is_premium: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          class_year?: Database["public"]["Enums"]["class_year"] | null
          created_at?: string
          date_of_birth?: string | null
          id?: string
          onboarding_completed?: boolean | null
          parent_id?: string | null
          school_id?: string | null
          is_premium?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          class_year?: Database["public"]["Enums"]["class_year"] | null
          created_at?: string
          date_of_birth?: string | null
          id?: string
          onboarding_completed?: boolean | null
          parent_id?: string | null
          school_id?: string | null
          is_premium?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "students_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "parents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          description: string | null
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          description?: string | null
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          description?: string | null
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "system_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "admins"
            referencedColumns: ["id"]
          },
        ]
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_unique_id: { Args: never; Returns: string }
      get_admin_id: { Args: { _user_id: string }; Returns: string }
      get_user_unique_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
      log_admin_action: {
        Args: {
          _action: string
          _admin_id: string
          _details?: Json
          _resource_id?: string
          _resource_type: string
        }
        Returns: string
      }
      lookup_school_by_code: {
        Args: { _school_code: string }
        Returns: {
          id: string
          school_name: string
        }[]
      }
      update_student_streak: {
        Args: { p_student_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "student" | "parent" | "school" | "admin"
      class_year: "year_6" | "year_9"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      app_role: ["student", "parent", "school", "admin"],
      class_year: ["year_6", "year_9"],
    },
  },
} as const
