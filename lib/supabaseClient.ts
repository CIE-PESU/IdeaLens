import { createClient } from "@supabase/supabase-js";

const isBrowser = typeof window !== "undefined";
const isProd = isBrowser && !window.location.hostname.includes("localhost");

// In production, we use the local /supabase proxy to bypass CORS
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (typeof window !== "undefined") {
  console.log("Supabase Client Initializing...");
  console.log("URL Format Check:", supabaseUrl?.startsWith("https://") ? "Valid" : "Invalid");
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Supabase Credentials MISSING! Check your .env.local file and RESTART npm run dev.");
  }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
