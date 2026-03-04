import { createClient } from "@supabase/supabase-js";

const isBrowser = typeof window !== "undefined";
const isProd = isBrowser && !window.location.hostname.includes("localhost");

// In production, we use the local /supabase proxy to bypass CORS
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
