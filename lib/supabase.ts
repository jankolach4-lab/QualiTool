import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://whigasnqcvjkilkmbfld.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndoaWdhc25xY3Zqa2lsa21iZmxkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQyNDE1OTIsImV4cCI6MjA2OTgxNzU5Mn0.tfUnIP_oWy3N9UM6Ws9mPiKqsGtj8_kIOMW42E298rc'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false
  }
})

// Types
export interface UserContact {
  user_id: string;
  contacts: ContactItem[];
  created_at: string;
  updated_at: string;
}

export interface ContactItem {
  ort: string;
  we: number;
  residents?: { [key: string]: { status?: string } };
}

export interface UserDirectory {
  user_id: string;
  email: string;
  display_name: string;
}

export interface ProjectData {
  name: string;
  totalWE: number;
  vps: Set<string>;
  completions: number;
  statusCounts: { [status: string]: number };
  dailyStats: { [date: string]: { completions: number; statusChanges: number } };
  hourlyStats: { [hour: number]: number };
  totalStatusChanges: number;
  weWithStatus: number;
}

export interface VPData {
  id: string;
  name: string;
  email: string;
  totalWE: number;
  completions: number;
  totalChanges: number;
  statusCounts: { [status: string]: number };
  dailyStats: { [date: string]: { completions: number; statusChanges: number } };
  hourlyStats: { [hour: number]: number };
  projects: Set<string>;
  totalStatusChanges: number;
  weWithStatus: number;
}