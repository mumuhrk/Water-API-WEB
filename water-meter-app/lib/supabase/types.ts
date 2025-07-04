export interface Database {
  public: {
    Tables: {
      buildings: {
        Row: {
          id: string
          name: string
          user_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          user_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          user_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      rooms: {
        Row: {
          id: string
          name: string
          building_id: string
          user_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          building_id: string
          user_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          building_id?: string
          user_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      meter_readings: {
        Row: {
          id: string
          user_id: string
          building_id: string
          room_id: string
          image_url: string
          meter_value: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          building_id: string
          room_id: string
          image_url: string
          meter_value: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          building_id?: string
          room_id?: string
          image_url?: string
          meter_value?: number
          created_at?: string
        }
      }
      user_profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}
