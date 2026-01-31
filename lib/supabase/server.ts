import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
    const cookieStore = await cookies()

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    // Allow build to pass even if env vars are missing (for now), but throw runtime error
    if (!supabaseUrl || !supabaseKey) {
        // Just return a dummy client or undefined if you want to handle it gracefully in caller
        // But throwing specific error helps debugging
        // We will keep the check:
        // Note: checking for placeholders is good
    }

    if (!supabaseUrl || supabaseUrl.includes('[YOUR-PROJECT-ID]')) {
        throw new Error('Supabase URL is missing or contains placeholder. Update .env with your actual Supabase URL.')
    }
    if (!supabaseKey || supabaseKey.includes('[YOUR-ANON-KEY]')) {
        throw new Error('Supabase Anon Key is missing or contains placeholder. Update .env with your actual Anon Key.')
    }

    return createServerClient(
        supabaseUrl,
        supabaseKey,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll()
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        )
                    } catch {
                        // The `setAll` method was called from a Server Component.
                        // This can be ignored if you have middleware refreshing
                        // user sessions.
                    }
                },
            },
        }
    )
}
