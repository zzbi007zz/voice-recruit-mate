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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      call_sessions: {
        Row: {
          call_sid: string
          created_at: string
          direction: string | null
          id: string
          interview_id: string
          status: string | null
          twilio_from: string | null
          twilio_to: string | null
          updated_at: string
        }
        Insert: {
          call_sid: string
          created_at?: string
          direction?: string | null
          id?: string
          interview_id: string
          status?: string | null
          twilio_from?: string | null
          twilio_to?: string | null
          updated_at?: string
        }
        Update: {
          call_sid?: string
          created_at?: string
          direction?: string | null
          id?: string
          interview_id?: string
          status?: string | null
          twilio_from?: string | null
          twilio_to?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "call_sessions_interview_id_fkey"
            columns: ["interview_id"]
            isOneToOne: false
            referencedRelation: "interviews"
            referencedColumns: ["id"]
          },
        ]
      }
      candidates: {
        Row: {
          created_at: string
          email: string
          experience: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          position: string | null
          skills: string | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          experience?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          position?: string | null
          skills?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          experience?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          position?: string | null
          skills?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      clients: {
        Row: {
          company: string
          contact_person: string | null
          created_at: string
          email: string
          id: string
          industry: string | null
          location: string | null
          name: string
          notes: string | null
          phone: string | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          company: string
          contact_person?: string | null
          created_at?: string
          email: string
          id?: string
          industry?: string | null
          location?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          company?: string
          contact_person?: string | null
          created_at?: string
          email?: string
          id?: string
          industry?: string | null
          location?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      cv_job_matches: {
        Row: {
          candidate_id: string
          created_at: string
          culture_fit_score: number
          detailed_analysis: Json | null
          experience_match_score: number
          id: string
          job_id: string
          overall_score: number
          salary_match_score: number
          skill_match_score: number
          updated_at: string
        }
        Insert: {
          candidate_id: string
          created_at?: string
          culture_fit_score?: number
          detailed_analysis?: Json | null
          experience_match_score?: number
          id?: string
          job_id: string
          overall_score?: number
          salary_match_score?: number
          skill_match_score?: number
          updated_at?: string
        }
        Update: {
          candidate_id?: string
          created_at?: string
          culture_fit_score?: number
          detailed_analysis?: Json | null
          experience_match_score?: number
          id?: string
          job_id?: string
          overall_score?: number
          salary_match_score?: number
          skill_match_score?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cv_job_matches_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cv_job_matches_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      demo: {
        Row: {
          id: number
          message: string | null
          query: string | null
          request_id: string | null
          session_id: string | null
          user_id: string
        }
        Insert: {
          id?: number
          message?: string | null
          query?: string | null
          request_id?: string | null
          session_id?: string | null
          user_id?: string
        }
        Update: {
          id?: number
          message?: string | null
          query?: string | null
          request_id?: string | null
          session_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      email_logs: {
        Row: {
          content: string
          created_at: string
          id: string
          recipient_email: string
          recipient_id: string | null
          recipient_name: string
          recipient_type: string
          sent_at: string
          status: string
          subject: string
          template_id: string | null
          updated_at: string
          variables: Json | null
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          recipient_email: string
          recipient_id?: string | null
          recipient_name: string
          recipient_type: string
          sent_at?: string
          status?: string
          subject: string
          template_id?: string | null
          updated_at?: string
          variables?: Json | null
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          recipient_email?: string
          recipient_id?: string | null
          recipient_name?: string
          recipient_type?: string
          sent_at?: string
          status?: string
          subject?: string
          template_id?: string | null
          updated_at?: string
          variables?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "email_logs_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          category: string
          content: string
          created_at: string
          id: string
          language: string
          name: string
          subject: string
          updated_at: string
          variables: string[] | null
        }
        Insert: {
          category: string
          content: string
          created_at?: string
          id?: string
          language?: string
          name: string
          subject: string
          updated_at?: string
          variables?: string[] | null
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          id?: string
          language?: string
          name?: string
          subject?: string
          updated_at?: string
          variables?: string[] | null
        }
        Relationships: []
      }
      interviews: {
        Row: {
          candidate_phone: string
          consent: boolean | null
          created_at: string
          ended_at: string | null
          id: string
          language: string
          metadata: Json | null
          recruiter_id: string
          role: string | null
          score_summary: Json | null
          started_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          candidate_phone: string
          consent?: boolean | null
          created_at?: string
          ended_at?: string | null
          id?: string
          language?: string
          metadata?: Json | null
          recruiter_id: string
          role?: string | null
          score_summary?: Json | null
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          candidate_phone?: string
          consent?: boolean | null
          created_at?: string
          ended_at?: string | null
          id?: string
          language?: string
          metadata?: Json | null
          recruiter_id?: string
          role?: string | null
          score_summary?: Json | null
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      job_applications: {
        Row: {
          application_date: string
          candidate_email: string
          candidate_id: string | null
          candidate_name: string
          candidate_phone: string | null
          created_at: string
          final_status: string | null
          id: string
          interview_date: string | null
          interview_feedback: string | null
          job_id: string
          notes: string | null
          salary_offered: string | null
          status: string
          updated_at: string
        }
        Insert: {
          application_date?: string
          candidate_email: string
          candidate_id?: string | null
          candidate_name: string
          candidate_phone?: string | null
          created_at?: string
          final_status?: string | null
          id?: string
          interview_date?: string | null
          interview_feedback?: string | null
          job_id: string
          notes?: string | null
          salary_offered?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          application_date?: string
          candidate_email?: string
          candidate_id?: string | null
          candidate_name?: string
          candidate_phone?: string | null
          created_at?: string
          final_status?: string | null
          id?: string
          interview_date?: string | null
          interview_feedback?: string | null
          job_id?: string
          notes?: string | null
          salary_offered?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_applications_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          client_id: string
          created_at: string
          description: string | null
          id: string
          job_type: string | null
          location: string | null
          priority: string | null
          requirements: string[] | null
          salary_range: string | null
          status: string
          title: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          client_id: string
          created_at?: string
          description?: string | null
          id?: string
          job_type?: string | null
          location?: string | null
          priority?: string | null
          requirements?: string[] | null
          salary_range?: string | null
          status?: string
          title: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          description?: string | null
          id?: string
          job_type?: string | null
          location?: string | null
          priority?: string | null
          requirements?: string[] | null
          salary_range?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jobs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_leads: {
        Row: {
          company_name: string
          contact_person: string
          created_at: string
          email: string
          id: string
          last_contact: string | null
          next_action: string | null
          next_action_date: string | null
          notes: string | null
          phone: string | null
          status: string
          updated_at: string
          value: number | null
        }
        Insert: {
          company_name: string
          contact_person: string
          created_at?: string
          email: string
          id?: string
          last_contact?: string | null
          next_action?: string | null
          next_action_date?: string | null
          notes?: string | null
          phone?: string | null
          status?: string
          updated_at?: string
          value?: number | null
        }
        Update: {
          company_name?: string
          contact_person?: string
          created_at?: string
          email?: string
          id?: string
          last_contact?: string | null
          next_action?: string | null
          next_action_date?: string | null
          notes?: string | null
          phone?: string | null
          status?: string
          updated_at?: string
          value?: number | null
        }
        Relationships: []
      }
      transcripts: {
        Row: {
          audio_segment_id: string | null
          created_at: string
          filler_rate: number | null
          id: string
          interview_id: string
          text: string
          wpm: number | null
        }
        Insert: {
          audio_segment_id?: string | null
          created_at?: string
          filler_rate?: number | null
          id?: string
          interview_id: string
          text: string
          wpm?: number | null
        }
        Update: {
          audio_segment_id?: string | null
          created_at?: string
          filler_rate?: number | null
          id?: string
          interview_id?: string
          text?: string
          wpm?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "transcripts_interview_id_fkey"
            columns: ["interview_id"]
            isOneToOne: false
            referencedRelation: "interviews"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
