import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

// Supabase publishable keys are designed for use in client apps.
// Database access is protected by the Row Level Security policies.
const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL || "https://hqenlsanvqpgjviygprm.supabase.co";
const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  "sb_publishable_gf74M0YgqUV97aoKyu3GMw_Y8uwF_OC";

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false
  }
});
