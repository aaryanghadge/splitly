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
          name: string
          email: string
          avatar_url: string | null
          created_at: string
        }
        Insert: {
          id: string
          name: string
          email: string
          avatar_url?: string | null
        }
        Update: {
          name?: string
          email?: string
          avatar_url?: string | null
        }
      }
      groups: {
        Row: {
          id: string
          name: string
          emoji: string
          description: string | null
          created_by: string
          created_at: string
          total_spent: number
        }
        Insert: {
          name: string
          emoji: string
          description?: string
          created_by: string
        }
        Update: {
          name?: string
          emoji?: string
          description?: string
        }
      }
      group_members: {
        Row: {
          id: string
          group_id: string
          user_id: string
          joined_at: string
        }
        Insert: {
          group_id: string
          user_id: string
        }
        Update: {
          group_id?: string
          user_id?: string
        }
      }
      expenses: {
        Row: {
          id: string
          group_id: string
          title: string
          amount: number
          paid_by: string
          category: string
          date: string
          created_at: string
        }
        Insert: {
          group_id: string
          title: string
          amount: number
          paid_by: string
          category: string
        }
        Update: {
          title?: string
          amount?: number
          category?: string
        }
      }
      expense_splits: {
        Row: {
          id: string
          expense_id: string
          user_id: string
          share_amount: number
        }
        Insert: {
          expense_id: string
          user_id: string
          share_amount: number
        }
        Update: {
          share_amount?: number
        }
      }
      balances: {
        Row: {
          id: string
          group_id: string
          from_user_id: string
          to_user_id: string
          amount: number
          settled: boolean
        }
        Insert: {
          group_id: string
          from_user_id: string
          to_user_id: string
          amount: number
          settled?: boolean
        }
        Update: {
          amount?: number
          settled?: boolean
        }
      }
    }
    Functions: {
      increment_group_total: {
        Args: {
          group_id: string
          amount: number
        }
        Returns: void
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}
