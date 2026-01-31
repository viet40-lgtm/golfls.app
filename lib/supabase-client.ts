import { createClient } from '@supabase/supabase-js';

// Get Supabase configuration from environment variables
function getSupabaseConfig() {
    // For client-side, we need NEXT_PUBLIC_ prefixed variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
        // Return null config if not set up yet (graceful degradation)
        console.warn('Supabase not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env');
        return null;
    }

    return { supabaseUrl, supabaseAnonKey };
}

// Create a singleton Supabase client for browser use
let supabaseClient: ReturnType<typeof createClient> | null = null;

export function getSupabaseClient() {
    const config = getSupabaseConfig();

    if (!config) {
        // Return a mock client that won't crash but won't work either
        console.warn('Supabase client not available - real-time features disabled');
        return null as any;
    }

    if (typeof window === 'undefined') {
        // Server-side: create a new client each time
        return createClient(config.supabaseUrl, config.supabaseAnonKey);
    }

    // Client-side: use singleton
    if (!supabaseClient) {
        supabaseClient = createClient(config.supabaseUrl, config.supabaseAnonKey);
    }

    return supabaseClient;
}
