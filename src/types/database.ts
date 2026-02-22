export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          created_at: string
          display_name: string | null
          email: string | null
          avatar_url: string | null
        }
        Insert: {
          id: string
          created_at?: string
          display_name?: string | null
          email?: string | null
          avatar_url?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          display_name?: string | null
          email?: string | null
          avatar_url?: string | null
        }
        Relationships: []
      }
      concerts: {
        Row: {
          id: string
          title: string
          artist: string
          location: string
          date: string
          ticket_url: string | null
          source_url: string | null
          created_by: string
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          artist: string
          location: string
          date: string
          ticket_url?: string | null
          source_url?: string | null
          created_by: string
          created_at?: string
        }
        Update: {
          id?: string
          title?: string
          artist?: string
          location?: string
          date?: string
          ticket_url?: string | null
          source_url?: string | null
          created_by?: string
          created_at?: string
        }
        Relationships: []
      }
      user_concerts: {
        Row: {
          id: string
          user_id: string
          concert_id: string
          status: 'going' | 'interested'
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          concert_id: string
          status: 'going' | 'interested'
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          concert_id?: string
          status?: 'going' | 'interested'
          created_at?: string
        }
        Relationships: []
      }
      friendships: {
        Row: {
          id: string
          user_id: string
          friend_id: string
          status: 'pending' | 'accepted' | 'declined'
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          friend_id: string
          status?: 'pending' | 'accepted' | 'declined'
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          friend_id?: string
          status?: 'pending' | 'accepted' | 'declined'
          created_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: string
          payload: Json
          is_read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: string
          payload?: Json
          is_read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: string
          payload?: Json
          is_read?: boolean
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
