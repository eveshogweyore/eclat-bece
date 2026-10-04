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
    PostgrestVersion: "14.5"
  }
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
          admin_id: string | null
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
          admin_id?: string | null
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
          admin_id?: string | null
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
      admin_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          expires_at: string
          full_name: string
          id: string
          invited_by: string | null
          is_super_admin: boolean
          permissions: Json | null
          status: string
          target_email: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          expires_at: string
          full_name: string
          id?: string
          invited_by?: string | null
          is_super_admin?: boolean
          permissions?: Json | null
          status?: string
          target_email: string
          token: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          expires_at?: string
          full_name?: string
          id?: string
          invited_by?: string | null
          is_super_admin?: boolean
          permissions?: Json | null
          status?: string
          target_email?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_invitations_invited_by_fkey"
            columns: ["invited_by"]
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
      arena_challenges: {
        Row: {
          challenge_name: string
          challenger_ep: number | null
          challenger_id: string
          challenger_score: number | null
          challenger_time_taken: number | null
          completed_at: string | null
          created_at: string
          id: string
          max_time_seconds: number
          opponent_ep: number | null
          opponent_id: string
          opponent_score: number | null
          opponent_time_taken: number | null
          question_ids: string[]
          status: string
          subject: string
          topic: string | null
          winner_id: string | null
        }
        Insert: {
          challenge_name?: string
          challenger_ep?: number | null
          challenger_id: string
          challenger_score?: number | null
          challenger_time_taken?: number | null
          completed_at?: string | null
          created_at?: string
          id?: string
          max_time_seconds?: number
          opponent_ep?: number | null
          opponent_id: string
          opponent_score?: number | null
          opponent_time_taken?: number | null
          question_ids?: string[]
          status?: string
          subject: string
          topic?: string | null
          winner_id?: string | null
        }
        Update: {
          challenge_name?: string
          challenger_ep?: number | null
          challenger_id?: string
          challenger_score?: number | null
          challenger_time_taken?: number | null
          completed_at?: string | null
          created_at?: string
          id?: string
          max_time_seconds?: number
          opponent_ep?: number | null
          opponent_id?: string
          opponent_score?: number | null
          opponent_time_taken?: number | null
          question_ids?: string[]
          status?: string
          subject?: string
          topic?: string | null
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "arena_challenges_challenger_id_fkey"
            columns: ["challenger_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "arena_challenges_opponent_id_fkey"
            columns: ["opponent_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "arena_challenges_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "students"
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
      comprehension_passages_year6: {
        Row: {
          created_at: string | null
          id: string
          passage_text: string
          subject: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          passage_text: string
          subject?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          passage_text?: string
          subject?: string | null
          title?: string | null
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
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          passage_text: string
          subject?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          passage_text?: string
          subject?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      duplicate_question_ignore_pairs: {
        Row: {
          class_year: string
          created_at: string
          id: string
          ignored_by: string | null
          question_id_1: string
          question_id_2: string
        }
        Insert: {
          class_year: string
          created_at?: string
          id?: string
          ignored_by?: string | null
          question_id_1: string
          question_id_2: string
        }
        Update: {
          class_year?: string
          created_at?: string
          id?: string
          ignored_by?: string | null
          question_id_1?: string
          question_id_2?: string
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
          status: string
          student_id: string
          subject: string
          topic: string | null
          uploaded_by: string | null
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
          status?: string
          student_id: string
          subject: string
          topic?: string | null
          uploaded_by?: string | null
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
          status?: string
          student_id?: string
          subject?: string
          topic?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "flagged_questions_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flagged_questions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      league_cohort_members: {
        Row: {
          cohort_id: string
          id: string
          joined_at: string
          student_id: string
          weekly_points: number
        }
        Insert: {
          cohort_id: string
          id?: string
          joined_at?: string
          student_id: string
          weekly_points?: number
        }
        Update: {
          cohort_id?: string
          id?: string
          joined_at?: string
          student_id?: string
          weekly_points?: number
        }
        Relationships: [
          {
            foreignKeyName: "league_cohort_members_cohort_id_fkey"
            columns: ["cohort_id"]
            isOneToOne: false
            referencedRelation: "league_cohorts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "league_cohort_members_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      league_cohorts: {
        Row: {
          cohort_number: number
          created_at: string
          id: string
          is_evaluated: boolean
          league_tier: number
          week_start_date: string
        }
        Insert: {
          cohort_number?: number
          created_at?: string
          id?: string
          is_evaluated?: boolean
          league_tier: number
          week_start_date: string
        }
        Update: {
          cohort_number?: number
          created_at?: string
          id?: string
          is_evaluated?: boolean
          league_tier?: number
          week_start_date?: string
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
      parent_weekly_digests: {
        Row: {
          created_at: string
          headline: string
          id: string
          is_read: boolean
          metrics: Json
          narrative: string
          parent_id: string
          student_id: string
          week_end_date: string
          week_start_date: string
        }
        Insert: {
          created_at?: string
          headline: string
          id?: string
          is_read?: boolean
          metrics?: Json
          narrative: string
          parent_id: string
          student_id: string
          week_end_date: string
          week_start_date: string
        }
        Update: {
          created_at?: string
          headline?: string
          id?: string
          is_read?: boolean
          metrics?: Json
          narrative?: string
          parent_id?: string
          student_id?: string
          week_end_date?: string
          week_start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "parent_weekly_digests_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "parents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parent_weekly_digests_student_id_fkey"
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
      practice_assignments: {
        Row: {
          completed_at: string | null
          created_at: string
          duration: number
          id: string
          num_questions: number
          parent_id: string | null
          questions_snapshot: Json | null
          school_id: string | null
          score: number | null
          status: string
          student_id: string
          subject: string
          topics: string[]
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          duration: number
          id?: string
          num_questions: number
          parent_id?: string | null
          questions_snapshot?: Json | null
          school_id?: string | null
          score?: number | null
          status?: string
          student_id: string
          subject: string
          topics: string[]
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          duration?: number
          id?: string
          num_questions?: number
          parent_id?: string | null
          questions_snapshot?: Json | null
          school_id?: string | null
          score?: number | null
          status?: string
          student_id?: string
          subject?: string
          topics?: string[]
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
            foreignKeyName: "practice_assignments_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
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
          updated_at: string
          username: string | null
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
          updated_at?: string
          username?: string | null
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
          updated_at?: string
          username?: string | null
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
          uploaded_by: string | null
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
          uploaded_by?: string | null
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
          uploaded_by?: string | null
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
          uploaded_by: string | null
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
          uploaded_by?: string | null
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
          uploaded_by?: string | null
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
      quiz_session_answers: {
        Row: {
          created_at: string
          graded: boolean
          id: string
          is_correct: boolean
          question_id: string
          selected_index: number | null
          session_id: string
          time_spent_ms: number
        }
        Insert: {
          created_at?: string
          graded?: boolean
          id?: string
          is_correct?: boolean
          question_id: string
          selected_index?: number | null
          session_id: string
          time_spent_ms?: number
        }
        Update: {
          created_at?: string
          graded?: boolean
          id?: string
          is_correct?: boolean
          question_id?: string
          selected_index?: number | null
          session_id?: string
          time_spent_ms?: number
        }
        Relationships: [
          {
            foreignKeyName: "quiz_session_answers_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "quiz_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_sessions: {
        Row: {
          arena_challenge_id: string | null
          assignment_id: string | null
          completed_at: string | null
          id: string
          mode: string
          question_ids: string[]
          started_at: string
          status: string
          student_id: string
          subject: string | null
          topic: string | null
        }
        Insert: {
          arena_challenge_id?: string | null
          assignment_id?: string | null
          completed_at?: string | null
          id?: string
          mode?: string
          question_ids?: string[]
          started_at?: string
          status?: string
          student_id: string
          subject?: string | null
          topic?: string | null
        }
        Update: {
          arena_challenge_id?: string | null
          assignment_id?: string | null
          completed_at?: string | null
          id?: string
          mode?: string
          question_ids?: string[]
          started_at?: string
          status?: string
          student_id?: string
          subject?: string | null
          topic?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_sessions_arena_challenge_id_fkey"
            columns: ["arena_challenge_id"]
            isOneToOne: false
            referencedRelation: "arena_challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_sessions_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "practice_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_sessions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      school_classes: {
        Row: {
          class_year: string | null
          created_at: string
          id: string
          lead_teacher: string | null
          level: string
          name: string
          school_id: string
          updated_at: string
        }
        Insert: {
          class_year?: string | null
          created_at?: string
          id?: string
          lead_teacher?: string | null
          level: string
          name: string
          school_id: string
          updated_at?: string
        }
        Update: {
          class_year?: string | null
          created_at?: string
          id?: string
          lead_teacher?: string | null
          level?: string
          name?: string
          school_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_classes_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      school_exams: {
        Row: {
          class_id: string | null
          cohort: string
          created_at: string
          duration_minutes: number
          exam_date: string
          id: string
          instructions: string | null
          passing_score: number
          question_count: number
          school_id: string
          start_time: string | null
          status: string
          subject: string
          title: string
          updated_at: string
        }
        Insert: {
          class_id?: string | null
          cohort: string
          created_at?: string
          duration_minutes?: number
          exam_date: string
          id?: string
          instructions?: string | null
          passing_score?: number
          question_count?: number
          school_id: string
          start_time?: string | null
          status?: string
          subject: string
          title: string
          updated_at?: string
        }
        Update: {
          class_id?: string | null
          cohort?: string
          created_at?: string
          duration_minutes?: number
          exam_date?: string
          id?: string
          instructions?: string | null
          passing_score?: number
          question_count?: number
          school_id?: string
          start_time?: string | null
          status?: string
          subject?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_exams_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "school_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_exams_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      school_teachers: {
        Row: {
          assigned_class_ids: string[] | null
          created_at: string
          department: string | null
          email: string | null
          full_name: string
          id: string
          phone: string | null
          primary_subject: string | null
          school_id: string
          status: string
          updated_at: string
        }
        Insert: {
          assigned_class_ids?: string[] | null
          created_at?: string
          department?: string | null
          email?: string | null
          full_name: string
          id?: string
          phone?: string | null
          primary_subject?: string | null
          school_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          assigned_class_ids?: string[] | null
          created_at?: string
          department?: string | null
          email?: string | null
          full_name?: string
          id?: string
          phone?: string | null
          primary_subject?: string | null
          school_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_teachers_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      schools: {
        Row: {
          address: string | null
          contact_email: string | null
          created_at: string
          id: string
          school_code: string
          school_name: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          contact_email?: string | null
          created_at?: string
          id?: string
          school_code?: string
          school_name?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          contact_email?: string | null
          created_at?: string
          id?: string
          school_code?: string
          school_name?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      student_badges: {
        Row: {
          badge_id: string
          id: string
          metadata: Json | null
          student_id: string
          tier: number
          unlocked_at: string
        }
        Insert: {
          badge_id: string
          id?: string
          metadata?: Json | null
          student_id: string
          tier?: number
          unlocked_at?: string
        }
        Update: {
          badge_id?: string
          id?: string
          metadata?: Json | null
          student_id?: string
          tier?: number
          unlocked_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_badges_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_certificates: {
        Row: {
          certificate_type: string
          description: string
          id: string
          issued_at: string
          metadata: Json | null
          student_id: string
          title: string
          verification_code: string
        }
        Insert: {
          certificate_type: string
          description: string
          id?: string
          issued_at?: string
          metadata?: Json | null
          student_id: string
          title: string
          verification_code: string
        }
        Update: {
          certificate_type?: string
          description?: string
          id?: string
          issued_at?: string
          metadata?: Json | null
          student_id?: string
          title?: string
          verification_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_certificates_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_gamification_profile: {
        Row: {
          current_league_tier: number
          current_level: number
          last_daily_challenge_date: string | null
          last_qualifying_date: string | null
          lifetime_ep: number
          longest_streak: number
          monthly_ep: number
          pinned_badge_ids: string[]
          streak_count: number
          streak_shields: number
          student_id: string
          updated_at: string
          weekly_ep: number
        }
        Insert: {
          current_league_tier?: number
          current_level?: number
          last_daily_challenge_date?: string | null
          last_qualifying_date?: string | null
          lifetime_ep?: number
          longest_streak?: number
          monthly_ep?: number
          pinned_badge_ids?: string[]
          streak_count?: number
          streak_shields?: number
          student_id: string
          updated_at?: string
          weekly_ep?: number
        }
        Update: {
          current_league_tier?: number
          current_level?: number
          last_daily_challenge_date?: string | null
          last_qualifying_date?: string | null
          lifetime_ep?: number
          longest_streak?: number
          monthly_ep?: number
          pinned_badge_ids?: string[]
          streak_count?: number
          streak_shields?: number
          student_id?: string
          updated_at?: string
          weekly_ep?: number
        }
        Relationships: [
          {
            foreignKeyName: "student_gamification_profile_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: true
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_points_ledger: {
        Row: {
          amount: number
          created_at: string
          id: string
          metadata: Json | null
          reference_id: string | null
          source_type: string
          student_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          metadata?: Json | null
          reference_id?: string | null
          source_type: string
          student_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          metadata?: Json | null
          reference_id?: string | null
          source_type?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_points_ledger_student_id_fkey"
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
      student_topic_mastery: {
        Row: {
          id: string
          last_assessed_at: string
          rolling_accuracy: number
          rolling_answers: boolean[]
          status: string
          student_id: string
          subject: string
          topic: string
          total_attempted: number
        }
        Insert: {
          id?: string
          last_assessed_at?: string
          rolling_accuracy?: number
          rolling_answers?: boolean[]
          status?: string
          student_id: string
          subject: string
          topic: string
          total_attempted?: number
        }
        Update: {
          id?: string
          last_assessed_at?: string
          rolling_accuracy?: number
          rolling_answers?: boolean[]
          status?: string
          student_id?: string
          subject?: string
          topic?: string
          total_attempted?: number
        }
        Relationships: [
          {
            foreignKeyName: "student_topic_mastery_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          class_id: string | null
          class_year: Database["public"]["Enums"]["class_year"] | null
          created_at: string
          date_of_birth: string | null
          id: string
          is_premium: boolean | null
          onboarding_completed: boolean | null
          parent_id: string | null
          school_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          class_id?: string | null
          class_year?: Database["public"]["Enums"]["class_year"] | null
          created_at?: string
          date_of_birth?: string | null
          id?: string
          is_premium?: boolean | null
          onboarding_completed?: boolean | null
          parent_id?: string | null
          school_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          class_id?: string | null
          class_year?: Database["public"]["Enums"]["class_year"] | null
          created_at?: string
          date_of_birth?: string | null
          id?: string
          is_premium?: boolean | null
          onboarding_completed?: boolean | null
          parent_id?: string | null
          school_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "students_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "school_classes"
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
          {
            foreignKeyName: "students_user_id_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          available_year_6: boolean
          available_year_9: boolean
          category: string
          code: string
          created_at: string
          created_by: string | null
          description: string | null
          display_order: number
          icon: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          available_year_6?: boolean
          available_year_9?: boolean
          category?: string
          code: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number
          icon?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          available_year_6?: boolean
          available_year_9?: boolean
          category?: string
          code?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number
          icon?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
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
      topic_question_counts_year6: {
        Row: {
          questions_count: number | null
          subject: string | null
          topic: string | null
        }
        Relationships: []
      }
      topic_question_counts_year9: {
        Row: {
          questions_count: number | null
          subject: string | null
          topic: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      abandon_quiz_session: {
        Args: { p_session_id: string }
        Returns: undefined
      }
      assign_student_to_weekly_cohort: {
        Args: { p_student_id: string }
        Returns: string
      }
      auto_merge_all_exact_duplicates: {
        Args: { p_class_year: string }
        Returns: Json
      }
      calculate_level_from_ep: {
        Args: { p_lifetime_ep: number }
        Returns: number
      }
      count_duplicate_question_clusters: {
        Args: { p_class_year: string }
        Returns: number
      }
      create_admin_from_invitation: {
        Args: { _password: string; _token: string }
        Returns: Json
      }
      create_arena_challenge: {
        Args: {
          p_challenge_name: string
          p_challenger_id: string
          p_max_time_seconds: number
          p_opponent_id: string
          p_question_ids: string[]
          p_subject: string
          p_topic: string
        }
        Returns: string
      }
      delete_subject_safe: {
        Args: { p_force_archive_if_populated?: boolean; p_subject_id: string }
        Returns: Json
      }
      expire_old_invitations: { Args: never; Returns: number }
      finalize_admin_creation: {
        Args: { _invitation_id: string; _user_id: string }
        Returns: Json
      }
      find_duplicate_question_clusters: {
        Args: {
          p_class_year: string
          p_match_type?: string
          p_subject?: string
          p_threshold?: number
        }
        Returns: Json
      }
      generate_invitation_token: { Args: never; Returns: string }
      generate_unique_id: { Args: never; Returns: string }
      get_admin_display_names: {
        Args: { p_user_ids: string[] }
        Returns: {
          full_name: string
          user_id: string
        }[]
      }
      get_admin_id: { Args: { _user_id: string }; Returns: string }
      get_admin_subjects_with_counts: {
        Args: never
        Returns: {
          available_year_6: boolean
          available_year_9: boolean
          category: string
          code: string
          created_at: string
          description: string
          display_order: number
          icon: string
          id: string
          is_active: boolean
          name: string
          total_count: number
          updated_at: string
          year_6_count: number
          year_9_count: number
        }[]
      }
      get_invitation_details: { Args: { _token: string }; Returns: Json }
      get_platform_student_rank: {
        Args: never
        Returns: {
          points_rank: number
          points_total: number
          score_rank: number
          score_total: number
        }[]
      }
      get_public_leaderboard: { Args: never; Returns: Json }
      get_required_ep_for_level: { Args: { p_level: number }; Returns: number }
      get_student_league_cohort: {
        Args: { p_student_id: string }
        Returns: Json
      }
      get_user_unique_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      ignore_duplicate_cluster: {
        Args: { p_class_year: string; p_question_ids: string[] }
        Returns: Json
      }
      ignore_duplicate_question_pair: {
        Args: {
          p_class_year: string
          p_question_id_1: string
          p_question_id_2: string
        }
        Returns: Json
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
      log_admin_action: {
        Args: {
          _action: string
          _admin_id: string
          _details: Json
          _resource_id: string
          _resource_type: string
        }
        Returns: undefined
      }
      log_admin_action_impl: {
        Args: {
          _action?: string
          _admin_id?: string
          _details?: Json
          _resource_id?: string
          _resource_type?: string
        }
        Returns: string
      }
      lookup_parent_by_code: {
        Args: { p_code: string }
        Returns: {
          full_name: string
          parent_id: string
        }[]
      }
      lookup_school_by_code: {
        Args: { _school_code: string }
        Returns: {
          id: string
          school_name: string
        }[]
      }
      lookup_student_by_code: {
        Args: { p_query: string }
        Returns: {
          class_year: string
          full_name: string
          parent_id: string
          student_id: string
          unique_id: string
          user_id: string
          username: string
        }[]
      }
      reconcile_student_points_ledger: { Args: never; Returns: Json }
      rename_subject_cascade: {
        Args: { p_new_name: string; p_subject_id: string }
        Returns: Json
      }
      reset_weekly_league_cohorts: { Args: never; Returns: Json }
      resolve_duplicate_questions: {
        Args: {
          p_action?: string
          p_canonical_id: string
          p_class_year: string
          p_duplicate_ids: string[]
        }
        Returns: Json
      }
      search_duel_opponents: {
        Args: { p_limit?: number; p_query?: string }
        Returns: {
          class_year: string
          full_name: string
          id: string
          school_name: string
          username: string
        }[]
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      start_quiz_session: {
        Args: {
          p_arena_challenge_id?: string
          p_assignment_id?: string
          p_mode: string
          p_question_ids: string[]
          p_subject?: string
          p_topic?: string
        }
        Returns: Json
      }
      submit_duel_turn:
        | {
            Args: {
              p_challenge_id: string
              p_score: number
              p_time_taken_seconds: number
            }
            Returns: Json
          }
        | {
            Args: { p_challenge_id: string; p_session_id: string }
            Returns: Json
          }
      submit_quiz_answer: {
        Args: {
          p_question_id: string
          p_selected_index: number
          p_session_id: string
          p_time_spent_ms?: number
        }
        Returns: Json
      }
      update_pinned_badges: {
        Args: { p_badge_ids: string[] }
        Returns: undefined
      }
      update_student_cohort_points: {
        Args: { p_additional_ep: number; p_student_id: string }
        Returns: undefined
      }
      update_student_streak: {
        Args: { p_student_id: string }
        Returns: undefined
      }
      update_student_streak_impl: {
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
