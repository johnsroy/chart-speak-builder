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
      datasets: {
        Row: {
          column_schema: Json
          created_at: string
          description: string | null
          file_name: string
          file_size: number
          id: string
          name: string
          row_count: number
          storage_path: string
          storage_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          column_schema: Json
          created_at?: string
          description?: string | null
          file_name: string
          file_size: number
          id?: string
          name: string
          row_count: number
          storage_path: string
          storage_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          column_schema?: Json
          created_at?: string
          description?: string | null
          file_name?: string
          file_size?: number
          id?: string
          name?: string
          row_count?: number
          storage_path?: string
          storage_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      queries: {
        Row: {
          created_at: string
          dataset_id: string
          id: string
          name: string
          query_config: Json
          query_text: string
          query_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          dataset_id: string
          id?: string
          name: string
          query_config: Json
          query_text: string
          query_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          dataset_id?: string
          id?: string
          name?: string
          query_config?: Json
          query_text?: string
          query_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "queries_dataset_id_fkey"
            columns: ["dataset_id"]
            isOneToOne: false
            referencedRelation: "datasets"
            referencedColumns: ["id"]
          },
        ]
      }
      storage_connections: {
        Row: {
          connection_details: Json
          created_at: string
          id: string
          storage_type: string
          user_id: string
        }
        Insert: {
          connection_details: Json
          created_at?: string
          id?: string
          storage_type: string
          user_id: string
        }
        Update: {
          connection_details?: Json
          created_at?: string
          id?: string
          storage_type?: string
          user_id?: string
        }
        Relationships: []
      }
      visualizations: {
        Row: {
          chart_config: Json
          chart_type: string
          created_at: string
          id: string
          name: string
          query_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          chart_config: Json
          chart_type: string
          created_at?: string
          id?: string
          name: string
          query_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          chart_config?: Json
          chart_type?: string
          created_at?: string
          id?: string
          name?: string
          query_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "visualizations_query_id_fkey"
            columns: ["query_id"]
            isOneToOne: false
            referencedRelation: "queries"
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

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
