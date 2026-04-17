import { createClient as createSupabaseClient } from "@supabase/supabase-js";

const rawUrl = (
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) || 
  (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_URL) ||
  (typeof import.meta !== 'undefined' && import.meta.env?.NEXT_PUBLIC_SUPABASE_URL) || 
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_SUPABASE_URL) ||
  ''
).trim();

const supabaseKey = (
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) || 
  (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_ANON_KEY) ||
  (typeof import.meta !== 'undefined' && import.meta.env?.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY) || 
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY) ||
  ''
).trim();

// Clean and validate URL
let supabaseUrl = rawUrl;
if (supabaseUrl) {
  // Remove any trailing slashes or spaces
  supabaseUrl = supabaseUrl.replace(/\/+$/, '').trim();
  
  // Ensure URL has https:// prefix if it's a supabase.co domain
  if (!supabaseUrl.startsWith('http')) {
    supabaseUrl = `https://${supabaseUrl}`;
  }
}

export const createClient = () => {
  if (!supabaseUrl || !supabaseKey) {
    return null;
  }
  
  // Basic sanity check for Key vs URL swap
  if (supabaseUrl.length > 100 && supabaseKey.length < 50) {
    console.error('Possible Supabase Config Swap: URL is very long and Key is very short. Check your Secrets.');
  }

  try {
    return createSupabaseClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      }
    });
  } catch (error) {
    console.error('Error creating Supabase client:', error);
    return null;
  }
};

export const supabase = createClient();
